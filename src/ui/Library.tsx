import { useRef, useState } from 'react'
import { decodePgnBytes } from '../core/decode'
import type { Collection } from '../core/db'
import type { PgnFile } from '../core/importGames'

async function readFiles(list: FileList | null): Promise<PgnFile[]> {
  if (!list) return []
  return Promise.all(
    [...list].map(async (f) => ({ name: f.name, text: decodePgnBytes(await f.arrayBuffer()) })),
  )
}

interface Props {
  collections: Collection[]
  activeIds: Set<string>
  onToggle: (id: string) => void
  onCreate: (name: string, files: PgnFile[]) => Promise<void>
  onUpdate: (c: Collection) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function Library({ collections, activeIds, onToggle, onCreate, onUpdate, onDelete }: Props) {
  const [pending, setPending] = useState<PgnFile[]>([])
  const [name, setName] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const pick = async (list: FileList | null) => {
    const files = await readFiles(list)
    setPending(files)
    if (files.length > 0 && name.trim() === '') setName(files[0].name.replace(/\.pgn$/i, ''))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pending.length === 0 || name.trim() === '') return
    await onCreate(name, pending)
    setPending([])
    setName('')
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <section className="panel">
      <h2>Colecciones</h2>
      <form className="upload" onSubmit={save}>
        <input ref={fileInput} type="file" accept=".pgn,text/plain" multiple onChange={(e) => pick(e.target.files)} />
        <input
          type="text"
          placeholder="Nombre de la colección"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" disabled={pending.length === 0 || name.trim() === ''}>
          Cargar {pending.length > 0 && `(${pending.length} archivo${pending.length > 1 ? 's' : ''})`}
        </button>
      </form>

      {collections.length === 0 ? (
        <p className="muted">Todavía no hay colecciones. Subí uno o más PGN de Chess-Results y ponele un nombre.</p>
      ) : (
        <ul className="collections">
          {collections.map((c) => (
            <CollectionRow
              key={c.id}
              collection={c}
              active={activeIds.has(c.id)}
              onToggle={() => onToggle(c.id)}
              onUpdate={onUpdate}
              onDelete={() => onDelete(c.id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function CollectionRow({
  collection,
  active,
  onToggle,
  onUpdate,
  onDelete,
}: {
  collection: Collection
  active: boolean
  onToggle: () => void
  onUpdate: (c: Collection) => Promise<void>
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(collection.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const addInput = useRef<HTMLInputElement>(null)

  const rename = async () => {
    setEditing(false)
    if (draft.trim() !== '' && draft.trim() !== collection.name) await onUpdate({ ...collection, name: draft.trim() })
    else setDraft(collection.name)
  }

  const addFiles = async (list: FileList | null) => {
    const files = await readFiles(list)
    if (files.length > 0) await onUpdate({ ...collection, files: [...collection.files, ...files] })
    if (addInput.current) addInput.current.value = ''
  }

  return (
    <li className={active ? 'active' : ''}>
      <label className="collection-main">
        <input type="checkbox" checked={active} onChange={onToggle} />
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={rename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') rename()
              if (e.key === 'Escape') {
                setDraft(collection.name)
                setEditing(false)
              }
            }}
          />
        ) : (
          <span className="collection-name">{collection.name}</span>
        )}
      </label>
      <div className="collection-meta muted" title={collection.files.map((f) => f.name).join('\n')}>
        {collection.files.length} archivo{collection.files.length !== 1 && 's'} ·{' '}
        {new Date(collection.createdAt).toLocaleDateString('es')}
      </div>
      <div className="collection-actions">
        <button type="button" className="link" onClick={() => setEditing(true)}>
          Renombrar
        </button>
        <button type="button" className="link" onClick={() => addInput.current?.click()}>
          Agregar PGN
        </button>
        <input ref={addInput} type="file" accept=".pgn,text/plain" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        {confirmDelete ? (
          <>
            <button type="button" className="link danger" onClick={onDelete}>
              Confirmar
            </button>
            <button type="button" className="link" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <button type="button" className="link danger" onClick={() => setConfirmDelete(true)}>
            Eliminar
          </button>
        )}
      </div>
    </li>
  )
}
