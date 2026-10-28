import { Chess } from 'chess.js'
import { useEffect, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { encodeGameHash, toSharedGame } from '../core/gameLink'
import { scorePercent, type Edge, type OpeningTree, type Stats } from '../core/tree'
import type { Color, ParsedGame } from '../core/types'
import { MAX_LINES, useEngineEnabled, useEngineLines, usePositionAnalysis } from '../engine/hooks'
import { classifyMove, edgeUci, formatScore, sideToMove, toCp, uciToSan, type Score } from '../engine/score'
import { useT } from '../i18n'
import { EngineToggle, EvalBar, Mark } from './EngineUI'

const moveLabel = (plyIndex: number, san: string) =>
  plyIndex % 2 === 0 ? `${plyIndex / 2 + 1}. ${san}` : `${(plyIndex + 1) / 2}… ${san}`

function StatsBar({ s }: { s: Stats }) {
  const t = useT()
  const decided = s.win + s.draw + s.loss
  if (decided === 0) return <div className="bar empty" />
  const pct = (n: number) => `${(n / decided) * 100}%`
  return (
    <div className="bar" title={`+${s.win} =${s.draw} −${s.loss}${s.unknown ? ` · ${t.explorer.noResult(s.unknown)}` : ''}`}>
      <span className="win" style={{ width: pct(s.win) }} />
      <span className="draw" style={{ width: pct(s.draw) }} />
      <span className="loss" style={{ width: pct(s.loss) }} />
    </div>
  )
}

function resultFor(g: ParsedGame, color: Color) {
  if (g.result === '1/2-1/2') return { label: '½', cls: 'draw' }
  if (g.result === '*') return { label: '?', cls: '' }
  const won = (g.result === '1-0') === (color === 'w')
  return won ? { label: '1', cls: 'win' } : { label: '0', cls: 'loss' }
}

/** Jugada de una variante propia: no sale de ninguna partida. */
interface VariationMove {
  san: string
  from: string
  to: string
  fen: string
}

/** Posición actual: jugadas del árbol y, a continuación, la variante propia. */
interface Nav {
  path: Edge[]
  extra: VariationMove[]
}

const START: Nav = { path: [], extra: [] }

/** Un paso atrás: primero se deshace la variante propia, después el árbol. */
const stepBack = (n: Nav): Nav =>
  n.extra.length > 0 ? { ...n, extra: n.extra.slice(0, -1) } : { path: n.path.slice(0, -1), extra: [] }

export function Explorer({ tree, color }: { tree: OpeningTree; color: Color }) {
  const t = useT()
  const [nav, setNavState] = useState<Nav>(START)
  const [hovered, setHovered] = useState<Edge | null>(null)
  const { path, extra } = nav

  const setNav = (update: Nav | ((n: Nav) => Nav)) => {
    setNavState(update)
    setHovered(null)
  }
  const setPath = (p: Edge[]) => setNav({ path: p, extra: [] })

  const node = tree.nodes.get(path.at(-1)?.target ?? tree.rootKey)
  const moves = node ? [...node.children.values()].sort((a, b) => b.games - a.games) : []
  const offBook = extra.length > 0
  const fen = extra.at(-1)?.fen ?? node?.fen ?? ''
  /** Índice de la próxima media jugada, para numerar (1. e4, 1… e5). */
  const ply = path.length + extra.length

  const [engineOn, setEngineOn] = useEngineEnabled()
  const [lineCount, setLineCount] = useEngineLines()
  const analysis = usePositionAnalysis(
    fen,
    offBook ? [] : moves.map((m) => edgeUci(m.from, m.to, m.san)),
    engineOn && !!node,
    lineCount,
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowLeft') setNavState(stepBack)
      if (e.key === 'Home') setNavState(START)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!node || node.stats.games === 0) {
    return <p className="muted">{t.explorer.noGamesFor(color)}</p>
  }

  const arrowEdge = offBook ? undefined : (hovered ?? moves[0])
  const best = analysis.best
  const mover = sideToMove(fen)
  // Referencia para marcar errores: la mejor evaluación conocida para quien mueve.
  const sign = mover === 'w' ? 1 : -1
  const reference = [best?.score, ...analysis.moves.values()]
    .filter((s): s is Score => !!s)
    .reduce<Score | null>((a, s) => (!a || sign * toCp(s) > sign * toCp(a) ? s : a), null)
  const score = scorePercent(node.stats)
  const games = node.gameIndices.map((i) => tree.games[i])

  const go = (edge: Edge) => setNav((n) => ({ path: [...n.path, edge], extra: [] }))

  const openGame = (g: ParsedGame) => {
    const { pathname, search } = window.location
    window.open(pathname + search + encodeGameHash(toSharedGame(g, path.length, color)), '_blank', 'noopener')
  }

  /**
   * Juega una jugada en el tablero: si está en las partidas avanza por el árbol;
   * si no, la agrega a la variante propia. Devuelve false si es ilegal.
   */
  const play = (from: string, to: string, promotion = 'q'): boolean => {
    if (!offBook) {
      const candidates = moves.filter((m) => m.from === from && m.to === to)
      const edge = candidates.find((m) => m.san.includes(`=${promotion.toUpperCase()}`)) ?? candidates[0]
      if (edge) {
        go(edge)
        return true
      }
    }
    try {
      const chess = new Chess(fen)
      const move = chess.move({ from, to, promotion })
      setNav((n) => ({ ...n, extra: [...n.extra, { san: move.san, from, to, fen: chess.fen() }] }))
      return true
    } catch {
      return false // jugada ilegal: la pieza vuelve a su casilla
    }
  }

  return (
    <div className="explorer">
      <div className="board-col">
        <div className="board-wrap">
          {engineOn && <EvalBar score={best?.score ?? null} orientation={color} />}
          <div className="board">
            <Chessboard
              options={{
                position: fen,
                boardOrientation: color === 'w' ? 'white' : 'black',
                showAnimations: true,
                canDragPiece: ({ piece }) => piece.pieceType[0] === mover,
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  !!targetSquare && sourceSquare !== targetSquare && play(sourceSquare, targetSquare),
                arrows: [
                  // La flecha del motor se omite si coincide con la de la jugada resaltada.
                  ...(best?.pv[0] && best.pv[0].slice(0, 4) !== (arrowEdge ? arrowEdge.from + arrowEdge.to : '')
                    ? [{ startSquare: best.pv[0].slice(0, 2), endSquare: best.pv[0].slice(2, 4), color: '#3a9d5daa' }]
                    : []),
                  ...(arrowEdge
                    ? [{ startSquare: arrowEdge.from, endSquare: arrowEdge.to, color: hovered ? '#2f7de1cc' : '#2f7de166' }]
                    : []),
                ],
              }}
            />
          </div>
        </div>
        <div className="nav">
          <button type="button" onClick={() => setNav(START)} disabled={ply === 0}>
            {t.explorer.first}
          </button>
          <button type="button" onClick={() => setNav(stepBack)} disabled={ply === 0}>
            {t.explorer.back}
          </button>
        </div>
        <p className="muted small hint">{t.explorer.dragHint}</p>
        <EngineToggle
          on={engineOn}
          onChange={setEngineOn}
          status={analysis.status}
          detail={best ? t.engine.depth(best.depth) : undefined}
        />
        {engineOn && (
          <div className="engine-lines-picker">
            <span className="muted small">{t.engine.lines}</span>
            <div className="tabs small" role="group" aria-label={t.engine.lines}>
              {Array.from({ length: MAX_LINES }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" aria-pressed={lineCount === n} onClick={() => setLineCount(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
        {analysis.lines.length > 0 && (
          <ol className="engine-lines small">
            {analysis.lines.map((line) => {
              const san = uciToSan(fen, line.pv.slice(0, 6))
              if (san.length === 0) return null
              const first = line.pv[0]
              return (
                <li key={line.multipv}>
                  <button
                    type="button"
                    className="engine-line-button"
                    title={t.engine.playLine}
                    onClick={() => play(first.slice(0, 2), first.slice(2, 4), first[4])}
                  >
                    <span className="engine-score">{formatScore(line.score)}</span>{' '}
                    <strong>{moveLabel(ply, san[0])}</strong> <span className="muted">{san.slice(1).join(' ')}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <div className="moves-col">
        <div className="breadcrumb">
          <button type="button" className="link" onClick={() => setPath([])}>
            {t.explorer.start}
          </button>
          {path.map((e, i) => (
            <button key={i} type="button" className="link" onClick={() => setPath(path.slice(0, i + 1))}>
              {i % 2 === 0 ? `${i / 2 + 1}.${e.san}` : e.san}
            </button>
          ))}
          {extra.map((m, j) => {
            const i = path.length + j
            return (
              <button
                key={`x${j}`}
                type="button"
                className="link off-book"
                onClick={() => setNav((n) => ({ ...n, extra: n.extra.slice(0, j + 1) }))}
              >
                {i % 2 === 0 ? `${i / 2 + 1}.${m.san}` : j === 0 ? `${(i + 1) / 2}…${m.san}` : m.san}
              </button>
            )
          })}
        </div>

        {offBook ? (
          <div className="off-book-panel">
            <p>{t.explorer.offBook}</p>
            <button type="button" onClick={() => setNav((n) => ({ ...n, extra: [] }))}>
              {t.explorer.backToGames}
            </button>
          </div>
        ) : (
          <>
        <p className="position-stats">
          <strong>{node.stats.games}</strong> {t.explorer.gamesHere(node.stats.games)}
          {score !== null && (
            <>
              {' '}
              · {t.explorer.score} <strong>{score.toFixed(0)}%</strong>
            </>
          )}{' '}
          <span className="muted">
            (+{node.stats.win} ={node.stats.draw} −{node.stats.loss})
          </span>
        </p>

        {moves.length === 0 ? (
          <p className="muted">{t.explorer.endOfGames}</p>
        ) : (
          <div className="table-scroll">
            <table className="moves">
              <thead>
                <tr>
                  <th>{t.explorer.move}</th>
                  <th className="num">{t.explorer.games}</th>
                  <th className="num">{t.explorer.scoreCol}</th>
                  <th>+ / = / −</th>
                  {engineOn && (
                    <th className="num" title={t.engine.evalTitle}>
                      {t.engine.evalCol}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {moves.map((m) => {
                  const sc = scorePercent(m)
                  const ev = analysis.moves.get(edgeUci(m.from, m.to, m.san))
                  return (
                    <tr
                      key={m.san}
                      onClick={() => go(m)}
                      onMouseEnter={() => setHovered(m)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <td className="san">{moveLabel(path.length, m.san)}</td>
                      <td className="num">
                        {m.games} <span className="muted small">({((m.games / node.stats.games) * 100).toFixed(0)}%)</span>
                      </td>
                      <td className="num">{sc === null ? '—' : `${sc.toFixed(0)}%`}</td>
                      <td>
                        <StatsBar s={m} />
                      </td>
                      {engineOn && (
                        <td className="num eval-cell">
                          {ev ? (
                            <>
                              {formatScore(ev)}
                              <Mark mark={reference ? classifyMove(reference, ev, mover) : null} />
                            </>
                          ) : (
                            <span className="muted">…</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <details className="games">
          <summary>{t.explorer.gamesThrough(games.length)}</summary>
          <div className="games-list">
            <table>
              <thead>
                <tr>
                  <th className="result-head" title={t.explorer.result}>
                    {t.explorer.resultAbbr}
                  </th>
                  <th>{t.explorer.opponent}</th>
                  <th>{t.explorer.event}</th>
                  <th>{t.explorer.date}</th>
                  <th className="num">{t.explorer.moves}</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g, i) => {
                  const r = resultFor(g, color)
                  const [rival, rivalElo] = color === 'w' ? [g.black, g.blackElo] : [g.white, g.whiteElo]
                  return (
                    <tr key={i} onClick={() => openGame(g)} title={t.explorer.openGame}>
                      <td className={`result ${r.cls}`}>{r.label}</td>
                      <td>
                        {rival}
                        {rivalElo && <span className="muted"> ({rivalElo})</span>}
                      </td>
                      <td className="muted small">{g.event ?? '—'}</td>
                      <td className="muted small nowrap">{g.date ?? '—'}</td>
                      <td className="muted small num">{Math.ceil(g.plies.length / 2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </details>
          </>
        )}
      </div>
    </div>
  )
}
