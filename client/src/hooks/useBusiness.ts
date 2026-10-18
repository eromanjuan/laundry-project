import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { useShopId } from '../context/ShopContext'

export interface BusinessInfo {
  name: string
  branch: string
  address: string
  contact: string
  tin: string
  footer: string
}

export const defaultBusiness: BusinessInfo = {
  name: 'Laundry Project',
  branch: 'Main Branch',
  address: '',
  contact: '',
  tin: '',
  footer: 'Thank you! Please keep this receipt.',
}

/**
 * The active shop's business identity, stored in
 * `shops/{shopId}/settings/business` and used on receipts and reports.
 */
export function useBusiness() {
  const shopId = useShopId()
  const [business, setBusiness] = useState<BusinessInfo>(defaultBusiness)

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !shopId) return
    const unsubscribe = onSnapshot(
      doc(db, 'shops', shopId, 'settings', 'business'),
      (snapshot) => {
        if (snapshot.exists()) setBusiness({ ...defaultBusiness, ...(snapshot.data() as BusinessInfo) })
      },
      (error) => console.error('[Firestore] listen(settings/business) failed:', error),
    )
    return unsubscribe
  }, [shopId])

  const save = async (next: BusinessInfo) => {
    setBusiness(next)
    if (isFirebaseConfigured && db && shopId) await setDoc(doc(db, 'shops', shopId, 'settings', 'business'), next)
  }

  return { business, save }
}
