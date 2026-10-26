export interface RawGame {
  headers: Record<string, string>
  movetext: string
}

const TAG_RE = /^\s*\[\s*([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\s*\]\s*$/
const TERMINATOR_RE = /(?:^|\s)(?:1-0|0-1|1\/2-1\/2|½-½|\*)\s*$/

/**
 * Separa un texto con varias partidas. Tolera encabezados faltantes, líneas en
 * blanco de más y partidas sin el tag [Event] que suele marcar el inicio.
 */
export function splitPgn(text: string): RawGame[] {
  const games: RawGame[] = []
  let headers: Record<string, string> = {}
  let lines: string[] = []
  let braceDepth = 0

  const hasMoves = () => lines.some((l) => l.trim() !== '')
  const flush = () => {
    if (Object.keys(headers).length > 0 || hasMoves()) {
      games.push({ headers, movetext: lines.join('\n').trim() })
    }
    headers = {}
    lines = []
    braceDepth = 0
  }

  for (const line of text.split('\n')) {
    if (braceDepth === 0) {
      if (line.startsWith('%')) continue // línea de escape del estándar PGN
      const tag = TAG_RE.exec(line)
      if (tag) {
        // Un tag después de jugadas, o un tag repetido, empieza otra partida.
        if (hasMoves() || tag[1] in headers) flush()
        headers[tag[1]] = tag[2].replace(/\\(["\\])/g, '$1')
        continue
      }
    }
    lines.push(line)
    for (const ch of line) {
      if (ch === '{') braceDepth++
      else if (ch === '}' && braceDepth > 0) braceDepth--
    }
    if (braceDepth === 0 && TERMINATOR_RE.test(line)) flush()
  }
  flush()
  return games
}
