import { Chess } from 'chess.js'
import { useEffect, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { encodeGameHash, toSharedGame } from '../core/gameLink'
import { scorePercent, type Edge, type OpeningTree, type Stats } from '../core/tree'
import type { Color, ParsedGame } from '../core/types'

const moveLabel = (plyIndex: number, san: string) =>
  plyIndex % 2 === 0 ? `${plyIndex / 2 + 1}. ${san}` : `${(plyIndex + 1) / 2}… ${san}`

function StatsBar({ s }: { s: Stats }) {
  const decided = s.win + s.draw + s.loss
  if (decided === 0) return <div className="bar empty" />
  const pct = (n: number) => `${(n / decided) * 100}%`
  return (
    <div className="bar" title={`+${s.win} =${s.draw} −${s.loss}${s.unknown ? ` · ${s.unknown} sin resultado` : ''}`}>
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
  const [path, setPathState] = useState<Edge[]>([])
  const [hovered, setHovered] = useState<Edge | null>(null)
  /** Aviso cuando se mueve en el tablero una jugada que no aparece en las partidas. */
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
    return <p className="muted">No hay partidas con {color === 'w' ? 'blancas' : 'negras'} para este jugador.</p>
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
    setNotice(`No hay partidas con ${moveLabel(path.length, san)} en esta posición.`)
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
            ⏮ Inicio
          </button>
          <button type="button" onClick={() => setPath((p) => p.slice(0, -1))} disabled={path.length === 0}>
            ◀ Atrás
          </button>
        </div>
        {notice ? (
          <p className="notice" role="status">
            {notice}
          </p>
        ) : (
          <p className="muted small hint">Podés mover las piezas en el tablero para avanzar.</p>
        )}
      </div>

      <div className="moves-col">
        <div className="breadcrumb">
          <button type="button" className="link" onClick={() => setPath([])}>
            Inicio
          </button>
          {path.map((e, i) => (
            <button key={i} type="button" className="link" onClick={() => setPath(path.slice(0, i + 1))}>
              {i % 2 === 0 ? `${i / 2 + 1}.${e.san}` : e.san}
            </button>
          ))}
        </div>

        <p className="position-stats">
          <strong>{node.stats.games}</strong> partida{node.stats.games !== 1 && 's'} en esta posición
          {score !== null && (
            <>
              {' '}
              · puntaje <strong>{score.toFixed(0)}%</strong>
            </>
          )}{' '}
          <span className="muted">
            (+{node.stats.win} ={node.stats.draw} −{node.stats.loss})
          </span>
        </p>

        {moves.length === 0 ? (
          <p className="muted">Fin de las partidas registradas.</p>
        ) : (
          <table className="moves">
            <thead>
              <tr>
                <th>Jugada</th>
                <th className="num">Partidas</th>
                <th className="num">Puntaje</th>
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
        )}

        <details className="games">
          <summary>Partidas que pasaron por esta posición ({games.length})</summary>
          <div className="games-list">
            <table>
              <thead>
                <tr>
                  <th className="result-head" title="Resultado">
                    Res.
                  </th>
                  <th>Rival</th>
                  <th>Torneo</th>
                  <th>Fecha</th>
                  <th className="num">Jugadas</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g, i) => {
                  const r = resultFor(g, color)
                  const [rival, rivalElo] = color === 'w' ? [g.black, g.blackElo] : [g.white, g.whiteElo]
                  return (
                    <tr key={i} onClick={() => openGame(g)} title="Ver la partida completa en otra pestaña">
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
