import { Chess } from 'chess.js'
import { useEffect, useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { SharedGame } from '../core/gameLink'
import { useT } from '../i18n'

const RESULT_LABEL: Record<SharedGame['result'], string> = {
  '1-0': '1-0',
  '0-1': '0-1',
  '1/2-1/2': '½-½',
  '*': '*',
}

const withElo = (name: string, elo?: number) => (elo ? `${name} (${elo})` : name)

export function GameViewer({ game }: { game: SharedGame }) {
  const t = useT()
  const positions = useMemo(() => {
    const chess = new Chess()
    const list = [{ fen: chess.fen(), from: '', to: '' }]
    for (const san of game.sans) {
      try {
        const m = chess.move(san)
        list.push({ fen: chess.fen(), from: m.from, to: m.to })
      } catch {
        break
      }
    }
    return list
  }, [game])

  const last = positions.length - 1
  const [ply, setPly] = useState(() => Math.min(Math.max(game.ply, 0), last))
  const current = positions[ply]

  useEffect(() => {
    document.title = `${game.white} – ${game.black}`
  }, [game])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setPly((p) => Math.max(0, p - 1))
      if (e.key === 'ArrowRight') setPly((p) => Math.min(last, p + 1))
      if (e.key === 'Home') setPly(0)
      if (e.key === 'End') setPly(last)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  const highlight = current.from
    ? { [current.from]: { background: '#f6e27a99' }, [current.to]: { background: '#f6e27acc' } }
    : {}

  const rows = []
  for (let i = 0; i < positions.length - 1; i += 2) rows.push(i)

  return (
    <div className="app">
      <header>
        <h1>
          {withElo(game.white, game.whiteElo)} – {withElo(game.black, game.blackElo)}
        </h1>
        <p className="muted">
          <strong>{RESULT_LABEL[game.result]}</strong>
          {[game.event, game.round && t.viewer.round(game.round), game.date].filter(Boolean).map((t) => ` · ${t}`)}
        </p>
      </header>

      <main className="viewer">
        <div className="board-col">
          <div className="board">
            <Chessboard
              options={{
                position: current.fen,
                boardOrientation: game.orientation === 'w' ? 'white' : 'black',
                allowDragging: false,
                squareStyles: highlight,
              }}
            />
          </div>
          <div className="nav">
            <button type="button" onClick={() => setPly(0)} disabled={ply === 0}>
              ⏮
            </button>
            <button type="button" onClick={() => setPly(ply - 1)} disabled={ply === 0}>
              ◀
            </button>
            <button type="button" onClick={() => setPly(ply + 1)} disabled={ply === last}>
              ▶
            </button>
            <button type="button" onClick={() => setPly(last)} disabled={ply === last}>
              ⏭
            </button>
          </div>
          <p className="muted small hint keyboard-hint">{t.viewer.keyboardHint}</p>
        </div>

        <ol className="move-list">
          {rows.map((i) => (
            <li key={i}>
              <span className="move-no">{i / 2 + 1}.</span>
              {[i, i + 1]
                .filter((k) => k < last)
                .map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`move ${ply === k + 1 ? 'current' : ''}`}
                    onClick={() => setPly(k + 1)}
                  >
                    {game.sans[k]}
                  </button>
                ))}
            </li>
          ))}
          <li className="final-result">{RESULT_LABEL[game.result]}</li>
        </ol>
      </main>
    </div>
  )
}
