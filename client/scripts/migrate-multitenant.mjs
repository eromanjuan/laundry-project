#!/usr/bin/env node
/**
 * One-time multi-tenant migration for the Laundry POS.
 *
 * The legacy app stored every shop's records in flat top-level Firestore
 * collections. The multi-tenant app requires a `shopId` on every tenant record
 * and per-shop settings under `shops/{shopId}/settings/*`. This script:
 *
 *   1. Signs in as the platform master (email + password from env — never
 *      hardcoded). It verifies the uid matches the allow-listed master uid.
 *   2. Ensures the master profile exists with role "Master".
 *   3. Ensures a default shop (slug from --slug, default "default-shop") plus
 *      its public `shopSlugs/{slug}` document exist.
 *   4. Backfills `shopId` (+ `shopSlug`/`status`) onto existing users, usernames
 *      and every tenant collection record that is missing it.
 *   5. Copies legacy global `settings/*` documents into the default shop.
 *
 * It is SAFE and IDEMPOTENT: it only writes fields that are missing, so it can
 * be re-run. Use --dry to print the plan without writing anything.
 *
 * Prereqs (order matters): deploy the new `firestore.rules` FIRST, then run this
 * migration, then deploy the app. Old docs lack `shopId`, so they are invisible
 * to shop members (and readable by the master) until this has run.
 *
 * Usage (from the client/ directory, so the firebase SDK resolves):
 *   MASTER_PASSWORD='…' node --env-file=.env scripts/migrate-multitenant.mjs
 *   MASTER_PASSWORD='…' node --env-file=.env scripts/migrate-multitenant.mjs --dry
 *   MASTER_PASSWORD='…' node --env-file=.env scripts/migrate-multitenant.mjs --slug=main-branch --name="Main Branch"
 *
 * Environment:
 *   VITE_FIREBASE_*   Firebase web config (reads client/.env)
 *   MASTER_EMAIL      defaults to eugenioiromanjuan@gmail.com
 *   MASTER_PASSWORD   REQUIRED (the master account's password)
 */

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'

// ---------------------------------------------------------------------------
// Constants (must match client/src/lib/tenant.ts and firestore.rules)
// ---------------------------------------------------------------------------
const MASTER_UID = '3NkY5cfPGhNYXfW4EukNDaOrEjz2'
const MASTER_EMAIL = process.env.MASTER_EMAIL || 'eugenioiromanjuan@gmail.com'
const MASTER_PASSWORD = process.env.MASTER_PASSWORD

const TENANT_COLLECTIONS = [
  'customers',
  'orders',
  'claims',
  'payments',
  'expenses',
  'cashPayments',
  'collections',
  'machines',
  'activity',
  'paymentProofs',
]

const SETTING_KEYS = ['pricing', 'business', 'branding', 'payment', 'lgConnection', 'lgStatus', 'lgToken']

const SHOP_ROLES = ['Administrator', 'Manager', 'Staff/Cashier']

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2)
const flag = (name) => argv.includes(`--${name}`)
const opt = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

const DRY = flag('dry')
const ARG_SLUG = opt('slug', '')
const ARG_NAME = opt('name', '')

/** URL-safe slug (mirrors client/src/data/seeds.ts `slugify`). */
function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function fail(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}
function log(message) {
  console.log(message)
}
function plan(message) {
  console.log(`${DRY ? '  · (dry) ' : '  · '}${message}`)
}

function firebaseConfigFromEnv() {
  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  }
}

