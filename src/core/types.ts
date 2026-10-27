export type Result = '1-0' | '0-1' | '1/2-1/2' | '*'

export type Color = 'w' | 'b'

/** Una jugada ya validada por chess.js. */
export interface Ply {
  san: string
  from: string
  to: string
  /** FEN completo de la posición resultante (para el tablero). */
  fen: string
  /** FEN sin contadores de jugadas: identifica la posición (agrupa transposiciones). */
  key: string
}

export interface ParsedGame {
  white: string
  black: string
  whiteKey: string
  blackKey: string
  /** Ausente si el PGN no lo trae o vale 0. */
  whiteElo?: number
  blackElo?: number
  result: Result
  event?: string
  round?: string
  date?: string
  plies: Ply[]
  /** Archivo de origen. */
  source: string
  /** Presente si el texto de jugadas tenía algo inválido y se truncó. */
  warning?: InvalidMove
}

/** Jugada que chess.js no pudo aplicar; la partida se cortó ahí. El texto lo arma la interfaz. */
export interface InvalidMove {
  token: string
  /** Número de jugada (1, 2, ...). */
  move: number
  /** Medias jugadas válidas que se conservaron. */
  kept: number
}

export type DiscardReason = 'sin-jugadas' | 'posicion-inicial' | 'duplicada'

export interface ImportReport {
  read: number
  valid: number
  discarded: Record<DiscardReason, number>
  warnings: { source: string; white: string; black: string; warning: InvalidMove }[]
}
