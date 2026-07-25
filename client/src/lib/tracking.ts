/**
 * Customer order tracking — shared helpers for the public status page.
 *
 * A job number like "#1049" is turned into a URL-safe key ("1049") used both as
 * the `tracking/{key}` Firestore doc id (written by the mirrorOrderStatus Cloud
 * Function) and as the `/track/:id` route the printed QR code points to.
 */

import { doc, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'

/** URL/doc-safe key derived from a business job id (e.g. "#1049" → "1049"). */
export function trackKey(jobId: string): string {
  return String(jobId ?? '').replace(/[^A-Za-z0-9-]/g, '')
}

/** Optional payment fields shown to the customer on the track page. */
export interface TrackingPayment {
  paymentStatus?: string
  balance?: string
}

/**
 * Mirror an order's status into the public `tracking/{key}` doc so a customer can
 * follow their laundry from the QR on their receipt. Writes the job number,
 * status, and (optionally) payment status + outstanding balance so they can see
 * a pending balance — never names or contact details. Merges, so a status-only
 * update preserves previously published payment info, and vice versa.
 * Best-effort: failures are logged, never thrown (they must not block the sale).
 */
export async function publishStatus(jobId: string, status: string, payment?: TrackingPayment): Promise<void> {
  if (!isFirebaseConfigured || !db) return
  const key = trackKey(jobId)
  if (!key) return
  try {
    const data: Record<string, unknown> = { id: jobId, status, updatedAt: Date.now() }
    if (payment?.paymentStatus !== undefined) data.paymentStatus = payment.paymentStatus
    if (payment?.balance !== undefined) data.balance = payment.balance
    await setDoc(doc(db, 'tracking', key), data, { merge: true })
  } catch (error) {
    console.error('[tracking] publishStatus failed:', error)
  }
}

/** Absolute URL a receipt/claim-stub QR should encode. */
export function trackUrl(jobId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/track/${trackKey(jobId)}`
}
