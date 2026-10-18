#!/usr/bin/env node
/**
 * One-time cleanup of the temporary QA platform administrator.
 *
 * Must run as a platform administrator (the primary master in .env).
 * Deletes the QA account's profile and username reservation first,
 * then its allow-list entry last — revoking the allow-list is what
 * removes master rights, so it must happen after the other deletes.
 * (The QA Auth login itself is left inert — purging Auth accounts
 * requires the Admin SDK, unavailable on the Spark plan.)
 *
 * Usage (from client/, with a CURRENT master password in .env):
 *   node --env-file=.env scripts/cleanup-qa-admin.mjs
 */

import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, deleteDoc, getDoc, getFirestore } from 'firebase/firestore'

const cfg = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const MASTER_EMAIL = process.env.MASTER_EMAIL || 'eugenioiromanjuan@gmail.com'
const MASTER_PASSWORD = process.env.MASTER_PASSWORD
const QA_UID = process.argv[2] || 'k7LITuSwmle0rFm9Kp48niavelr2'
const QA_USERNAME = 'qaplatformadmin'

async function main() {
  const results = {}
  if (!MASTER_PASSWORD) {
    results.error = 'MASTER_PASSWORD missing from .env'
    console.log(JSON.stringify(results, null, 2))
    return
  }
  const app = initializeApp(cfg, `cleanup-${Date.now()}`)
  const auth = getAuth(app)
  const db = getFirestore(app)
  try {
    await signInWithEmailAndPassword(auth, MASTER_EMAIL, MASTER_PASSWORD)

    // Profile + username first (while the acting master's rights are
    // certainly intact), allow-list entry last.
    for (const [label, ref] of [
      ['users', doc(db, 'users', QA_UID)],
      ['usernames', doc(db, 'usernames', QA_USERNAME)],
      ['platformAdmins', doc(db, 'platformAdmins', QA_UID)],
    ]) {
      const before = await getDoc(ref)
      if (!before.exists()) {
        results[label] = { existed: false, deleted: true }
        continue
      }
      await deleteDoc(ref)
      const after = await getDoc(ref)
      results[label] = { existed: true, deleted: !after.exists() }
    }
  } catch (e) {
    results.error = `${e.code || ''} ${e.message}`
  }
  await signOut(auth).catch(() => {})
  await deleteApp(app)
  console.log(JSON.stringify(results, null, 2))
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
