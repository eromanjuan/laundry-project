/**
 * LG machine-sync backend (Firebase Cloud Functions, gen 2).
 *
 * Reads the owner's LG account credentials from Firestore, logs into LG's
 * Laundry Crew Manager, and writes live per-store washer/dryer availability
 * back into Firestore for the POS to display. Runs on a schedule and can also
 * be triggered on demand from the app.
 *
 * Firestore docs used:
 *   settings/lgConnection  {enabled,email,password,region}   (written by the app)
 *   settings/lgToken       {accessToken,refreshToken,userNo,expiresAt}  (managed here)
 *   settings/lgStatus      {stores:[…],syncedAt,error}        (read by the app)
 */

const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const admin = require('firebase-admin')
const lg = require('./lgClient')

admin.initializeApp()
const db = admin.firestore()
setGlobalOptions({ region: 'us-central1', maxInstances: 3 })

const CONN = 'settings/lgConnection'
const TOKEN = 'settings/lgToken'
const STATUS = 'settings/lgStatus'

/** Get a valid token, refreshing or re-logging-in as needed. */
async function ensureToken(force = false) {
  const now = Date.now()
  const tokenDoc = await db.doc(TOKEN).get()
  const cached = tokenDoc.exists ? tokenDoc.data() : null
  if (!force && cached?.accessToken && cached.expiresAt && now < cached.expiresAt) {
    return cached
  }

  const conn = (await db.doc(CONN).get()).data() || {}
  if (!conn.email || !conn.password) throw new Error('LG account email/password not set in settings.')

  let token = null
  // Try a cheap refresh first (unless forced to re-login).
  if (!force && cached?.refreshToken) {
    try {
      const r = await lg.refreshToken(cached.refreshToken)
      token = { accessToken: r.accessToken, refreshToken: r.refreshToken, userNo: cached.userNo, expiresIn: r.expiresIn }
    } catch (e) {
      console.warn('refresh failed, full login:', e.message)
    }
  }
  if (!token) token = await lg.fullLogin(conn.email, conn.password)

  const saved = {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    userNo: token.userNo,
    expiresAt: now + (token.expiresIn || 3600) * 1000 - 60_000, // 1-min safety buffer
  }
  await db.doc(TOKEN).set(saved)
  return saved
}

/** Fetch status, transparently re-logging-in once if the token was rejected. */
async function fetchStatus(force = false) {
  let token = await ensureToken(force)
  try {
    return await lg.getStatus(token.accessToken, token.userNo)
  } catch (e) {
    // Token may have been revoked early — force a fresh login and retry once.
    token = await ensureToken(true)
    return await lg.getStatus(token.accessToken, token.userNo)
  }
}

async function syncOnce(force = false) {
  const stores = await fetchStatus(force)
  await db.doc(STATUS).set({ stores, syncedAt: Date.now(), error: null })
  return stores
}

/** Scheduled sync — every 5 minutes while the connection is enabled. */
exports.syncLg = onSchedule('every 5 minutes', async () => {
  const conn = (await db.doc(CONN).get()).data() || {}
  if (!conn.enabled || !conn.email) {
    console.log('LG sync skipped (disabled or no credentials).')
    return
  }
  try {
    const stores = await syncOnce(false)
    console.log(`LG sync ok — ${stores.length} store(s).`)
  } catch (e) {
    console.error('LG sync failed:', e.message)
    await db.doc(STATUS).set({ error: String(e.message || e), syncedAt: Date.now() }, { merge: true })
  }
})

/**
 * On-demand sign-in / sync, callable from the app. Forces a fresh login so it
 * doubles as credential validation right after the admin enters them.
 */
exports.syncLgNow = onCall(async () => {
  try {
    const stores = await syncOnce(true)
    return { ok: true, stores }
  } catch (e) {
    await db.doc(STATUS).set({ error: String(e.message || e), syncedAt: Date.now() }, { merge: true })
    throw new HttpsError('internal', e.message || 'LG sign-in failed')
  }
})
