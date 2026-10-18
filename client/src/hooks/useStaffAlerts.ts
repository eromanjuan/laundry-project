import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { useShopId } from '../context/ShopContext'
import { useAuth } from '../context/AuthContext'
import type { WithDocId } from './useCollection'
import { useResetOnChange } from './useResetOnChange'

/** What an alert is about. */
export type StaffAlertKind = 'timer-done' | 'order-change'

export interface StaffAlert {
  /** Business id (also the document id). */
  id: string
  kind: StaffAlertKind
  title: string
  body: string
  /** Order the alert refers to, when it is about one. */
  orderId?: string
  customer?: string
  stage?: string
  /** uids that have seen it — read state is per person, not per shop. */
  acknowledgedBy?: string[]
  /** uid of the staff member who caused it; absent for sync-job alerts. */
  createdBy?: string
}

export type StaffAlertDoc = StaffAlert & WithDocId & { createdAt?: number }

/** How the bell should colour an alert. */
export const alertAccent: Record<StaffAlertKind, string> = {
  'timer-done': 'bg-amber-100 text-amber-700',
  'order-change': 'bg-blue-100 text-blue-700',
}

let sequence = 0
/** Unique-ish doc id: a timestamp plus a per-tab counter and some randomness. */
function alertId(): string {
  sequence += 1
  return `al_${Date.now().toString(36)}_${sequence.toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Shop-wide staff notifications ("the wash on #1031 is done", "#1031 moved to
 * Drying"), delivered live to every member of the shop.
 *
 * One document per alert is shared by the whole shop rather than fanned out per
 * user — every member needs to see the same event, and a per-user copy would
 * multiply writes on the Spark plan's free quota. Read state is tracked in
 * `acknowledgedBy`, so the bell's unread count is personal while the alert
 * itself stays a single shared record.
 *
 * Alerts can also be written by the push-sync GitHub Action (via the Admin SDK,
 * which bypasses these rules) so an expired cycle still alerts a closed shop.
 */
export function useStaffAlerts() {
  const shopId = useShopId()
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const [alerts, setAlerts] = useState<StaffAlertDoc[]>([])

  // Never show the previous shop's alerts under the new shop's name.
  useResetOnChange(shopId ?? '', () => setAlerts([]))

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !shopId) return
    const unsubscribe = onSnapshot(
      query(collection(db, 'staffAlerts'), where('shopId', '==', shopId)),
      (snapshot) => {
        const rows: StaffAlertDoc[] = snapshot.docs.map((entry) => ({
          ...(entry.data() as StaffAlert),
          _docId: entry.id,
        }))
        // Newest first, matching the rest of the app's collections.
        rows.sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))
        setAlerts(rows)
      },
      (error) => console.error('[Firestore] listen(staffAlerts) failed:', error),
    )
    return unsubscribe
  }, [shopId])

  /** Raise an alert for everyone in the shop. Best-effort: never throws. */
  const notify = useCallback(
    async (input: Omit<StaffAlert, 'id' | 'acknowledgedBy'> & { id?: string }) => {
      if (!isFirebaseConfigured || !db || !shopId) return
      try {
        const id = input.id ?? alertId()
        await setDoc(doc(db, 'staffAlerts', id), {
          ...input,
          id,
          shopId,
          acknowledgedBy: [],
          createdAt: Date.now(),
        })
      } catch (error) {
        // An alert is an aid, not the source of truth for the workflow — a
        // failure here must never block the order change that triggered it.
        console.error('[staffAlerts] notify failed:', error)
      }
    },
    [shopId],
  )

  /** Mark one alert as seen by the signed-in user. */
  const acknowledge = useCallback(
    async (alert: StaffAlertDoc) => {
      if (!db || !alert._docId || !uid) return
      if ((alert.acknowledgedBy ?? []).includes(uid)) return
      try {
        await updateDoc(doc(db, 'staffAlerts', alert._docId), { acknowledgedBy: arrayUnion(uid) })
      } catch (error) {
        console.error('[staffAlerts] acknowledge failed:', error)
      }
    },
    [uid],
  )

  /** Mark every visible alert as seen by the signed-in user. */
  const acknowledgeAll = useCallback(async () => {
    if (!db || !uid) return
    const unseen = alerts.filter((alert) => !(alert.acknowledgedBy ?? []).includes(uid))
    await Promise.all(unseen.map((alert) => acknowledge(alert)))
  }, [alerts, acknowledge, uid])

  /** Remove an alert from the shop's list (managers only — see firestore.rules). */
  const dismiss = useCallback(async (alert: StaffAlertDoc) => {
    if (!db || !alert._docId) return
    try {
      await deleteDoc(doc(db, 'staffAlerts', alert._docId))
    } catch (error) {
      console.error('[staffAlerts] dismiss failed:', error)
    }
  }, [])

  const unread = useMemo(
    () => (uid ? alerts.filter((alert) => !(alert.acknowledgedBy ?? []).includes(uid)) : alerts),
    [alerts, uid],
  )

  return { alerts, unread, unreadCount: unread.length, notify, acknowledge, acknowledgeAll, dismiss }
}