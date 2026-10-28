import { useEffect, useMemo, useState } from 'react'
import { createCollection, deleteCollection, listCollections, updateCollection, type Collection } from './core/db'
import { importGames, type PgnFile } from './core/importGames'
import { collectPlayers } from './core/players'
import { buildTree } from './core/tree'
import type { Color } from './core/types'
import { LangSwitch, useT } from './i18n'
import { Explorer } from './ui/Explorer'
import { GuidedImport } from './ui/GuidedImport'
import { ImportSummary } from './ui/ImportSummary'
import { Library } from './ui/Library'
import { LocalUpload } from './ui/LocalUpload'
import { PlayerPicker } from './ui/PlayerPicker'

// Donaciones: link de pago de Mercado Pago (Uruguay, $ 50 UYU) y Ko-fi (PayPal, cualquier país).
const MERCADO_PAGO_URL = 'https://mpago.la/2Q2qiHK'
const KOFI_URL = 'https://ko-fi.com/U7R229LJ5W'

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
  const [storageError, setStorageError] = useState(false)
  const t = useT()

  useEffect(() => {
    listCollections()
      .then((list) => {
        setCollections(list)
        const stored = loadPref<string[] | null>('activeCollections', null)
        setActiveIds(new Set(stored ?? list.map((c) => c.id)))
      })
      .catch(() => setStorageError(true))
  }, [])

  useEffect(() => {
    if (activeIds) savePref('activeCollections', [...activeIds])
  }, [activeIds])
  useEffect(() => {
    document.title = t.app.title
  }, [t])
  useEffect(() => savePref('player', playerKey), [playerKey])
  useEffect(() => savePref('color', color), [color])

  const active = activeIds ?? new Set<string>()
  const { games, report } = useMemo(
    () => importGames(collections.filter((c) => activeIds?.has(c.id)).flatMap((c) => c.files)),
    [collections, activeIds],
  )
  const players = useMemo(() => collectPlayers(games), [games])
  const player = players.find((p) => p.key === playerKey) ?? null
  const tree = useMemo(
    () => (player ? buildTree(games, player.key, color) : null),
    [games, player, color],
  )

  // En pantallas angostas el explorador queda debajo de todo: se lleva la vista hasta él.
  const selectPlayer = (key: string) => {
    setPlayerKey(key)
    if (window.matchMedia('(max-width: 860px)').matches) {
      requestAnimationFrame(() => document.querySelector('main')?.scrollIntoView({ behavior: 'smooth' }))
    }
  }

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
      <header className="app-header">
        <div>
          <h1>{t.app.title}</h1>
          <p className="muted">{t.app.subtitle}</p>
        </div>
        <LangSwitch />
      </header>
      {storageError && <p className="error">{t.app.storageError}</p>}

      <div className="layout">
        <aside>
          <section className="panel">
            <h2>{t.app.addGames}</h2>
            <GuidedImport onCreate={create} onSelectPlayer={selectPlayer} />
            <LocalUpload onCreate={create} />
          </section>
          <Library
            collections={collections}
            activeIds={active}
            onToggle={toggle}
            onUpdate={update}
            onDelete={remove}
          />
          <ImportSummary report={report} />
          <PlayerPicker players={players} selected={player?.key ?? null} onSelect={selectPlayer} />
        </aside>

        <main>
          {player && tree ? (
            <>
              <div className="toolbar">
                <h2>{player.name}</h2>
                <div className="tabs" role="tablist">
                  <button type="button" role="tab" aria-selected={color === 'w'} onClick={() => setColor('w')}>
                    {t.app.withWhite(player.asWhite)}
                  </button>
                  <button type="button" role="tab" aria-selected={color === 'b'} onClick={() => setColor('b')}>
                    {t.app.withBlack(player.asBlack)}
                  </button>
                </div>
              </div>
              <Explorer key={`${player.key}|${color}`} tree={tree} color={color} />
            </>
          ) : (
            <div className="empty-state muted">
              {collections.length === 0
                ? t.app.emptyNoCollections
                : games.length === 0
                  ? t.app.emptyNoGames
                  : t.app.emptyPickPlayer}
            </div>
          )}
        </main>
      </div>

      <footer className="donate">
        <p className="muted small">{t.app.donateText}</p>
        <div className={`donate-links${t.app.kofiFirst ? ' reverse' : ''}`}>
          <a className="button" href={MERCADO_PAGO_URL} target="_blank" rel="noopener noreferrer">
            {t.app.donateMercadoPago}
          </a>
          <a className="button kofi" href={KOFI_URL} target="_blank" rel="noopener noreferrer">
            {t.app.donateKofi}
          </a>
        </div>
        <p className="muted small credit">
          <a href="https://github.com/official-stockfish/Stockfish" target="_blank" rel="noopener noreferrer">
            {t.engine.credit}
          </a>{' '}
          ·{' '}
          <a href="https://github.com/gastonpaiva/repertorio-jugador" target="_blank" rel="noopener noreferrer">
            {t.engine.source}
          </a>
        </p>
      </footer>
    </div>
  )
}
