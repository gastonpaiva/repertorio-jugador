import { Chess } from 'chess.js'
import { useEffect, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { encodeGameHash, toSharedGame } from '../core/gameLink'
import { scorePercent, type Edge, type OpeningTree, type Stats } from '../core/tree'
import type { Color, ParsedGame } from '../core/types'
import { useT } from '../i18n'

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

export function Explorer({ tree, color }: { tree: OpeningTree; color: Color }) {
  const t = useT()
  const [path, setPathState] = useState<Edge[]>([])
  const [hovered, setHovered] = useState<Edge | null>(null)
  /** Jugada movida en el tablero que no aparece en las partidas, para avisarlo. */
  const [notice, setNotice] = useState<string | null>(null)

  const setPath = (update: Edge[] | ((p: Edge[]) => Edge[])) => {
    setPathState(update)
    setHovered(null)
    setNotice(null)
  }

  const node = tree.nodes.get(path.at(-1)?.target ?? tree.rootKey)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowLeft' || e.key === 'Home') {
        setPathState((p) => (e.key === 'Home' ? [] : p.slice(0, -1)))
        setNotice(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!node || node.stats.games === 0) {
    return <p className="muted">{t.explorer.noGamesFor(color)}</p>
  }

  const moves = [...node.children.values()].sort((a, b) => b.games - a.games)
  const arrowEdge = hovered ?? moves[0]
  const score = scorePercent(node.stats)
  const games = node.gameIndices.map((i) => tree.games[i])

  const go = (edge: Edge) => setPath((p) => [...p, edge])

  const openGame = (g: ParsedGame) => {
    const { pathname, search } = window.location
    window.open(pathname + search + encodeGameHash(toSharedGame(g, path.length, color)), '_blank', 'noopener')
  }

  const sideToMove = node.fen.split(' ')[1]

  const onPieceDrop = (from: string, to: string | null): boolean => {
    if (!to || from === to) return false
    // Si hay varias coronaciones posibles, se prefiere la de dama.
    const candidates = moves.filter((m) => m.from === from && m.to === to)
    const edge = candidates.find((m) => m.san.includes('=Q')) ?? candidates[0]
    if (edge) {
      go(edge)
      return true
    }
    let san: string
    try {
      san = new Chess(node.fen).move({ from, to, promotion: 'q' }).san
    } catch {
      return false // jugada ilegal: la pieza vuelve a su casilla
    }
    setNotice(moveLabel(path.length, san))
    return false
  }

  return (
    <div className="explorer">
      <div className="board-col">
        <div className="board">
          <Chessboard
            options={{
              position: node.fen,
              boardOrientation: color === 'w' ? 'white' : 'black',
              showAnimations: true,
              canDragPiece: ({ piece }) => piece.pieceType[0] === sideToMove,
              onPieceDrop: ({ sourceSquare, targetSquare }) => onPieceDrop(sourceSquare, targetSquare),
              arrows: arrowEdge
                ? [{ startSquare: arrowEdge.from, endSquare: arrowEdge.to, color: hovered ? '#2f7de1cc' : '#2f7de166' }]
                : [],
            }}
          />
        </div>
        <div className="nav">
          <button type="button" onClick={() => setPath([])} disabled={path.length === 0}>
            {t.explorer.first}
          </button>
          <button type="button" onClick={() => setPath((p) => p.slice(0, -1))} disabled={path.length === 0}>
            {t.explorer.back}
          </button>
        </div>
        {notice ? (
          <p className="notice" role="status">
            {t.explorer.notInGames(notice)}
          </p>
        ) : (
          <p className="muted small hint">{t.explorer.dragHint}</p>
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
        </div>

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
                </tr>
              </thead>
              <tbody>
                {moves.map((m) => {
                  const sc = scorePercent(m)
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
      </div>
    </div>
  )
}
