/**
 * Customer order tracking — shared helpers for the public status page.
 *
 * A job number like "#1049" is turned into a URL-safe key ("1049"). Tracking
 * documents are namespaced by shop (`${shopId}_${key}`) so two shops can reuse
 * the same job numbers without colliding, and the security rules can keep each
 * shop's writes on its own documents.
 */

import { doc, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { getActiveShopId } from './activeShop'

/** URL/doc-safe key derived from a business job id (e.g. "#1049" → "1049"). */
export function trackKey(jobId: string): string {
  return String(jobId ?? '').replace(/[^A-Za-z0-9-]/g, '')
}

/** Namespaced tracking document id (`${shopId}_${key}`). */
export function trackDocId(jobId: string, shopId: string = getActiveShopId()): string {
  const key = trackKey(jobId)
  return shopId ? `${shopId}_${key}` : key
}

/** Optional payment fields shown to the customer on the track page. */
export interface TrackingPayment {
  paymentStatus?: string
  balance?: string
  /** A message from the store to the customer (e.g. a declined GCash payment). */
  note?: string
}

/**
 * Mirror an order's status into the public `tracking/{shopId}_{key}` doc so a
 * customer can follow their laundry from the QR on their receipt. Writes only
 * the job number, status and (optionally) payment status — never names or
 * contact details. Best-effort: failures are logged, never thrown.
 */
export async function publishStatus(
  jobId: string,
  status: string,
  payment?: TrackingPayment,
  shopId: string = getActiveShopId(),
): Promise<void> {
  if (!isFirebaseConfigured || !db) return
  const key = trackKey(jobId)
  if (!key || !shopId) return
  try {
    const data: Record<string, unknown> = { shopId, key, id: jobId, status, updatedAt: Date.now() }
    if (payment?.paymentStatus !== undefined) data.paymentStatus = payment.paymentStatus
    if (payment?.balance !== undefined) data.balance = payment.balance
    if (payment?.note !== undefined) data.paymentNote = payment.note
    await setDoc(doc(db, 'tracking', `${shopId}_${key}`), data, { merge: true })
  } catch (error) {
    console.error('[tracking] publishStatus failed:', error)
  }
}

/** Absolute URL a receipt/claim-stub QR should encode. */
export function trackUrl(jobId: string, shopId: string = getActiveShopId()): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const key = trackKey(jobId)
  return shopId ? `${origin}/track/${shopId}/${key}` : `${origin}/track/${key}`
}
