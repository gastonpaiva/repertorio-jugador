const TITLES = new Set(['gm', 'im', 'fm', 'cm', 'wgm', 'wim', 'wfm', 'wcm', 'nm', 'mn', 'mf', 'mi', 'gmi'])
const UNKNOWN = new Set(['', '?', '??', 'nn', 'n n', '-', 'unknown', 'desconocido', 'bye'])

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

/**
 * Clave canónica de un jugador: sin acentos, minúsculas, sin títulos y con los
 * tokens ordenados, así "Pérez, Juan", "PEREZ Juan" y "Juan Perez" coinciden.
 * Devuelve '' si el nombre es desconocido.
 */
export function normalizeName(raw: string | undefined): string {
  if (!raw) return ''
  let s = stripAccents(raw).toLowerCase().trim()
  if (UNKNOWN.has(s)) return ''
  s = s.replace(/\(.*?\)/g, ' ') // "(ARG)", "(2150)"
  const tokens = s
    .split(/[\s,.\-_'’]+/)
    .filter((t) => t !== '' && !TITLES.has(t))
  return tokens.sort().join(' ')
}

/** "Apellido, Nombre" con espacios prolijos; si el original está vacío, "?". */
export function cleanDisplayName(raw: string | undefined): string {
  const s = (raw ?? '').replace(/\s+/g, ' ').replace(/\s*,\s*/, ', ').trim()
  return s === '' ? '?' : s
}
