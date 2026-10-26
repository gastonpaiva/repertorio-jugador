import type { ParsedGame } from './types'

export interface PlayerSummary {
  key: string
  /** Variante original del nombre más frecuente. */
  name: string
  asWhite: number
  asBlack: number
}

export function collectPlayers(games: ParsedGame[]): PlayerSummary[] {
  const map = new Map<string, { names: Map<string, number>; asWhite: number; asBlack: number }>()

  const add = (key: string, name: string, color: 'asWhite' | 'asBlack') => {
    if (key === '') return
    let entry = map.get(key)
    if (!entry) {
      entry = { names: new Map(), asWhite: 0, asBlack: 0 }
      map.set(key, entry)
    }
    entry[color]++
    entry.names.set(name, (entry.names.get(name) ?? 0) + 1)
  }

  for (const g of games) {
    add(g.whiteKey, g.white, 'asWhite')
    add(g.blackKey, g.black, 'asBlack')
  }

  return [...map.entries()]
    .map(([key, e]) => ({
      key,
      name: [...e.names.entries()].sort((a, b) => b[1] - a[1])[0][0],
      asWhite: e.asWhite,
      asBlack: e.asBlack,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
}
