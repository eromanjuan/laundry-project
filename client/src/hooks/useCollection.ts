import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'

/** Firestore's own document id, attached alongside the record's business `id`. */
export interface WithDocId {
  _docId?: string
}

export interface CollectionApi<T> {
  data: Array<T & WithDocId>
  loading: boolean
  /** Insert a new record. Uses Firestore when configured, local state otherwise. */
  add: (item: T) => Promise<void>
  /** Patch an existing record (matched by business `id` / `_docId`). */
  update: (row: T & WithDocId, changes: Partial<T>) => Promise<void>
  /** Delete a record. */
  remove: (row: T & WithDocId) => Promise<void>
}

/**
 * Realtime binding to a Firestore collection with a local-state fallback.
 *
 * When Firebase is configured, `data` streams live via `onSnapshot` and every
 * mutation is written to Firestore. When it is not configured, the same API
 * operates on in-memory seed data, so the UI behaves identically either way.
 */
export function useCollection<T extends { id: string }>(name: string, seed: T[]): CollectionApi<T> {
  // When connected to Firestore, start EMPTY and wait for the live snapshot — do
  // not flash the sample seed data. The seed is only a fallback for local dev
  // (Firebase not configured).
  const [data, setData] = useState<Array<T & WithDocId>>(() => (isFirebaseConfigured ? [] : (seed as Array<T & WithDocId>)))
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured)

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return

    const unsubscribe = onSnapshot(
      collection(db, name),
      (snapshot) => {
        const rows = snapshot.docs.map((entry) => ({
          ...(entry.data() as T),
          _docId: entry.id,
        }))
        rows.sort(
          (a, b) =>
            Number((b as Record<string, unknown>).createdAt ?? 0) -
            Number((a as Record<string, unknown>).createdAt ?? 0),
        )
        setData(rows)
        setLoading(false)
      },
      (error) => {
        console.error(`[Firestore] listen(${name}) failed:`, error)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [name])

  const add = async (item: T) => {
    if (isFirebaseConfigured && db) {
      await addDoc(collection(db, name), { ...item, createdAt: Date.now() })
      return
    }
    setData((previous) => [{ ...item } as T & WithDocId, ...previous])
  }

  const update = async (row: T & WithDocId, changes: Partial<T>) => {
    if (isFirebaseConfigured && db && row._docId) {
      await updateDoc(doc(db, name, row._docId), changes as Record<string, unknown>)
      return
    }
    setData((previous) => previous.map((entry) => (entry.id === row.id ? { ...entry, ...changes } : entry)))
  }

  const remove = async (row: T & WithDocId) => {
    if (isFirebaseConfigured && db && row._docId) {
      await deleteDoc(doc(db, name, row._docId))
      return
    }
    setData((previous) => previous.filter((entry) => entry.id !== row.id))
  }

  return { data, loading, add, update, remove }
}
