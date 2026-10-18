import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { useShopId } from '../context/ShopContext'

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
 * Tenant-scoped, realtime binding to a Firestore collection.
 *
 * When Firebase is configured every query is filtered to the active shop
 * (`where('shopId','==', shopId)`) and every insert is stamped with that
 * `shopId`. This is what makes the client query *provably* tenant-safe: the
 * security rules reject any query that isn't constrained to the caller's shop.
 * Outside a shop workspace (e.g. the master console) the hook stays empty.
 */
export function useCollection<T extends { id: string }>(name: string, seed: T[]): CollectionApi<T> {
  const shopId = useShopId()
  const [data, setData] = useState<Array<T & WithDocId>>(() => (isFirebaseConfigured ? [] : (seed as Array<T & WithDocId>)))
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured)

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !shopId) {
      if (!isFirebaseConfigured) {
        setData(seed as Array<T & WithDocId>)
        setLoading(false)
      } else {
        setData([])
        setLoading(false)
      }
      return
    }

    setLoading(true)
    const unsubscribe = onSnapshot(
      query(collection(db, name), where('shopId', '==', shopId)),
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
    // `seed` is intentionally excluded — it is a static fallback reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, shopId])

  const add = async (item: T) => {
    if (isFirebaseConfigured && db && shopId) {
      await addDoc(collection(db, name), { ...item, shopId, createdAt: Date.now() })
      return
    }
    setData((previous) => [{ ...item, shopId } as T & WithDocId, ...previous])
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
