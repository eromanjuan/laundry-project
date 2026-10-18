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
 *   tracking/{shopId}_{jobKey}  { id, shopId, status, updatedAt }  (written by the POS app)
 *   pushSubs/{id}               { shopId, jobKey, endpoint, keys, lastStatus, updatedAt }
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

/** Body for a cycle timer that has just run out. */
function timerBody(stage) {
  return stage === 'Washing'
    ? 'Your wash is done — we are moving your laundry on.'
    : 'Your laundry is dry — almost ready for pickup.'
}

/** `${shopId}_${jobKey}` tracking key, matching the client's trackKey(). */
function jobKeyOf(jobId) {
  return String(jobId ?? '').replace(/[^A-Za-z0-9-]/g, '')
}

/**
 * Fire an alert for every wash/dry cycle whose timer has run out.
 *
 * This is the half of the timer feature that has to work with the shop closed:
 * the POS app can only raise an alert while somebody has it open, so the sweep
 * is what makes an expired cycle actually notify staff and the customer.
 *
 * It deliberately does NOT advance the order. A timer is a reminder set by a
 * person, not proof that the physical cycle finished, so the order stays put
 * and a staff member moves it on.
 *
 * Each fired timer is stamped with `*TimerNotifiedAt`, so a cycle alerts once
 * however often this runs. Runs on the schedule in .github/workflows, so a
 * notification lands within one cron interval of the timer expiring.
 */
async function sweepTimers(db, subsByJobKey) {
  const now = Date.now()
  // Only cycles that are actually running can expire. A single-field `in`
  // query, so no composite index is needed.
  const snap = await db.collection('orders').where('status', 'in', ['Washing', 'Drying']).get()

  let fired = 0
  for (const orderDoc of snap.docs) {
    const order = orderDoc.data()
    const stage = order.status === 'Washing' ? 'Washing' : 'Drying'
    const prefix = stage === 'Washing' ? 'wash' : 'dry'
    const endsAt = Number(order[`${prefix}TimerEndsAt`])
    const notifiedAt = Number(order[`${prefix}TimerNotifiedAt`])
    if (!Number.isFinite(endsAt) || endsAt <= 0) continue
    if (endsAt > now) continue
    if (Number.isFinite(notifiedAt) && notifiedAt > 0) continue

    const shopId = order.shopId || ''
    const jobId = order.id || ''
    const jobKey = jobKeyOf(jobId)
    const minutes = Number(order[`${prefix}TimerMinutes`]) || 0
    const lateMins = Math.max(0, Math.round((now - endsAt) / 60000))

    // 1. Staff alert — one shared document per shop, so every member sees it.
    // The id is deterministic, so a retried run cannot duplicate the alert.
    if (shopId && jobId) {
      const alertId = `${shopId}_${jobKey}_${prefix}_${endsAt}`
      await db.collection('staffAlerts').doc(alertId).set(
        {
          id: alertId,
          shopId,
          kind: 'timer-done',
          title: `${jobId} — ${stage} time is up`,
          body: `${order.customer || 'Customer'} • ${stage.toLowerCase()} timer of ${minutes} min finished${lateMins > 1 ? ` (${lateMins} min ago)` : ''}. Move it on when ready.`,
          orderId: jobId,
          customer: order.customer || '',
          stage,
          acknowledgedBy: [],
          createdAt: now,
        },
        { merge: true },
      )
    }

    // 2. Customer push, to every device watching this order.
    for (const sub of subsByJobKey.get(`${shopId}_${jobKey}`) || []) {
      if (!sub.endpoint || !sub.keys) continue
      const url = shopId ? `${SITE_URL}/track/${shopId}/${jobKey}` : `${SITE_URL}/track/${jobKey}`
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ id: `${shopId}_${jobKey}`, status: order.status, body: timerBody(stage), url }),
        )
      } catch (e) {
        const code = e.statusCode
        if (code === 404 || code === 410 || code === 401 || code === 403) {
          await sub.ref.delete().catch(() => {})
          console.warn(`removed dead subscription for ${sub.jobKey} (${code})`)
        } else {
          console.warn(`timer push failed for ${sub.jobKey} (${code || '?'}):`, e.body || e.message)
        }
      }
    }

    // 3. Mark it alerted so this only ever fires once per cycle.
    await orderDoc.ref.update({ [`${prefix}TimerNotifiedAt`]: now })
    fired += 1
  }

  if (fired > 0) console.log(`Cycle timers: ${fired} finished cycle(s) alerted.`)
  return fired
}

async function run() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@laundry-project-pos.web.app'
  if (!publicKey || !privateKey) throw new Error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set.')
  webpush.setVapidDetails(subject, publicKey, privateKey)

  const db = initAdmin()
  const subs = await db.collection('pushSubs').get()

  // Index subscriptions by tracking key so the timer sweep can reach the right
  // customers without a second query.
  const subsByJobKey = new Map()
  for (const docSnap of subs.docs) {
    const sub = docSnap.data()
    if (!sub.jobKey) continue
    const list = subsByJobKey.get(sub.jobKey) || []
    list.push({ ...sub, ref: docSnap.ref })
    subsByJobKey.set(sub.jobKey, list)
  }

  // Always sweep timers, even with no subscribers — the staff alert matters.
  await sweepTimers(db, subsByJobKey)

  if (subs.empty) {
    console.log('No push subscriptions — status pushes skipped.')
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

    // jobKey is `${shopId}_${jobKey}`; link straight to the namespaced tracker.
    const shopId = sub.shopId || (sub.jobKey.includes('_') ? sub.jobKey.split('_')[0] : '')
    const jobKeyPart = shopId && sub.jobKey.startsWith(`${shopId}_`) ? sub.jobKey.slice(shopId.length + 1) : sub.jobKey
    const url = shopId ? `${SITE_URL}/track/${shopId}/${jobKeyPart}` : `${SITE_URL}/track/${sub.jobKey}`

    const payload = JSON.stringify({
      id: sub.jobKey,
      status,
      body: friendly(status),
      url,
    })
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
      await docSnap.ref.update({ lastStatus: status, updatedAt: Date.now() })
      sent += 1
    } catch (e) {
      const code = e.statusCode
      // 404/410 mean the subscription is gone — remove it.
      // 401/403 mean it was made with a different (rotated) VAPID key and can
      // never work again — the browser must re-subscribe, so remove it too.
      if (code === 404 || code === 410 || code === 401 || code === 403) {
        await docSnap.ref.delete()
        pruned += 1
        if (code === 401 || code === 403) {
          console.warn(`stale VAPID subscription removed for ${sub.jobKey} (${code}) — customer must re-subscribe.`)
        }
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
