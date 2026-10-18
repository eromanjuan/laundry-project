import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { useShopId } from '../context/ShopContext'

/**
 * LG account connection profile for the active shop, stored in
 * `shops/{shopId}/settings/lgConnection`.
 *
 * ⚠️ SECURITY NOTE: in production the LG account `password` must NOT live in a
 * browser-readable Firestore doc — it belongs in the Cloud Function that logs
 * into Laundry Crew Manager on the owner's behalf (e.g. an encrypted secret).
 * The security rules restrict this document to the shop's admins/managers.
 */
export interface LgConnection {
  enabled: boolean
  email: string
  password: string
  region: string
  connected: boolean
  connectedAt?: number
}

export const defaultLgConnection: LgConnection = {
  enabled: false,
  email: '',
  password: '',
  region: 'PH',
  connected: false,
}

/** Realtime binding to the shop's LG connection profile with a local fallback. */
export function useLgConnection() {
  const shopId = useShopId()
  const [connection, setConnection] = useState<LgConnection>(defaultLgConnection)

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !shopId) return
    const unsubscribe = onSnapshot(
      doc(db, 'shops', shopId, 'settings', 'lgConnection'),
      (snapshot) => {
        if (snapshot.exists()) setConnection({ ...defaultLgConnection, ...(snapshot.data() as LgConnection) })
      },
      (error) => console.error('[Firestore] listen(settings/lgConnection) failed:', error),
    )
    return unsubscribe
  }, [shopId])

  const save = async (next: LgConnection) => {
    setConnection(next)
    if (isFirebaseConfigured && db && shopId) await setDoc(doc(db, 'shops', shopId, 'settings', 'lgConnection'), next)
  }

  return { connection, save }
}
