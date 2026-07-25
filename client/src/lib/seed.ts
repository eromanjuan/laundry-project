import { collection, doc, getDoc, getDocs, limit, query, setDoc, writeBatch } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { seedRegistry } from '../data/seeds'

let seedPromise: Promise<void> | null = null

/**
 * Seed the database with sample data EXACTLY ONCE, ever. A `_meta/seeded` flag
 * doc records that seeding has run; once it exists we never seed again — so
 * deleting records (even emptying a whole collection) will not bring samples
 * back on the next refresh.
 */
export function seedDatabaseOnce(): Promise<void> {
  if (!isFirebaseConfigured || !db) return Promise.resolve()
  if (seedPromise) return seedPromise

  seedPromise = (async () => {
    const database = db!
    const flagRef = doc(database, '_meta', 'seeded')

    try {
      const flag = await getDoc(flagRef)
      if (flag.exists()) return // already seeded once — never seed again

      for (const [name, rows] of Object.entries(seedRegistry)) {
        // Skip any collection that already has data (don't duplicate).
        const existing = await getDocs(query(collection(database, name), limit(1)))
        if (!existing.empty) continue

        const batch = writeBatch(database)
        rows.forEach((row, index) => {
          const ref = doc(collection(database, name))
          batch.set(ref, { ...row, createdAt: Date.now() + index })
        })
        await batch.commit()
        console.info(`[Firestore] Seeded "${name}" with ${rows.length} record(s).`)
      }

      await setDoc(flagRef, { seededAt: Date.now() })
    } catch {
      // Expected when running before sign-in under locked security rules — the
      // database is already seeded, so there is nothing to do here.
    }
  })()

  return seedPromise
}
