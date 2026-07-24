/**
 * Standalone LG machine-sync runner (for GitHub Actions / any Node cron).
 *
 * Does the same job as the Cloud Function but runs anywhere Node runs:
 *   1. Reads the LG account credentials from Firestore (settings/lgConnection),
 *      which the POS app writes when the admin signs in.
 *   2. Logs into LG (see lgClient.js), managing/refreshing the 1-hour token in
 *      settings/lgToken.
 *   3. Writes per-store washer/dryer availability to settings/lgStatus for the
 *      app to display.
 *
 * Auth to Firestore uses a Firebase service-account key provided via the
 * FIREBASE_SERVICE_ACCOUNT environment variable (a JSON string). No Blaze plan
 * required — Firestore is on the free Spark plan.
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

const CONN = 'settings/lgConnection'
const TOKEN = 'settings/lgToken'
const STATUS = 'settings/lgStatus'

async function ensureToken(db, force = false) {
  const now = Date.now()
  const cachedSnap = await db.doc(TOKEN).get()
  const cached = cachedSnap.exists ? cachedSnap.data() : null
  if (!force && cached?.accessToken && cached.expiresAt && now < cached.expiresAt) return cached

  const conn = (await db.doc(CONN).get()).data() || {}
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
  await db.doc(TOKEN).set(saved)
  return saved
}

async function run() {
  const db = initAdmin()

  const conn = (await db.doc(CONN).get()).data() || {}
  if (!conn.enabled || !conn.email) {
    console.log('LG sync skipped — not enabled or no credentials saved in the app.')
    return
  }

  try {
    let token = await ensureToken(db, false)
    let stores
    try {
      stores = await lg.getStatus(token.accessToken, token.userNo)
    } catch (e) {
      // Token may have expired early — force a fresh login and retry once.
      token = await ensureToken(db, true)
      stores = await lg.getStatus(token.accessToken, token.userNo)
    }
    await db.doc(STATUS).set({ stores, syncedAt: Date.now(), error: null })
    console.log(`LG sync ok — ${stores.length} store(s):`)
    for (const s of stores) {
      console.log(`  ${s.storeName}: washers ${s.washer.standby}/${s.washer.total} free, dryers ${s.dryer.standby}/${s.dryer.total} free`)
    }
  } catch (e) {
    console.error('LG sync failed:', e.message)
    await db.doc(STATUS).set({ error: String(e.message || e), syncedAt: Date.now() }, { merge: true })
    process.exitCode = 1
  }
}

run().then(() => process.exit(process.exitCode || 0))
