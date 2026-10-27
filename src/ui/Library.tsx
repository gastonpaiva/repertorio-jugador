import { useRef, useState } from 'react'
import type { Collection } from '../core/db'
import { useT } from '../i18n'
import { readFiles } from './readFiles'

interface Props {
  collections: Collection[]
  activeIds: Set<string>
  onToggle: (id: string) => void
  onUpdate: (c: Collection) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function Library({ collections, activeIds, onToggle, onUpdate, onDelete }: Props) {
  const t = useT()
  return (
    <section className="panel">
      <h2>{t.library.title}</h2>
      {collections.length === 0 ? (
        <p className="muted">{t.library.empty}</p>
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
  const t = useT()
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
        {t.library.files(collection.files.length)} ·{' '}
        {new Date(collection.createdAt).toLocaleDateString(t.locale)}
      </div>
      <div className="collection-actions">
        <button type="button" className="link" onClick={() => setEditing(true)}>
          {t.library.rename}
        </button>
        <button type="button" className="link" onClick={() => addInput.current?.click()}>
          {t.library.addPgn}
        </button>
        <input ref={addInput} type="file" accept=".pgn,text/plain" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        {confirmDelete ? (
          <>
            <button type="button" className="link danger" onClick={onDelete}>
              {t.library.confirm}
            </button>
            <button type="button" className="link" onClick={() => setConfirmDelete(false)}>
              {t.library.cancel}
            </button>
          </>
        ) : (
          <button type="button" className="link danger" onClick={() => setConfirmDelete(true)}>
            {t.library.delete}
          </button>
        )}
      </div>
    </li>
  )
}
