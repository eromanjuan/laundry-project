import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { defaultPricing, type PricingConfig } from '../data/pricing'

/**
 * Realtime binding to the single `settings/pricing` document, with a local
 * fallback to `defaultPricing`. `save` persists to Firestore when configured,
 * or updates in-memory state otherwise.
 */
export function usePricing() {
  const [pricing, setPricing] = useState<PricingConfig>(defaultPricing)
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured)

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return

    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'pricing'),
      (snapshot) => {
        if (snapshot.exists()) {
          setPricing({ ...defaultPricing, ...(snapshot.data() as PricingConfig) })
        }
        setLoading(false)
      },
      (error) => {
        console.error('[Firestore] listen(settings/pricing) failed:', error)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  const save = async (next: PricingConfig) => {
    setPricing(next)
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'settings', 'pricing'), next)
    }
  }

  return { pricing, loading, save }
}
