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

/**
 * Mirror an order's status into the public, PII-free `tracking/{key}` doc so a
 * customer can follow their laundry from the QR on their receipt. Only the job
 * number + status are written — never names, amounts, or contact details.
 * Best-effort: failures are logged, never thrown (they must not block the sale).
 */
export async function publishStatus(jobId: string, status: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return
  const key = trackKey(jobId)
  if (!key) return
  try {
    await setDoc(doc(db, 'tracking', key), { id: jobId, status, updatedAt: Date.now() }, { merge: true })
  } catch (error) {
    console.error('[tracking] publishStatus failed:', error)
  }
}

/** Absolute URL a receipt/claim-stub QR should encode. */
export function trackUrl(jobId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/track/${trackKey(jobId)}`
}
