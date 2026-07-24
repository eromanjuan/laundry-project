/**
 * LG "Laundry Crew Manager" (KIC Commercial Laundry) client.
 *
 * Reverse-engineered from the live site's own network flow. Logs in with the
 * owner's LG account email + password, obtains a 1-hour access token (with a
 * refresh token), and reads per-store washer/dryer availability.
 *
 * This runs SERVER-SIDE only (Cloud Function) — never in the browser:
 *   - LG's data API only accepts calls whose Origin is the LG site (CORS).
 *   - The account password must never be exposed to the front-end.
 *
 * Auth flow (all steps verified against the real site):
 *   1. POST .../empb2b/v1.0/account/session/{email}  body user_auth=SHA512(pw)
 *        -> account.loginSessionID
 *   2. POST kr.m.biz.lgaccount.com/oauthSignature      -> request signature
 *        (LG signs for us; no secret key needed on our side)
 *   3. GET  .../oauth/1.0/emp/oauth2/auth               -> authorization code
 *   4. POST .../oauth/1.0/oauth2/token                  -> { access_token,
 *        refresh_token, expires_in:3600 }
 *   5. Data: GET kic-laundry.lgthinq.com/status?today=… with x-emp-token
 */

const crypto = require('crypto')

// --- Constants pulled from the live site ---
const EMP_APP_KEY = '04828ef6a030455885d3c4604e3b1623' // LG EMP appkey (login)
const CLIENT_ID = 'ed360dc33b4741bd995cb9474ce07c80' // Laundry Crew Manager OAuth client
const CLIENT_SECRET = 'b79f2f4c46bd48e9ab99a79699fdd400' // signs token/refresh (HMAC-SHA1)
const TOKEN_PATH = '/oauth/1.0/oauth2/token'
const BIZ_CODE = 'B01004C037'
const REDIRECT_URI = 'http://kic-laundry-web.lgthinq.com/redirect'
const DATA_API = 'https://kic-laundry.lgthinq.com'
const DATA_API_KEY = 'vV6bStCpqr5Hqxbcr8Kmp9XkFh4VdlVp568YxBp5'
const OAUTH_HOST = 'https://ph.biz.lgeapi.com'
const TOKEN_HOST = 'https://kr.biz.lgeapi.com'
const EMP_HOST = 'https://ph.emp.biz.lgeapi.com'

/** RFC-1123 date the way LG expects it, e.g. "Fri, 24 Jul 2026 04:48:33 +0000". */
function lgDate() {
  return new Date().toUTCString().replace('GMT', '+0000')
}

function sha512Hex(text) {
  return crypto.createHash('sha512').update(text).digest('hex')
}

function messageId() {
  return String(Math.floor(1e9 + Math.random() * 9e9))
}

/** Ask LG to sign a request path (server-side signing — no secret needed here). */
async function signPath(path, date) {
  const body = new URLSearchParams({
    biz_code: BIZ_CODE,
    server_type: 'OP',
    text: `${path}\n${date}`,
  }).toString()
  const res = await fetch('https://kr.m.biz.lgaccount.com/oauthSignature', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'x-requested-with': 'XMLHttpRequest',
    },
    body,
  })
  if (!res.ok) throw new Error(`oauthSignature failed: ${res.status}`)
  return (await res.text()).trim()
}

/**
 * Locally sign a token/refresh request the way the site's own JS does:
 *   Base64( HMAC-SHA1( "<path?query>\n<date>", client_secret ) )
 */
function signLocal(pathWithQuery, date) {
  return crypto.createHmac('sha1', CLIENT_SECRET).update(`${pathWithQuery}\n${date}`).digest('base64')
}

