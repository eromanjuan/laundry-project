import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import type { UserRecord } from '../data/seeds'
import type { WithDocId } from './useCollection'
import { useResetOnChange } from './useResetOnChange'

/**
 * Realtime staff list for an explicit shop id.
 *
 * Shop owners already receive their staff through `useAuth().users`, but the
 * platform master is not a member of any shop and must load a shop's staff on
 * demand (e.g. from the User Management page while inspecting a shop).
 */
export function useShopStaff(shopId: string, enabled: boolean) {
  const [staff, setStaff] = useState<Array<UserRecord & WithDocId>>([])
  const [loading, setLoading] = useState(enabled && isFirebaseConfigured)
  const live = Boolean(enabled && isFirebaseConfigured && db && shopId)

  // Switching shop (or turning the panel off) clears the previous list rather
  // than showing it under the new shop's heading.
  useResetOnChange(`${shopId}|${live ? 'live' : 'off'}`, () => {
    setStaff([])
    setLoading(live)
  })

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured || !db || !shopId) return
    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), where('shopId', '==', shopId)),
      (snapshot) => {
        setStaff(snapshot.docs.map((entry) => ({ ...(entry.data() as UserRecord), _docId: entry.id })))
        setLoading(false)
      },
      (error) => {
        console.error('[Auth] shop staff listen failed:', error)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [shopId, enabled])

  return { staff, loading }
}
