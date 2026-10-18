import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { useShopId } from '../context/ShopContext'
import { defaultPricing, type PricingConfig } from '../data/pricing'

/**
 * Realtime binding to the active shop's `shops/{shopId}/settings/pricing`
 * document, with a local fallback to `defaultPricing`. `save` persists to
 * Firestore when configured, or updates in-memory state otherwise.
 */
export function usePricing() {
  const shopId = useShopId()
  const [pricing, setPricing] = useState<PricingConfig>(defaultPricing)
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured && Boolean(shopId))

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !shopId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = onSnapshot(
      doc(db, 'shops', shopId, 'settings', 'pricing'),
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
  }, [shopId])

  const save = async (next: PricingConfig) => {
    setPricing(next)
    if (isFirebaseConfigured && db && shopId) {
      await setDoc(doc(db, 'shops', shopId, 'settings', 'pricing'), next)
    }
  }

  return { pricing, loading, save }
}
