/**
 * Web Push subscription for the public order-tracking page.
 *
 * A customer who taps "Notify me" is subscribed to background push. The
 * subscription is stored in `pushSubs/{id}` and a scheduled GitHub Action
 * (see push-sync/) sends a push whenever the order's tracked status changes —
 * so the notification arrives even if the browser tab is closed.
 *
 * The VAPID PUBLIC key below is safe to ship in the client; the matching private
 * key lives only in the GitHub Action's secrets.
 */
import { doc, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { trackKey } from './tracking'

export const VAPID_PUBLIC_KEY = 'BF4WUFNsNc_36FuKWyyEEurk7D9GGTYlzurTsPBwtO0GnHJkH0oixX7HSWKcIpBXkK824nVGHvp0HM2mb86wTUo'

/** True where this browser can do background Web Push. */
export const pushSupported =
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

/** Stable doc id per (device endpoint + tracked job) so multiple orders coexist. */
async function subscriptionId(endpoint: string, jobKey: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${endpoint}|${jobKey}`))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Subscribe this device to background push for a job's status changes.
 * `currentStatus` seeds the record so the customer isn't re-notified of the
 * status they can already see. Returns true when stored successfully.
 */
export async function subscribeToPush(jobId: string, currentStatus: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !pushSupported) return false
  try {
    const registration = await navigator.serviceWorker.ready
    let sub = await registration.pushManager.getSubscription()
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    const json = sub.toJSON()
    const jobKey = trackKey(jobId)
    const id = await subscriptionId(sub.endpoint, jobKey)
    await setDoc(
      doc(db, 'pushSubs', id),
      {
        jobKey,
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
        lastStatus: currentStatus,
        updatedAt: Date.now(),
      },
      { merge: true },
    )
    return true
  } catch (error) {
    console.error('[push] subscribe failed:', error)
    return false
  }
}
