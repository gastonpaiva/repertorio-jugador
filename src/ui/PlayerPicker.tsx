import { useMemo, useState } from 'react'
import { stripAccents } from '../core/names'
import type { PlayerSummary } from '../core/players'

const fold = (s: string) => stripAccents(s).toLowerCase()

export function PlayerPicker({
  players,
  selected,
  onSelect,
}: {
  players: PlayerSummary[]
  selected: string | null
  onSelect: (key: string) => void
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const words = fold(query).split(/[\s,]+/).filter(Boolean)
    return players.filter((p) => words.every((w) => fold(p.name).includes(w)))
  }, [players, query])

  if (players.length === 0) return null

  return (
    <section className="panel">
      <h2>Jugador</h2>
      <input
        type="search"
        placeholder={`Buscar entre ${players.length} jugadores…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="players">
        {filtered.slice(0, 300).map((p) => (
          <li key={p.key}>
            <button type="button" className={p.key === selected ? 'selected' : ''} onClick={() => onSelect(p.key)}>
              <span>{p.name}</span>
              <span className="muted small" title="Partidas con blancas / con negras">
                {p.asWhite}B · {p.asBlack}N
              </span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="muted small">Sin coincidencias.</li>}
      </ul>
    </section>
  )
}