/** Commit updates (and optional sets) in Firestore-sized batches. */
async function commitInBatches(db, ops) {
  const BATCH_LIMIT = 400
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const op of ops.slice(i, i + BATCH_LIMIT)) {
      if (op.type === 'update') batch.update(op.ref, op.data)
      else batch.set(op.ref, op.data)
    }
    if (!DRY) await batch.commit()
  }
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------
async function main() {
  const config = firebaseConfigFromEnv()
  if (!config.apiKey || !config.projectId) {
    fail('Firebase config missing. Run with: node --env-file=.env scripts/migrate-multitenant.mjs')
  }
  if (!MASTER_PASSWORD) {
    fail(
      'MASTER_PASSWORD is required.\n' +
        "  Example: MASTER_PASSWORD='…' node --env-file=.env scripts/migrate-multitenant.mjs",
    )
  }

  const app = initializeApp(config)
  const auth = getAuth(app)
  const db = getFirestore(app)

  log(`\nLaundry POS — multi-tenant migration (project: ${config.projectId})${DRY ? '  [DRY RUN]' : ''}\n`)

  // 1. Sign in as master -----------------------------------------------------
  log(`→ Signing in as master (${MASTER_EMAIL})…`)
  const cred = await signInWithEmailAndPassword(auth, MASTER_EMAIL, MASTER_PASSWORD)
  if (cred.user.uid !== MASTER_UID) {
    fail(`Signed-in uid ${cred.user.uid} is not the allow-listed master uid. Aborting.`)
  }
  log(`✓ Signed in as master (${cred.user.uid})`)

  // 2. Master profile --------------------------------------------------------
  const masterRef = doc(db, 'users', MASTER_UID)
  const masterSnap = await getDoc(masterRef)
  if (!masterSnap.exists()) {
    plan('Create master profile (role: Master)')
    if (!DRY) {
      await setDoc(masterRef, {
        id: MASTER_UID,
        uid: MASTER_UID,
        name: 'Platform Administrator',
        username: 'master',
        email: MASTER_EMAIL,
        role: 'Master',
        shopId: '',
        isActive: true,
        status: 'active',
        password: '',
        mustChangePassword: false,
        photo: '',
        createdAt: Date.now(),
      })
    }
  } else if (masterSnap.data().role !== 'Master') {
    plan('Repair master profile role → Master')
    if (!DRY) await updateDoc(masterRef, { role: 'Master', shopId: '', isActive: true, status: 'active' })
  } else {
    log('✓ Master profile OK')
  }

  // 3. Resolve / create the default shop ------------------------------------
  // Prefer the legacy business identity so the migrated shop isn't a placeholder.
  const bizSnap = await getDoc(doc(db, 'settings', 'business'))
  const biz = bizSnap.exists() ? bizSnap.data() : {}
  const shopName = (ARG_NAME || biz.name || 'Main Laundry Shop').trim()
  const slug = ARG_SLUG || slugify(shopName) || 'default-shop'

  let shopId = ''
  const slugRef = doc(db, 'shopSlugs', slug)
  const slugSnap = await getDoc(slugRef)

  if (slugSnap.exists()) {
    shopId = slugSnap.data().shopId
    log(`✓ Found existing shop for /${slug} → ${shopId}`)
  } else {
    // The platform master is migrating the legacy single-tenant data. The master
    // account's email is the same person as the legacy shop's administrator, so
    // the master's real uid is the correct, signable owner for the default shop.
    const ownerUid = MASTER_UID
    const ownerName = shopName
    const ownerEmail = MASTER_EMAIL

    const newShopRef = doc(collection(db, 'shops'))
    shopId = newShopRef.id
    plan(`Create default shop "${shopName}" (/${slug}) → ${shopId} (owner ${ownerUid})`)
    if (!DRY) {
      await setDoc(newShopRef, {
        id: shopId,
        name: shopName,
        slug,
        ownerUid,
        ownerName,
        ownerEmail,
        contact: biz.contact || '',
        address: biz.address || '',
        location: biz.branch || '',
        status: 'active',
        createdAt: Date.now(),
        approvedAt: Date.now(),
        approvedBy: MASTER_UID,
      })
      await setDoc(slugRef, {
        shopId,
        slug,
        name: shopName,
        status: 'active',
        ownerUid,
        updatedAt: Date.now(),
      })
    }
  }

  // 4. Users + usernames -----------------------------------------------------
  const userOps = []
  const usersSnap = await getDocs(collection(db, 'users'))
  let ownerPromoted = false
  for (const snap of usersSnap.docs) {
    if (snap.id === MASTER_UID) continue
    const data = snap.data()
    const changes = {}
    if (data.shopId !== shopId) changes.shopId = shopId
    if (data.shopSlug !== slug) changes.shopSlug = slug
    if (!data.status) changes.status = 'active'
    if (data.isActive === undefined) changes.isActive = true
    if (data.role && !SHOP_ROLES.includes(data.role)) changes.role = 'Administrator'
    if (Object.keys(changes).length > 0) {
      userOps.push({ type: 'update', ref: snap.ref, data: changes })
    }
    if (data.role === 'Administrator') ownerPromoted = true
  }
  // Guarantee at least one administrator owns the default shop (never touch the
  // platform master's own profile).
  if (!ownerPromoted && usersSnap.docs.length > 0) {
    const shopSnap = await getDoc(doc(db, 'shops', shopId))
    const ownerUid = shopSnap.exists() ? shopSnap.data().ownerUid : ''
    const ownerRef = ownerUid && ownerUid !== MASTER_UID ? usersSnap.docs.find((d) => d.id === ownerUid)?.ref : undefined
    if (ownerRef) {
      plan(`Promote shop owner (${ownerUid}) to Administrator`)
      userOps.push({ type: 'update', ref: ownerRef, data: { role: 'Administrator', shopId, shopSlug: slug } })
    }
  }
  plan(`Backfill ${userOps.length} user profile(s) → shop ${shopId}`)
  await commitInBatches(db, userOps)

  const usernameOps = []
  const usernamesSnap = await getDocs(collection(db, 'usernames'))
  for (const snap of usernamesSnap.docs) {
    const data = snap.data()
    if (data.shopId) continue
    usernameOps.push({ type: 'update', ref: snap.ref, data: { shopId } })
  }
  plan(`Backfill ${usernameOps.length} username lookup(s)`)
  await commitInBatches(db, usernameOps)

  // 5. Tenant collection records --------------------------------------------
  let tenantTouched = 0
  for (const name of TENANT_COLLECTIONS) {
    const snap = await getDocs(collection(db, name))
    const ops = []
    for (const d of snap.docs) {
      const data = d.data()
      if (data.shopId) continue
      ops.push({ type: 'update', ref: d.ref, data: { shopId } })
    }
    if (ops.length > 0) {
      plan(`Backfill ${ops.length}/${snap.size} record(s) in "${name}"`)
      await commitInBatches(db, ops)
      tenantTouched += ops.length
    } else if (snap.size > 0) {
      log(`✓ "${name}" already scoped (${snap.size} record(s))`)
    }
  }

  // 5b. Namespaced customer tracking. Legacy docs are keyed by bare job number
  //     and would 404 under the new `/track/{shopId}/{key}` URLs, so copy each
  //     into its namespaced id. The legacy docs are kept so old receipt QRs and
  //     already-sent push notifications keep resolving.
  const trackingSnap = await getDocs(collection(db, 'tracking'))
  let trackingCopied = 0
  for (const d of trackingSnap.docs) {
    const data = d.data()
    if (data.shopId) continue // already namespaced (new-scheme doc)
    const namespacedId = `${shopId}_${d.id}`
    const targetRef = doc(db, 'tracking', namespacedId)
    const target = await getDoc(targetRef)
    if (target.exists()) continue
    plan(`Copy tracking/${d.id} → tracking/${namespacedId}`)
    if (!DRY) await setDoc(targetRef, { ...data, shopId, key: d.id })
    trackingCopied += 1
  }

  // 5c. Re-point legacy push subscriptions at the namespaced tracking docs.
  const pushSnap = await getDocs(collection(db, 'pushSubs'))
  const pushOps = []
  for (const d of pushSnap.docs) {
    const data = d.data()
    if (data.shopId || !data.jobKey) continue
    pushOps.push({ type: 'update', ref: d.ref, data: { shopId, jobKey: `${shopId}_${data.jobKey}` } })
  }
  plan(`Re-point ${pushOps.length} push subscription(s)`)
  await commitInBatches(db, pushOps)

  // 6. Copy legacy global settings into the shop ----------------------------
  let settingsCopied = 0
  for (const key of SETTING_KEYS) {
    const source = await getDoc(doc(db, 'settings', key))
    if (!source.exists()) continue
    const targetRef = doc(db, 'shops', shopId, 'settings', key)
    const target = await getDoc(targetRef)
    if (target.exists()) continue
    plan(`Copy settings/${key} → shops/${shopId}/settings/${key}`)
    if (!DRY) await setDoc(targetRef, source.data())
    settingsCopied += 1
  }

  log('\n──────────────────────────────────────────────')
  log(`Shop:            ${shopName} (/${slug}) → ${shopId}`)
  log(`Users updated:   ${userOps.length}`)
  log(`Usernames:       ${usernameOps.length}`)
  log(`Tenant records:  ${tenantTouched}`)
  log(`Tracking copied: ${trackingCopied}`)
  log(`Push re-pointed: ${pushOps.length}`)
  log(`Settings copied: ${settingsCopied}`)
  log(DRY ? '\nDRY RUN complete — nothing was written.\n' : '\n✓ Migration complete.\n')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n✖ Migration failed:', error?.message || error)
    process.exit(1)
  })
