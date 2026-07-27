import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'

/** Merchant GCash details shown to customers when paying by GCash QR. */
export interface PaymentSettings {
  gcashName: string
  gcashNumber: string
  /** GCash QR image as a base64 data URL. */
  gcashQr: string
}

export const defaultPaymentSettings: PaymentSettings = {
  gcashName: '',
  gcashNumber: '',
  gcashQr: '',
}

/** Payment settings (GCash QR/number), stored in `settings/payment`. */
export function usePaymentSettings() {
  const [payment, setPayment] = useState<PaymentSettings>(defaultPaymentSettings)

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'payment'),
      (snapshot) => {
        if (snapshot.exists()) setPayment({ ...defaultPaymentSettings, ...(snapshot.data() as PaymentSettings) })
      },
      (error) => console.error('[Firestore] listen(settings/payment) failed:', error),
    )
    return unsubscribe
  }, [])

  const save = async (next: PaymentSettings) => {
    setPayment(next)
    if (isFirebaseConfigured && db) await setDoc(doc(db, 'settings', 'payment'), next)
  }

  return { payment, save }
}
