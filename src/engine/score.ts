import { Chess } from 'chess.js'

/** Evaluación siempre desde el punto de vista de las blancas. */
export type Score = { cp: number } | { mate: number }

export interface Line {
  multipv: number
  depth: number
  score: Score
  /** Variante principal en notación UCI (e2e4, e7e8q...). */
  pv: string[]
}

export type MoveMark = '?!' | '?' | '??'

/** Lado que mueve en un FEN. */
export const sideToMove = (fen: string): 'w' | 'b' => (fen.split(' ')[1] === 'b' ? 'b' : 'w')

/**
 * Lee una línea "info ..." de UCI. El puntaje de UCI es del lado que mueve; se
 * pasa a blancas. Devuelve null para líneas sin puntaje o con cotas (lowerbound).
 */
export function parseInfo(line: string, whiteToMove: boolean): Line | null {
  if (!line.startsWith('info ') || / (lower|upper)bound/.test(line)) return null
  const m = /\bscore (cp|mate) (-?\d+)/.exec(line)
  const depth = /\bdepth (\d+)/.exec(line)
  if (!m || !depth) return null
  const sign = whiteToMove ? 1 : -1
  const value = Number(m[2]) * sign
  return {
    multipv: Number(/\bmultipv (\d+)/.exec(line)?.[1] ?? 1),
    depth: Number(depth[1]),
    // "mate 0": el lado que mueve ya está en jaque mate (posición final, sin pv).
    score: m[1] === 'cp' ? { cp: value } : value === 0 ? { cp: -sign * MATED } : { mate: value },
    pv: /\bpv (.+)$/.exec(line)?.[1].trim().split(/\s+/) ?? [],
  }
}

/** Puntaje de una posición de jaque mate ya dado. */
const MATED = 100000

/** Centipeones equivalentes; un mate cuenta como ventaja enorme. */
export function toCp(s: Score): number {
  if ('cp' in s) return s.cp
  return s.mate > 0 ? 10000 - s.mate : -10000 - s.mate
}

/** +0.35, −1.20, #3, #−2 (desde blancas). */
export function formatScore(s: Score): string {
  if ('mate' in s) return s.mate >= 0 ? `#${s.mate}` : `#−${-s.mate}`
  if (Math.abs(s.cp) >= MATED) return s.cp > 0 ? '1-0' : '0-1'
  const v = s.cp / 100
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`
}

/** Probabilidad de ganar en [-1, 1] desde blancas (la curva que usa Lichess). */
export function winningChances(s: Score): number {
  const cp = Math.max(-1000, Math.min(1000, toCp(s)))
  return 2 / (1 + Math.exp(-0.00368208 * cp)) - 1
}

/** Porcentaje (0–100) de la barra de evaluación ocupado por las blancas. */
export const whiteShare = (s: Score) => (winningChances(s) + 1) * 50

/**
 * Marca de una jugada según cuánto empeoró la posición para quien la hizo,
 * medido en probabilidad de ganar (umbrales de Lichess).
 */
export function classifyMove(before: Score, after: Score, mover: 'w' | 'b'): MoveMark | null {
  const sign = mover === 'w' ? 1 : -1
  const drop = sign * (winningChances(before) - winningChances(after))
  if (drop >= 0.3) return '??'
  if (drop >= 0.2) return '?'
  if (drop >= 0.1) return '?!'
  return null
}

/** Jugada en SAN ("Nf3") a UCI ("g1f3"), según el lado de una coronación. */
export function edgeUci(from: string, to: string, san: string): string {
  const promo = /=([QRBN])/.exec(san)?.[1]
  return from + to + (promo ? promo.toLowerCase() : '')
}

/** Convierte una variante UCI a SAN; se corta en la primera jugada inválida. */
export function uciToSan(fen: string, uci: string[]): string[] {
  const chess = new Chess(fen)
  const out: string[] = []
  for (const u of uci) {
    try {
      out.push(chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san)
    } catch {
      break
    }
  }
  return out
}
