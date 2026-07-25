/**
 * Background push sender for customer order tracking (GitHub Actions / any Node cron).
 *
 * Runs on a schedule, compares each stored push subscription's last-notified
 * status against the order's current tracked status, and sends a Web Push when
 * it changed — so customers get a notification even with the browser closed.
 * No Firebase Blaze plan required: it talks to Firestore via a service account
 * and sends pushes directly with the VAPID keys.
 *
 * Firestore docs used:
 *   tracking/{jobKey}   { id, status, updatedAt }         (written by the POS app)
 *   pushSubs/{id}       { jobKey, endpoint, keys, lastStatus, updatedAt }
 *
 * Env:
 *   FIREBASE_SERVICE_ACCOUNT  JSON service-account key (same secret as lg-sync)
 *   VAPID_PUBLIC_KEY          VAPID public key  (matches client)
 *   VAPID_PRIVATE_KEY         VAPID private key (secret)
 *   VAPID_SUBJECT             e.g. "mailto:you@example.com"
 *   SITE_URL                  e.g. "https://laundry-project-pos.web.app"
 */

const admin = require('firebase-admin')
const webpush = require('web-push')

const SITE_URL = process.env.SITE_URL || 'https://laundry-project-pos.web.app'

function initAdmin() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set.')
  let creds
  try {
    creds = JSON.parse(raw)
  } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.')
  }
  admin.initializeApp({ credential: admin.credential.cert(creds) })
  return admin.firestore()
}

/** Friendly notification body per stage. */
function friendly(status) {
  const map = {
    Pending: 'Received — we have your laundry.',
    Received: 'Received — we have your laundry.',
    Washing: 'Your laundry is now in the wash.',
    Drying: 'Your laundry is now drying.',
    Ready: 'Ready for pickup! Your laundry is done.',
    Claimed: 'Picked up — thank you!',
  }
  return map[status] || `Status: ${status}`
}

async function run() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@laundry-project-pos.web.app'
  if (!publicKey || !privateKey) throw new Error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set.')
  webpush.setVapidDetails(subject, publicKey, privateKey)

  const db = initAdmin()
  const subs = await db.collection('pushSubs').get()
  if (subs.empty) {
    console.log('No push subscriptions — nothing to do.')
    return
  }

  // Cache tracking status per jobKey so we read each order at most once.
  const statusCache = new Map()
  async function statusFor(jobKey) {
    if (statusCache.has(jobKey)) return statusCache.get(jobKey)
    const snap = await db.doc(`tracking/${jobKey}`).get()
    const status = snap.exists ? snap.data().status || null : null
    statusCache.set(jobKey, status)
    return status
  }

  let sent = 0
  let pruned = 0
  for (const docSnap of subs.docs) {
    const sub = docSnap.data()
    if (!sub.jobKey || !sub.endpoint || !sub.keys) continue

    const status = await statusFor(sub.jobKey)
    if (!status || status === sub.lastStatus) continue

    const payload = JSON.stringify({
      id: sub.jobKey,
      status,
      body: friendly(status),
      url: `${SITE_URL}/track/${sub.jobKey}`,
    })
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
      await docSnap.ref.update({ lastStatus: status, updatedAt: Date.now() })
      sent += 1
    } catch (e) {
      const code = e.statusCode
      // 404/410 mean the subscription is gone — remove it.
      if (code === 404 || code === 410) {
        await docSnap.ref.delete()
        pruned += 1
      } else {
        console.warn(`push failed for ${sub.jobKey} (${code || '?'}):`, e.body || e.message)
      }
    }
  }

  console.log(`Push run done — ${subs.size} sub(s), sent ${sent}, pruned ${pruned}.`)
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('push-sync failed:', e.message)
    process.exit(1)
  })
