import { decodePgnBytes } from '../core/decode'
import type { PgnFile } from '../core/importGames'

export async function readFiles(list: FileList | null): Promise<PgnFile[]> {
  if (!list) return []
  return Promise.all(
    [...list].map(async (f) => ({ name: f.name, text: decodePgnBytes(await f.arrayBuffer()) })),
  )
}
