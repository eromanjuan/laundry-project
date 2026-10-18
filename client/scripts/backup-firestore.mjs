#!/usr/bin/env node
/**
 * Full JSON backup of the Laundry POS Firestore database, using the master
 * account (client SDK). Spark-plan friendly: it needs no Cloud Storage bucket,
 * unlike the console "export to GCS" feature.
 *
 * It signs in as the master (email + password from env — never hardcoded),
 * verifies the uid matches the allow-listed master uid, and writes every
 * top-level collection plus each shop's `settings/*` subcollection to a single
 * timestamped JSON file under `client/backups/`.
 *
 * Usage (from the client/ directory, so the firebase SDK resolves):
 *   MASTER_PASSWORD='…' node --env-file=.env scripts/backup-firestore.mjs
 *
 * Restoring is manual: the JSON mirrors collection → documents and can be
 * re-written with a small script if ever needed.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, getFirestore } from 'firebase/firestore'

const MASTER_UID = '3NkY5cfPGhNYXfW4EukNDaOrEjz2'
const MASTER_EMAIL = process.env.MASTER_EMAIL || 'eugenioiromanjuan@gmail.com'
const MASTER_PASSWORD = process.env.MASTER_PASSWORD

const TOP_LEVEL = [
  'shops',
  'shopSlugs',
  'users',
  'usernames',
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
  'pushSubs',
  'tracking',
  'settings',
  '_meta',
]

function fail(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

async function main() {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  }
  if (!config.apiKey || !config.projectId) {
    fail('Firebase config missing. Run with: node --env-file=.env scripts/backup-firestore.mjs')
  }
  if (!MASTER_PASSWORD) {
    fail("MASTER_PASSWORD is required.\n  Example: MASTER_PASSWORD='…' node --env-file=.env scripts/backup-firestore.mjs")
  }

  const app = initializeApp(config)
  const auth = getAuth(app)
  const db = getFirestore(app)

  console.log(`\nLaundry POS — Firestore backup (project: ${config.projectId})\n`)
  console.log(`→ Signing in as master (${MASTER_EMAIL})…`)
  const cred = await signInWithEmailAndPassword(auth, MASTER_EMAIL, MASTER_PASSWORD)
  if (cred.user.uid !== MASTER_UID) fail(`Signed-in uid ${cred.user.uid} is not the allow-listed master uid. Aborting.`)
  console.log(`✓ Signed in as master (${cred.user.uid})\n`)

  const dump = {
    exportedAt: new Date().toISOString(),
    projectId: config.projectId,
    collections: {},
    shopSettings: {},
  }

  for (const name of TOP_LEVEL) {
    const snap = await getDocs(collection(db, name))
    const rows = {}
    snap.forEach((d) => {
      rows[d.id] = d.data()
    })
    dump.collections[name] = rows
    console.log(`  ${name.padEnd(16)} ${snap.size} doc(s)`)
  }

  // Per-shop settings subcollections (all keys live in one `settings` subcollection).
  const shopsSnap = await getDocs(collection(db, 'shops'))
  for (const shopDoc of shopsSnap.docs) {
    const snap = await getDocs(collection(db, 'shops', shopDoc.id, 'settings'))
    if (snap.size === 0) continue
    const perShop = {}
    snap.forEach((d) => {
      perShop[d.id] = d.data()
    })
    dump.shopSettings[shopDoc.id] = perShop
    console.log(`  shops/${shopDoc.id}/settings  ${snap.size} doc(s)`)
  }

  const here = dirname(fileURLToPath(import.meta.url))
  const outDir = resolve(here, '..', 'backups')
  mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outFile = resolve(outDir, `firestore-backup-${stamp}.json`)
  writeFileSync(outFile, JSON.stringify(dump, null, 2), 'utf8')

  const total = Object.values(dump.collections).reduce((n, c) => n + Object.keys(c).length, 0)
  console.log(`\n✓ Backup complete — ${total} document(s).`)
  console.log(`  ${outFile}\n`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => fail(error?.message || String(error)))
