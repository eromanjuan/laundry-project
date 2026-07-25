import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'

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

/** Business identity used on receipts and reports, stored in `settings/business`. */
export function useBusiness() {
  const [business, setBusiness] = useState<BusinessInfo>(defaultBusiness)

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'business'),
      (snapshot) => {
        if (snapshot.exists()) setBusiness({ ...defaultBusiness, ...(snapshot.data() as BusinessInfo) })
      },
      (error) => console.error('[Firestore] listen(settings/business) failed:', error),
    )
    return unsubscribe
  }, [])

  const save = async (next: BusinessInfo) => {
    setBusiness(next)
    if (isFirebaseConfigured && db) await setDoc(doc(db, 'settings', 'business'), next)
  }

  return { business, save }
}
