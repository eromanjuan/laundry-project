/**
 * Standalone LG machine-sync runner (for GitHub Actions / any Node cron).
 *
 * Does the same job as the Cloud Function but runs anywhere Node runs, and now
 * syncs EVERY shop that has LG sync enabled:
 *   1. Finds shops whose `shops/{shopId}/settings/lgConnection.enabled == true`.
 *   2. Logs into LG (see lgClient.js), managing/refreshing each shop's 1-hour
 *      token in `shops/{shopId}/settings/lgToken`.
 *   3. Writes per-store washer/dryer availability to `shops/{shopId}/settings/lgStatus`.
 *
 * Auth to Firestore uses a Firebase service-account key provided via the
 * FIREBASE_SERVICE_ACCOUNT environment variable (a JSON string). No Blaze plan
 * required — Firestore is on the free Spark plan.
 *
 * Optional env:
 *   LG_SHOP_ID   restrict a run to a single shop (handy for manual testing)
 */

const admin = require('firebase-admin')
const lg = require('./lgClient')

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

/** Reference to a per-shop settings document. */
const settings = (db, shopId, key) => db.doc(`shops/${shopId}/settings/${key}`)

async function ensureToken(db, shopId, force = false) {
  const now = Date.now()
  const tokenRef = settings(db, shopId, 'lgToken')
  const cachedSnap = await tokenRef.get()
  const cached = cachedSnap.exists ? cachedSnap.data() : null
  if (!force && cached?.accessToken && cached.expiresAt && now < cached.expiresAt) return cached

  const conn = (await settings(db, shopId, 'lgConnection').get()).data() || {}
  if (!conn.email || !conn.password) throw new Error('LG account email/password not set in the app yet.')

  let token = null
  if (!force && cached?.refreshToken) {
    try {
      const r = await lg.refreshToken(cached.refreshToken)
      token = { accessToken: r.accessToken, refreshToken: r.refreshToken, userNo: cached.userNo, expiresIn: r.expiresIn }
    } catch (e) {
      console.warn('refresh failed, doing full login:', e.message)
    }
  }
  if (!token) token = await lg.fullLogin(conn.email, conn.password)

  const saved = {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    userNo: token.userNo,
    expiresAt: now + (token.expiresIn || 3600) * 1000 - 60_000,
  }
  await tokenRef.set(saved)
  return saved
}

/** Shop ids with LG sync enabled (or the single id from LG_SHOP_ID). */
async function targetShopIds(db) {
  if (process.env.LG_SHOP_ID) return [process.env.LG_SHOP_ID]
  const snap = await db.collectionGroup('settings').where('enabled', '==', true).get()
  const ids = new Set()
  snap.forEach((docSnap) => {
    if (docSnap.id === 'lgConnection') ids.add(docSnap.ref.parent.parent.id)
  })
  return [...ids]
}

async function syncShop(db, shopId) {
  let token = await ensureToken(db, shopId, false)
  let stores
  let machines
  try {
    stores = await lg.getStatus(token.accessToken, token.userNo)
    machines = await lg.getDevices(token.accessToken, token.userNo)
  } catch (e) {
    // Token may have expired early — force a fresh login and retry once.
    token = await ensureToken(db, shopId, true)
    stores = await lg.getStatus(token.accessToken, token.userNo)
    machines = await lg.getDevices(token.accessToken, token.userNo)
  }
  await settings(db, shopId, 'lgStatus').set({ stores, machines, syncedAt: Date.now(), error: null })
  console.log(`LG sync ok for shop ${shopId} — ${stores.length} store(s), ${machines.length} machine(s):`)
  for (const m of machines) {
    console.log(`  ${m.storeName} · ${m.name} (${m.type}): ${m.status}${m.course ? ' / ' + m.course : ''} · cycle ${m.cycles}${m.remainingMin ? ' · ' + m.remainingMin + 'min left' : ''}`)
  }
}

async function run() {
  const db = initAdmin()
  const shopIds = await targetShopIds(db)
  if (shopIds.length === 0) {
    console.log('LG sync skipped — no shops have LG sync enabled.')
    return
  }

  for (const shopId of shopIds) {
    try {
      const conn = (await settings(db, shopId, 'lgConnection').get()).data() || {}
      if (!process.env.LG_SHOP_ID && (!conn.enabled || !conn.email)) {
        console.log(`LG sync skipped for shop ${shopId} — not enabled or no credentials saved in the app.`)
        continue
      }
      await syncShop(db, shopId)
    } catch (e) {
      console.error(`LG sync failed for shop ${shopId}:`, e.message)
      await settings(db, shopId, 'lgStatus').set({ error: String(e.message || e), syncedAt: Date.now() }, { merge: true })
      process.exitCode = 1
    }
  }
}

run().then(() => process.exit(process.exitCode || 0))
