import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions, isFirebaseConfigured } from '../lib/firebase'
import { useShopId } from '../context/ShopContext'

/** Washer or dryer availability counts for one store (from LG's /status). */
export interface LgMachineCounts {
  total: number
  usage: number
  standby: number
  error: number
  offline: number
}

export interface LgStore {
  storeId: string
  storeName: string
  washer: LgMachineCounts
  dryer: LgMachineCounts
}

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
  cycles: number
}

export interface LgStatusDoc {
  stores: LgStore[]
  machines?: LgMachine[]
  syncedAt?: number
  error?: string | null
}

/** Live per-store machine availability for the active shop. */
export function useLgStatus() {
  const shopId = useShopId()
  const [status, setStatus] = useState<LgStatusDoc>({ stores: [] })

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !shopId) {
      setStatus({ stores: [] })
      return
    }
    const unsubscribe = onSnapshot(
      doc(db, 'shops', shopId, 'settings', 'lgStatus'),
      (snapshot) => {
        if (snapshot.exists()) setStatus(snapshot.data() as LgStatusDoc)
      },
      (error) => console.error('[Firestore] listen(settings/lgStatus) failed:', error),
    )
    return unsubscribe
  }, [shopId])

  return status
}

/**
 * Trigger an immediate LG sign-in + sync on the backend. Requires a trusted
 * backend (Cloud Functions / Blaze plan); on the Spark plan this reports that
 * the backend is unavailable rather than failing silently.
 */
export async function syncLgNow(): Promise<LgStore[]> {
  if (!functions) throw new Error('Backend not configured.')
  const call = httpsCallable<unknown, { ok: boolean; stores: LgStore[] }>(functions, 'syncLgNow')
  const res = await call({})
  return res.data.stores || []
}
