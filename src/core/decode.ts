/**
 * Chess-Results suele exportar los PGN en Windows-1252, no en UTF-8.
 * Intentamos UTF-8 estricto y, si hay bytes inválidos, caemos a Windows-1252.
 */
export function decodePgnBytes(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes)
  }
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
}
