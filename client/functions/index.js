/**
 * LG machine-sync backend (Firebase Cloud Functions, gen 2).
 *
 * NOTE: this project runs on the Spark (free) plan, so Cloud Functions are NOT
 * deployed. The scheduled GitHub Action in `lg-sync/` performs the same sync.
 * This file is kept aligned with the multi-tenant schema in case the project
 * later moves to Blaze, and now iterates over every shop's own settings.
 *
 * Firestore docs used (per shop):
 *   shops/{shopId}/settings/lgConnection  {enabled,email,password,region}  (written by the app)
 *   shops/{shopId}/settings/lgToken       {accessToken,refreshToken,userNo,expiresAt}  (managed here)
 *   shops/{shopId}/settings/lgStatus      {stores,machines,syncedAt,error}  (read by the app)
 */

const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const admin = require('firebase-admin')
const lg = require('./lgClient')

admin.initializeApp()
const db = admin.firestore()
setGlobalOptions({ region: 'us-central1', maxInstances: 3 })

/** Reference to a per-shop settings document. */
const settings = (shopId, key) => db.doc(`shops/${shopId}/settings/${key}`)

/** Get a valid token for one shop, refreshing or re-logging-in as needed. */
async function ensureToken(shopId, force = false) {
  const now = Date.now()
  const tokenRef = settings(shopId, 'lgToken')
  const tokenDoc = await tokenRef.get()
  const cached = tokenDoc.exists ? tokenDoc.data() : null
  if (!force && cached?.accessToken && cached.expiresAt && now < cached.expiresAt) {
    return cached
  }

  const conn = (await settings(shopId, 'lgConnection').get()).data() || {}
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
  await tokenRef.set(saved)
  return saved
}

/** Fetch status for one shop, transparently re-logging-in once if rejected. */
async function fetchStatus(shopId, force = false) {
  let token = await ensureToken(shopId, force)
  try {
    return await lg.getStatus(token.accessToken, token.userNo)
  } catch (e) {
    // Token may have been revoked early — force a fresh login and retry once.
    token = await ensureToken(shopId, true)
    return await lg.getStatus(token.accessToken, token.userNo)
  }
}

async function syncShop(shopId, force = false) {
  const stores = await fetchStatus(shopId, force)
  await settings(shopId, 'lgStatus').set({ stores, syncedAt: Date.now(), error: null })
  return stores
}

/** Shop ids that have an LG connection with sync enabled. */
async function enabledShopIds() {
  const snap = await db.collectionGroup('settings').where('enabled', '==', true).get()
  const ids = new Set()
  snap.forEach((docSnap) => {
    if (docSnap.id === 'lgConnection') ids.add(docSnap.ref.parent.parent.id)
  })
  return [...ids]
}

/** Scheduled sync — every 5 minutes for every shop with sync enabled. */
exports.syncLg = onSchedule('every 5 minutes', async () => {
  const shopIds = await enabledShopIds()
  if (shopIds.length === 0) {
    console.log('LG sync skipped (no shops enabled).')
    return
  }
  for (const shopId of shopIds) {
    try {
      const stores = await syncShop(shopId, false)
      console.log(`LG sync ok for ${shopId} — ${stores.length} store(s).`)
    } catch (e) {
      console.error(`LG sync failed for ${shopId}:`, e.message)
      await settings(shopId, 'lgStatus').set({ error: String(e.message || e), syncedAt: Date.now() }, { merge: true })
    }
  }
})

/**
 * On-demand sign-in / sync for one shop, callable from the app. Forces a fresh
 * login so it doubles as credential validation right after the admin enters them.
 */
exports.syncLgNow = onCall(async (request) => {
  const shopId = request.data?.shopId
  if (!shopId) throw new HttpsError('invalid-argument', 'shopId is required')
  try {
    const stores = await syncShop(shopId, true)
    return { ok: true, stores }
  } catch (e) {
    await settings(shopId, 'lgStatus').set({ error: String(e.message || e), syncedAt: Date.now() }, { merge: true })
    throw new HttpsError('internal', e.message || 'LG sign-in failed')
  }
})
