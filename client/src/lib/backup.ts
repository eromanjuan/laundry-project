import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { downloadJson } from './exports'

const COLLECTIONS = [
  'users',
  'customers',
  'orders',
  'claims',
  'payments',
  'expenses',
  'cashPayments',
  'collections',
  'machines',
  'activity',
]

const SETTINGS_DOCS = ['pricing', 'branding', 'business']

/** Read every collection + settings doc and download them as a single JSON backup. */
export async function backupDatabase() {
  if (!isFirebaseConfigured || !db) {
    downloadJson('laundry-backup', { note: 'Firebase not configured — nothing to back up.' })
    return
  }

  const data: Record<string, unknown> = { exportedAt: new Date().toISOString() }

  for (const name of COLLECTIONS) {
    const snapshot = await getDocs(collection(db, name))
    data[name] = snapshot.docs.map((entry) => ({ _docId: entry.id, ...entry.data() }))
  }

  const settings: Record<string, unknown> = {}
  for (const id of SETTINGS_DOCS) {
    const snapshot = await getDoc(doc(db, 'settings', id))
    if (snapshot.exists()) settings[id] = snapshot.data()
  }
  data.settings = settings

  downloadJson(`laundry-backup-${new Date().toISOString().slice(0, 10)}`, data)
}

/** Restore collections + settings from a backup JSON object (writes to Firestore). */
export async function restoreDatabase(data: Record<string, unknown>) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured')
  const database = db

  for (const name of COLLECTIONS) {
    const rows = data[name]
    if (!Array.isArray(rows)) continue
    const batch = writeBatch(database)
    for (const row of rows as Array<Record<string, unknown>>) {
      const { _docId, ...rest } = row
      const ref = _docId ? doc(database, name, String(_docId)) : doc(collection(database, name))
      batch.set(ref, rest)
    }
    await batch.commit()
  }

  const settings = data.settings as Record<string, unknown> | undefined
  if (settings) {
    for (const [id, value] of Object.entries(settings)) {
      await setDoc(doc(database, 'settings', id), value as Record<string, unknown>)
    }
  }
}

