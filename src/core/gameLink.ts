import type { Color, ParsedGame, Result } from './types'

/** Lo mínimo para ver una partida en otra pestaña; viaja en el hash de la URL. */
export interface SharedGame {
  white: string
  black: string
  whiteElo?: number
  blackElo?: number
  result: Result
  event?: string
  round?: string
  date?: string
  sans: string[]
  /** Media jugada en la que se abre el visor. */
  ply: number
  orientation: Color
}

const PREFIX = '#partida='

function toBase64Url(text: string): string {
  let binary = ''
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(data: string): string {
  const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

export function toSharedGame(g: ParsedGame, ply: number, orientation: Color): SharedGame {
  return {
    white: g.white,
    black: g.black,
    whiteElo: g.whiteElo,
    blackElo: g.blackElo,
    result: g.result,
    event: g.event,
    round: g.round,
    date: g.date,
    sans: g.plies.map((p) => p.san),
    ply,
    orientation,
  }
}

export function encodeGameHash(game: SharedGame): string {
  return PREFIX + toBase64Url(JSON.stringify(game))
}

/** Devuelve la partida si el hash es un enlace de partida válido. */
export function decodeGameHash(hash: string): SharedGame | null {
  if (!hash.startsWith(PREFIX)) return null
  try {
    const game = JSON.parse(fromBase64Url(hash.slice(PREFIX.length))) as SharedGame
    return Array.isArray(game.sans) ? game : null
  } catch {
    return null
  }
}
