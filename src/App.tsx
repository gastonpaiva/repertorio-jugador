import { useEffect, useMemo, useState } from 'react'
import { createCollection, deleteCollection, listCollections, updateCollection, type Collection } from './core/db'
import { importGames, type PgnFile } from './core/importGames'
import { collectPlayers } from './core/players'
import { buildTree } from './core/tree'
import type { Color } from './core/types'
import { Explorer } from './ui/Explorer'
import { ImportSummary } from './ui/ImportSummary'
import { Library } from './ui/Library'
import { PlayerPicker } from './ui/PlayerPicker'

function loadPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function savePref(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin almacenamiento local: la preferencia simplemente no se recuerda.
  }
}

export default function App() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeIds, setActiveIds] = useState<Set<string> | null>(null)
  const [playerKey, setPlayerKey] = useState<string | null>(() => loadPref('player', null))
  const [color, setColor] = useState<Color>(() => loadPref('color', 'w'))
  const [maxMoves, setMaxMoves] = useState<number>(() => loadPref('maxMoves', 20))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCollections()
      .then((list) => {
        setCollections(list)
        const stored = loadPref<string[] | null>('activeCollections', null)
        setActiveIds(new Set(stored ?? list.map((c) => c.id)))
      })
      .catch(() => setError('No se pudo abrir el almacenamiento del navegador; las colecciones no se guardarán.'))
  }, [])

  useEffect(() => {
    if (activeIds) savePref('activeCollections', [...activeIds])
  }, [activeIds])
  useEffect(() => savePref('player', playerKey), [playerKey])
  useEffect(() => savePref('color', color), [color])
  useEffect(() => savePref('maxMoves', maxMoves), [maxMoves])

  const active = activeIds ?? new Set<string>()
  const { games, report } = useMemo(
    () => importGames(collections.filter((c) => activeIds?.has(c.id)).flatMap((c) => c.files)),
    [collections, activeIds],
  )
  const players = useMemo(() => collectPlayers(games), [games])
  const player = players.find((p) => p.key === playerKey) ?? null
  const tree = useMemo(
    () => (player ? buildTree(games, player.key, color, maxMoves * 2) : null),
    [games, player, color, maxMoves],
  )

  const toggle = (id: string) =>
    setActiveIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const create = async (name: string, files: PgnFile[]) => {
    const c = await createCollection(name, files)
    setCollections((prev) => [c, ...prev])
    setActiveIds((prev) => new Set([...(prev ?? []), c.id]))
  }

  const update = async (c: Collection) => {
    await updateCollection(c)
    setCollections((prev) => prev.map((x) => (x.id === c.id ? c : x)))
  }

  const remove = async (id: string) => {
    await deleteCollection(id)
    setCollections((prev) => prev.filter((x) => x.id !== id))
    setActiveIds((prev) => new Set([...(prev ?? [])].filter((x) => x !== id)))
  }

  return (
    <div className="app">
      <header>
        <h1>Repertorio de jugador</h1>
        <p className="muted">Árbol de aperturas a partir de PGN de Chess-Results. Todo queda en tu navegador.</p>
      </header>
      {error && <p className="error">{error}</p>}

      <div className="layout">
        <aside>
          <Library
            collections={collections}
            activeIds={active}
            onToggle={toggle}
            onCreate={create}
            onUpdate={update}
            onDelete={remove}
          />
          <ImportSummary report={report} />
          <PlayerPicker players={players} selected={player?.key ?? null} onSelect={setPlayerKey} />
        </aside>

        <main>
          {player && tree ? (
            <>
              <div className="toolbar">
                <h2>{player.name}</h2>
                <div className="tabs" role="tablist">
                  <button type="button" role="tab" aria-selected={color === 'w'} onClick={() => setColor('w')}>
                    Con blancas ({player.asWhite})
                  </button>
                  <button type="button" role="tab" aria-selected={color === 'b'} onClick={() => setColor('b')}>
                    Con negras ({player.asBlack})
                  </button>
                </div>
                <label className="depth">
                  Profundidad
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={maxMoves}
                    onChange={(e) => setMaxMoves(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                  />
                  jugadas
                </label>
              </div>
              <Explorer key={`${player.key}|${color}|${maxMoves}`} tree={tree} color={color} />
            </>
          ) : (
            <div className="empty-state muted">
              {collections.length === 0
                ? 'Empezá subiendo un PGN y guardándolo como colección.'
                : games.length === 0
                  ? 'Activá al menos una colección con partidas.'
                  : 'Elegí un jugador de la lista.'}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
