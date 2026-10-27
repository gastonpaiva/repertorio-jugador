import { useRef } from 'react'
import type { PgnFile } from '../core/importGames'
import { useT } from '../i18n'
import { readFiles } from './readFiles'

export function LocalUpload({ onCreate }: { onCreate: (name: string, files: PgnFile[]) => Promise<void> }) {
  const t = useT()
  const fileInput = useRef<HTMLInputElement>(null)

  const load = async (list: FileList | null) => {
    const files = await readFiles(list)
    if (fileInput.current) fileInput.current.value = ''
    if (files.length === 0) return
    // La colección se llama como el archivo; si son varios, como el primero.
    const first = files[0].name.replace(/\.pgn$/i, '')
    await onCreate(files.length > 1 ? t.local.andMore(first, files.length - 1) : first, files)
  }

  return (
    <div className="source">
      <h3>{t.local.title}</h3>
      <p className="muted small">{t.local.description}</p>
      <button type="button" onClick={() => fileInput.current?.click()}>
        {t.local.pick}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".pgn,text/plain"
        multiple
        hidden
        onChange={(e) => load(e.target.files)}
      />
    </div>
  )
}
