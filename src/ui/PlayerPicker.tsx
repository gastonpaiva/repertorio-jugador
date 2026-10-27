import { useMemo, useState } from 'react'
import { stripAccents } from '../core/names'
import type { PlayerSummary } from '../core/players'
import { useT } from '../i18n'

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
  const t = useT()
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
      <h2>{t.picker.title}</h2>
      <input
        type="search"
        placeholder={t.picker.search(players.length)}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="sort">
        <span className="muted small">{t.picker.sortBy}</span>
        <div className="tabs small" role="tablist">
          <button type="button" role="tab" aria-selected={sortBy === 'games'} onClick={() => setSortBy('games')}>
            {t.picker.byGames}
          </button>
          <button type="button" role="tab" aria-selected={sortBy === 'name'} onClick={() => setSortBy('name')}>
            {t.picker.byName}
          </button>
        </div>
      </div>
      <ul className="players">
        {filtered.slice(0, 300).map((p) => (
          <li key={p.key}>
            <button type="button" className={p.key === selected ? 'selected' : ''} onClick={() => onSelect(p.key)}>
              <span>{p.name}</span>
              <span className="muted small nowrap" title={t.picker.countTitle}>
                <strong>{p.asWhite + p.asBlack}</strong> · {p.asWhite}
                {t.picker.whiteAbbr} {p.asBlack}
                {t.picker.blackAbbr}
              </span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="muted small">{t.picker.noMatches}</li>}
      </ul>
    </section>
  )
}
