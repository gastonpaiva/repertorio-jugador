import { parseGame } from './parseGame'
import { splitPgn } from './splitPgn'
import type { ImportReport, ParsedGame } from './types'

export interface PgnFile {
  name: string
  text: string
}

/**
 * Dos partidas son la misma si coinciden jugadores, ronda y jugadas. No se usa
 * la fecha porque suele faltar; la ronda evita fusionar dos tablas rápidas
 * idénticas jugadas en rondas distintas.
 */
export function gameKey(g: ParsedGame): string {
  return [g.whiteKey, g.blackKey, g.round ?? '', g.plies.map((p) => p.san).join(' ')].join('|')
}

export function importGames(files: PgnFile[]): { games: ParsedGame[]; report: ImportReport } {
  const games: ParsedGame[] = []
  const seen = new Set<string>()
  const report: ImportReport = {
    read: 0,
    valid: 0,
    discarded: { 'sin-jugadas': 0, 'posicion-inicial': 0, duplicada: 0 },
    warnings: [],
  }

  for (const file of files) {
    for (const raw of splitPgn(file.text)) {
      report.read++
      const outcome = parseGame(raw, file.name)
      if (!outcome.ok) {
        report.discarded[outcome.reason]++
        continue
      }
      const game = outcome.game
      const key = gameKey(game)
      if (seen.has(key)) {
        report.discarded.duplicada++
        continue
      }
      seen.add(key)
      games.push(game)
      if (game.warning) {
        report.warnings.push({ source: file.name, white: game.white, black: game.black, message: game.warning })
      }
    }
  }
  report.valid = games.length
  return { games, report }
}
