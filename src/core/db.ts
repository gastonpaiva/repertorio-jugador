import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PgnFile } from './importGames'

/** Un conjunto de PGN guardado con un nombre (por ejemplo, un torneo). */
export interface Collection {
  id: string
  name: string
  createdAt: number
  files: PgnFile[]
}

interface Schema extends DBSchema {
  collections: { key: string; value: Collection }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | undefined

function db() {
  dbPromise ??= openDB<Schema>('repertorio-jugador', 1, {
    upgrade(database) {
      database.createObjectStore('collections', { keyPath: 'id' })
    },
  })
  return dbPromise
}

export async function listCollections(): Promise<Collection[]> {
  const all = await (await db()).getAll('collections')
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function createCollection(name: string, files: PgnFile[]): Promise<Collection> {
  const collection: Collection = { id: crypto.randomUUID(), name: name.trim(), createdAt: Date.now(), files }
  await (await db()).put('collections', collection)
  return collection
}

export async function updateCollection(collection: Collection): Promise<void> {
  await (await db()).put('collections', collection)
}

export async function deleteCollection(id: string): Promise<void> {
  await (await db()).delete('collections', id)
}
