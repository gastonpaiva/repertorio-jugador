import { Chess, DEFAULT_POSITION } from 'chess.js'
import { cleanDisplayName, normalizeName } from './names'
import type { RawGame } from './splitPgn'
import type { DiscardReason, ParsedGame, Ply, Result } from './types'

export type ParseOutcome =
  | { ok: true; game: ParsedGame }
  | { ok: false; reason: DiscardReason }

const RESULT_TOKENS = new Set(['1-0', '0-1', '1/2-1/2', '½-½', '*'])

export function positionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ')
}

function normalizeResult(raw: string | undefined): Result | undefined {
  const s = raw?.replace(/\s+/g, '')
  if (s === '1-0' || s === '0-1' || s === '*') return s
  if (s === '1/2-1/2' || s === '½-½' || s === '1/2') return '1/2-1/2'
  return undefined
}

/** Saca comentarios {..} y ;.., variantes (..) anidadas y NAGs; devuelve tokens. */
export function tokenizeMovetext(movetext: string): string[] {
  let clean = ''
  let braces = 0
  let parens = 0
  for (let i = 0; i < movetext.length; i++) {
    const ch = movetext[i]
    if (braces > 0) {
      if (ch === '}') braces--
      continue
    }
    if (ch === '{') {
      braces++
    } else if (ch === ';') {
      while (i < movetext.length && movetext[i] !== '\n') i++
    } else if (ch === '(') {
      parens++
    } else if (ch === ')') {
      if (parens > 0) parens--
    } else if (parens === 0) {
      clean += ch
    }
  }
  return clean
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.+/, '')) // "12." "12..." "1.e4"
    .filter((t) => t !== '' && !t.startsWith('$'))
}

function headerValue(v: string | undefined): string | undefined {
  const s = v?.trim()
  return s && !/^[?.-]*$/.test(s) ? s : undefined
}

export function parseGame(raw: RawGame, source: string): ParseOutcome {
  const h = raw.headers
  const setupFen = headerValue(h.FEN)
  if (setupFen && positionKey(setupFen) !== positionKey(DEFAULT_POSITION)) {
    return { ok: false, reason: 'posicion-inicial' }
  }

  const chess = new Chess()
  const plies: Ply[] = []
  let warning: string | undefined
  let terminator: string | undefined

  for (const token of tokenizeMovetext(raw.movetext)) {
    if (RESULT_TOKENS.has(token)) {
      terminator = token
      break
    }
    const san = token.replace(/[!?]+$/, '').replace(/^0-0-0/, 'O-O-O').replace(/^0-0/, 'O-O')
    try {
      const move = chess.move(san, { strict: false })
      const fen = chess.fen()
      plies.push({ san: move.san, from: move.from, to: move.to, fen, key: positionKey(fen) })
    } catch {
      const moveNo = Math.floor(plies.length / 2) + 1
      warning = `Jugada inválida "${token}" en la jugada ${moveNo}; se usaron las primeras ${plies.length} medias jugadas.`
      break
    }
  }

  if (plies.length === 0) return { ok: false, reason: 'sin-jugadas' }

  return {
    ok: true,
    game: {
      white: cleanDisplayName(h.White),
      black: cleanDisplayName(h.Black),
      whiteKey: normalizeName(h.White),
      blackKey: normalizeName(h.Black),
      result: normalizeResult(h.Result) ?? normalizeResult(terminator) ?? '*',
      event: headerValue(h.Event),
      round: headerValue(h.Round),
      date: headerValue(h.Date),
      plies,
      source,
      warning,
    },
  }
}
