import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions, isFirebaseConfigured } from '../lib/firebase'

/** Washer or dryer availability counts for one store (from LG's /status). */
export interface LgMachineCounts {
  total: number
  usage: number // in use / running
  standby: number // free / ready
  error: number
  offline: number
}

export interface LgStore {
  storeId: string
  storeName: string
  washer: LgMachineCounts
  dryer: LgMachineCounts
}

/** One physical machine's live state (from LG's per-device data). */
export interface LgMachine {
  deviceId: string
  storeId: string
  storeName: string
  name: string
  type: 'Washer' | 'Dryer'
  status: 'In Use' | 'Standby' | 'Offline' | 'Error'
  course: string
  remainingMin: number
  online: boolean
  /** Lifetime cycle count shown on the LG card. */
  cycles: number
}

export interface LgStatusDoc {
  stores: LgStore[]
  machines?: LgMachine[]
  syncedAt?: number
  error?: string | null
}

/** Live per-store machine availability, written by the syncLg Cloud Function. */
export function useLgStatus() {
  const [status, setStatus] = useState<LgStatusDoc>({ stores: [] })

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'lgStatus'),
      (snapshot) => {
        if (snapshot.exists()) setStatus(snapshot.data() as LgStatusDoc)
      },
      (error) => console.error('[Firestore] listen(settings/lgStatus) failed:', error),
    )
    return unsubscribe
  }, [])

  return status
}

/**
 * Trigger an immediate LG sign-in + sync on the backend (also validates the
 * credentials the admin just entered). Returns the fresh store list.
 */
export async function syncLgNow(): Promise<LgStore[]> {
  if (!functions) throw new Error('Backend not configured.')
  const call = httpsCallable<unknown, { ok: boolean; stores: LgStore[] }>(functions, 'syncLgNow')
  const res = await call({})
  return res.data.stores || []
}
