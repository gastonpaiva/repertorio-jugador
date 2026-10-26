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
  const [sortBy, setSortBy] = useState<'games' | 'name'>('games')
  const filtered = useMemo(() => {
    const words = fold(query).split(/[\s,]+/).filter(Boolean)
    const list = players.filter((p) => words.every((w) => fold(p.name).includes(w)))
    // `players` ya viene ordenado por nombre; sort es estable y desempata por nombre.
    return sortBy === 'games' ? list.sort((a, b) => b.asWhite + b.asBlack - (a.asWhite + a.asBlack)) : list
  }, [players, query, sortBy])

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
      <div className="sort">
        <span className="muted small">Ordenar por</span>
        <div className="tabs small" role="tablist">
          <button type="button" role="tab" aria-selected={sortBy === 'games'} onClick={() => setSortBy('games')}>
            Partidas
          </button>
          <button type="button" role="tab" aria-selected={sortBy === 'name'} onClick={() => setSortBy('name')}>
            Nombre
          </button>
        </div>
      </div>
      <ul className="players">
        {filtered.slice(0, 300).map((p) => (
          <li key={p.key}>
            <button type="button" className={p.key === selected ? 'selected' : ''} onClick={() => onSelect(p.key)}>
              <span>{p.name}</span>
              <span className="muted small nowrap" title="Total · con blancas / con negras">
                <strong>{p.asWhite + p.asBlack}</strong> · {p.asWhite}B {p.asBlack}N
              </span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="muted small">Sin coincidencias.</li>}
      </ul>
    </section>
  )
}