/** Step 1 — email/password login → loginSessionID. */
async function login(email, password) {
  const targetUrl =
    `https://ph.m.biz.lgaccount.com/email/account_protect_auth?biz_code=${BIZ_CODE}.01&country=PH&language=en-PH`
  const body = new URLSearchParams({
    user_auth: sha512Hex(password),
    target_url: targetUrl,
    otp_use_yn: 'N',
  }).toString()
  const res = await fetch(`${EMP_HOST}/empb2b/v1.0/account/session/${encodeURIComponent(email)}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'X-Device-Country': 'PH',
      'X-Device-Language': 'en-PH',
      'X-Device-Language-Type': 'IETF',
      'X-Device-Publish-Flag': 'Y',
      'X-Lge-AppKey': EMP_APP_KEY,
    },
    body,
  })
  const data = await res.json().catch(() => ({}))
  const sessionId = data?.account?.loginSessionID
  if (!sessionId) {
    throw new Error(`LG login failed: ${data?.error?.message || res.status || 'no loginSessionID'}`)
  }
  return { loginSessionID: sessionId, userID: data.account.userID }
}

/** Step 3 — exchange the login session for an authorization code. */
async function getAuthCode(loginSessionID) {
  const path =
    `/oauth/1.0/emp/oauth2/auth?client_id=${CLIENT_ID}&country_code=PH` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&state=login`
  const date = lgDate()
  const signature = await signPath(path, date)
  const res = await fetch(`${OAUTH_HOST}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Login-Session': loginSessionID,
      'x-lge-appkey': EMP_APP_KEY,
      'x-lge-oauth-date': date,
      'x-lge-oauth-signature': signature,
    },
  })
  // The response body is JSON: { redirect_uri: "<url-encoded url with ?code=…&user_number=…>" }
  const data = await res.json().catch(() => ({}))
  const redirect = data?.redirect_uri ? decodeURIComponent(data.redirect_uri) : ''
  const codeMatch = redirect.match(/[?&]code=([^&]+)/)
  const userMatch = redirect.match(/[?&]user_number=([^&]+)/)
  const code = codeMatch ? codeMatch[1] : ''
  if (!code) {
    throw new Error(`No auth code returned (status ${res.status}): ${JSON.stringify(data).slice(0, 200)}`)
  }
  return { code, userNo: userMatch ? userMatch[1] : '' }
}

/** Step 4 — swap the code for an access token + refresh token. */
async function getToken(code) {
  const query =
    `code=${code}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
  const pathWithQuery = `${TOKEN_PATH}?${query}`
  const date = lgDate()
  const signature = signLocal(pathWithQuery, date)
  const res = await fetch(`${TOKEN_HOST}${pathWithQuery}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-lge-appKey': CLIENT_ID,
      'x-lge-oauth-date': date,
      'x-lge-oauth-signature': signature,
      'x-message-id': messageId(),
    },
    body: '{}',
  })
  const data = await res.json().catch(() => ({}))
  if (!data.access_token) throw new Error(`Token exchange failed: ${JSON.stringify(data).slice(0, 200)}`)
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: Number(data.expires_in) || 3600,
  }
}

/** Step 4b — refresh an access token without a full re-login. */
async function refreshToken(refresh) {
  const query = `grant_type=refresh_token&refresh_token=${refresh}`
  const pathWithQuery = `${TOKEN_PATH}?${query}`
  const date = lgDate()
  const signature = signLocal(pathWithQuery, date)
  const res = await fetch(`${TOKEN_HOST}${pathWithQuery}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-lge-appKey': CLIENT_ID,
      'x-lge-oauth-date': date,
      'x-lge-oauth-signature': signature,
      'x-message-id': messageId(),
    },
    body: '{}',
  })
  const data = await res.json().catch(() => ({}))
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data).slice(0, 200)}`)
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refresh,
    expiresIn: Number(data.expires_in) || 3600,
  }
}

/** Headers for the KIC data API. */
function dataHeaders(empToken, userNo) {
  return {
    'x-api-key': DATA_API_KEY,
    'x-emp-token': empToken,
    'x-user-no': userNo,
    'x-client-id': '12345',
    'x-country-code': 'PH',
    'x-language-code': 'en-PH',
    'x-service-code': 'CHN000037',
    'x-service-phase': 'OP',
    'x-thinq-app-level': 'DEV',
    'x-thinq-app-ver': '0.1',
    'x-thinq-client-type': 'WEB',
    'x-message-id': messageId(),
    origin: 'https://kic-laundry-web.lgthinq.com',
    referer: 'https://kic-laundry-web.lgthinq.com/',
  }
}

/** Resolve the account's user number (x-user-no) from /users/info. */
async function getUserNo(empToken) {
  const res = await fetch(`${DATA_API}/users/info`, { headers: dataHeaders(empToken, '') })
  const data = await res.json().catch(() => ({}))
  return data?.result?.userNo || ''
}

/** Per-store washer/dryer availability. */
async function getStatus(empToken, userNo, today) {
  const day = today || new Date().toISOString().slice(0, 10)
  const res = await fetch(`${DATA_API}/status?today=${day}`, { headers: dataHeaders(empToken, userNo) })
  const data = await res.json().catch(() => ({}))
  if (data.resultCode !== '0000') throw new Error(`status failed: ${JSON.stringify(data).slice(0, 200)}`)
  // Shape: { storeId: { storeName, washer:{total,usage,standby,error,offline}, dryer:{...} } }
  return Object.entries(data.result || {}).map(([storeId, s]) => ({
    storeId,
    storeName: s.storeName,
    washer: s.washer,
    dryer: s.dryer,
  }))
}

/** Raw store list with each store's device-id array. */
async function getStores(empToken, userNo) {
  const res = await fetch(`${DATA_API}/stores`, { headers: dataHeaders(empToken, userNo) })
  const data = await res.json().catch(() => ({}))
  return (data.result || []).map((s) => ({
    storeId: s.storeId,
    storeName: s.storeName,
    deviceIds: s.deviceId || [],
  }))
}

const DEVICE_TYPE = { 211: 'Washer', 212: 'Dryer' }

/** Full detail for one device (metadata + live snapshot), or null if unregistered. */
async function getDeviceDetail(empToken, userNo, deviceId) {
  const res = await fetch(`${DATA_API}/devices/${deviceId}`, { headers: dataHeaders(empToken, userNo) })
  if (res.status !== 200) return null // stale / DeviceNotRegistered
  const data = await res.json().catch(() => null)
  if (!data || data.resultCode !== '0000') return null
  return data.result
}

/** Lifetime cycle count for a device (the "cycle" number on the LG card). */
async function getDeviceCycles(empToken, userNo, deviceId) {
  const res = await fetch(`${DATA_API}/devices/${deviceId}/history?page=1&pageSize=1`, {
    headers: dataHeaders(empToken, userNo),
  })
  if (res.status !== 200) return null
  const data = await res.json().catch(() => null)
  const used = data?.result?.revenue?.used
  return typeof used === 'number' ? used : null
}

/** Turn a raw device record + cycle count into the fields the POS card shows. */
function interpretMachine(detail, cycles) {
  const type = DEVICE_TYPE[detail.deviceType] || 'Washer'
  const wd = detail.snapshot?.washerDryer || {}
  const online = detail.snapshot?.online !== false
  let running
  let remainingMin
  let course
  let hasError
  if (String(detail.deviceType) === '212') {
    // Dryer
    running = Number(wd.runningTime) > 0
    remainingMin = Number(wd.remainTime) || 0
    course = wd.course && wd.course !== 'NOT_SELECTED' ? wd.course : ''
    hasError = wd.error && wd.error !== 'ERROR_NO'
  } else {
    // Washer
    running = wd.isRunning === 'ON'
    remainingMin = (Number(wd.RemainHour) || 0) * 60 + (Number(wd.RemainMin) || 0)
    course = wd.CourseNum && wd.CourseNum !== 'NOT_SELECTED' ? wd.CourseNum : ''
    hasError = wd.ErrorCode && wd.ErrorCode !== 'ERROR_NO'
  }
  let status
  if (!online) status = 'Offline'
  else if (hasError) status = 'Error'
  else if (running) status = 'In Use'
  else status = 'Standby'
  return { name: detail.alias || '', type, status, course, remainingMin, online, cycles: cycles ?? 0 }
}

/** All registered machines across all stores, with live status + cycle count. */
async function getDevices(empToken, userNo) {
  const stores = await getStores(empToken, userNo)
  const machines = []
  for (const store of stores) {
    for (const deviceId of store.deviceIds) {
      const detail = await getDeviceDetail(empToken, userNo, deviceId)
      if (!detail) continue // skip stale / unregistered ids
      const cycles = await getDeviceCycles(empToken, userNo, deviceId)
      machines.push({
        deviceId,
        storeId: store.storeId,
        storeName: store.storeName,
        ...interpretMachine(detail, cycles),
      })
    }
  }
  return machines
}

/** Full login from scratch → tokens + userNo. */
async function fullLogin(email, password) {
  const { loginSessionID } = await login(email, password)
  const { code, userNo: userNoFromAuth } = await getAuthCode(loginSessionID)
  const token = await getToken(code)
  const userNo = userNoFromAuth || (await getUserNo(token.accessToken))
  return { ...token, userNo }
}

module.exports = {
  login,
  getAuthCode,
  getToken,
  refreshToken,
  getUserNo,
  getStatus,
  getStores,
  getDevices,
  fullLogin,
}
