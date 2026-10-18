import { collection, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { downloadJson } from './exports'
import { TENANT_COLLECTIONS, type ShopSettingKey } from './tenant'
import { getActiveShopId } from './activeShop'

const SHOP_SETTINGS: ShopSettingKey[] = ['pricing', 'branding', 'business', 'payment', 'lgConnection']

/**
 * Read every tenant collection (filtered to the active shop) plus that shop's
 * settings documents and download them as a single JSON backup. The export is
 * scoped to one shop and stamped with its id so restores can't cross shops.
 */
export async function backupDatabase() {
  const shopId = getActiveShopId()
  if (!isFirebaseConfigured || !db || !shopId) {
    downloadJson('laundry-backup', { note: 'No shop workspace is active — nothing to back up.' })
    return
  }

  const data: Record<string, unknown> = { exportedAt: new Date().toISOString(), shopId }

  for (const name of TENANT_COLLECTIONS) {
    const snapshot = await getDocs(query(collection(db, name), where('shopId', '==', shopId)))
    data[name] = snapshot.docs.map((entry) => ({ _docId: entry.id, ...entry.data() }))
  }

  const settings: Record<string, unknown> = {}
  for (const key of SHOP_SETTINGS) {
    const snapshot = await getDoc(doc(db, 'shops', shopId, 'settings', key))
    if (snapshot.exists()) settings[key] = snapshot.data()
  }
  data.settings = settings

  downloadJson(`laundry-backup-${shopId}-${new Date().toISOString().slice(0, 10)}`, data)
}

/** Restore collections + settings from a backup JSON object into the active shop. */
export async function restoreDatabase(data: Record<string, unknown>) {
  const shopId = getActiveShopId()
  if (!isFirebaseConfigured || !db || !shopId) throw new Error('No shop workspace is active')
  const database = db
  const sourceShop = typeof data.shopId === 'string' ? data.shopId : shopId
  if (sourceShop && sourceShop !== shopId) {
    throw new Error('This backup belongs to a different shop and cannot be restored here.')
  }

  for (const name of TENANT_COLLECTIONS) {
    const rows = data[name]
    if (!Array.isArray(rows)) continue
    const batch = writeBatch(database)
    for (const row of rows as Array<Record<string, unknown>>) {
      const { _docId, ...rest } = row
      const ref = _docId ? doc(database, name, String(_docId)) : doc(collection(database, name))
      batch.set(ref, { ...rest, shopId })
    }
    await batch.commit()
  }

  const settings = data.settings as Record<string, unknown> | undefined
  if (settings) {
    for (const [key, value] of Object.entries(settings)) {
      await setDoc(doc(database, 'shops', shopId, 'settings', key), value as Record<string, unknown>)
    }
  }
}
