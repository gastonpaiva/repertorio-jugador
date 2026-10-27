import { useRef, useState } from 'react'
import { importGames, type PgnFile } from '../core/importGames'
import { findSearchedPlayer } from '../core/players'
import { useT } from '../i18n'
import { readFiles } from './readFiles'

const searchUrl = (lan: number) => `https://chess-results.com/PartieSuche.aspx?lan=${lan}`

interface Props {
  onCreate: (name: string, files: PgnFile[]) => Promise<void>
  onSelectPlayer: (key: string) => void
}

type Message = { kind: 'empty' } | { kind: 'loaded'; name: string; games: number }

/**
 * Importación en dos pasos: el usuario descarga él mismo el PGN desde la
 * búsqueda de partidas de Chess-Results y la app lo carga como colección.
 */
export function GuidedImport({ onCreate, onSelectPlayer }: Props) {
  const t = useT()
  const [message, setMessage] = useState<Message | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = async (list: FileList | null) => {
    const files = await readFiles(list)
    if (fileInput.current) fileInput.current.value = ''
    if (files.length === 0) return
    const { games } = importGames(files)
    if (games.length === 0) {
      setMessage({ kind: 'empty' })
      return
    }
    const player = findSearchedPlayer(games)
    const name = player?.name ?? files[0].name.replace(/\.pgn$/i, '')
    await onCreate(name, files)
    if (player) onSelectPlayer(player.key)
    setMessage({ kind: 'loaded', name, games: games.length })
  }

  return (
    <div
      className={`source guided${dragging ? ' dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        load(e.dataTransfer.files)
      }}
    >
      <h3>{t.guided.title}</h3>
      <ol className="steps">
        <li>
          <a className="button" href={searchUrl(t.chessResultsLan)} target="_blank" rel="noopener noreferrer">
            {t.guided.open}
          </a>
          <p className="muted small">{t.guided.instructions}</p>
        </li>
        <li>
          <button type="button" onClick={() => fileInput.current?.click()}>
            {t.guided.pickDownloaded}
          </button>
          <p className="muted small">{t.guided.dropHint}</p>
          <input
            ref={fileInput}
            type="file"
            accept=".pgn,text/plain"
            multiple
            hidden
            onChange={(e) => load(e.target.files)}
          />
        </li>
      </ol>
      {message?.kind === 'empty' && <p className="error small">{t.guided.noGames}</p>}
      {message?.kind === 'loaded' && <p className="muted small">{t.guided.loaded(message.name, message.games)}</p>}
    </div>
  )
}
