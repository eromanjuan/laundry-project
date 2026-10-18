import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { DEV_SHOP } from '../lib/tenant'
import type { ShopRecord, ShopSlugRecord } from '../data/seeds'

export interface ResolvedShop {
  shop: ShopRecord | null
  slugRecord: ShopSlugRecord | null
  loading: boolean
}

/**
 * Resolve a shop slug to its tenant record. Public (the `shopSlugs` lookup is
 * world-readable and contains no private data); the returned shop profile is
 * only readable by that shop's members and the master, so `shop` may be null
 * for a member of another shop — the guard treats that as "not found".
 */
export function useShopBySlug(slug?: string): ResolvedShop {
  const [slugRecord, setSlugRecord] = useState<ShopSlugRecord | null>(null)
  const [shop, setShop] = useState<ShopRecord | null>(null)
  const [slugLoading, setSlugLoading] = useState(true)
  const [shopLoading, setShopLoading] = useState(false)

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setShop(slug ? { ...DEV_SHOP, slug } : null)
      setSlugLoading(false)
      return
    }
    if (!slug) {
      setSlugRecord(null)
      setShop(null)
      setSlugLoading(false)
      return
    }
    setSlugLoading(true)
    const unsubscribe = onSnapshot(
      doc(db, 'shopSlugs', slug),
      (snapshot) => {
        setSlugRecord(snapshot.exists() ? (snapshot.data() as ShopSlugRecord) : null)
        setSlugLoading(false)
      },
      (error) => {
        console.error('[shop] slug lookup failed:', error)
        setSlugLoading(false)
      },
    )
    return unsubscribe
  }, [slug])

  const shopId = slugRecord?.shopId

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !shopId) {
      if (isFirebaseConfigured) setShop(null)
      setShopLoading(false)
      return
    }
    setShopLoading(true)
    const unsubscribe = onSnapshot(
      doc(db, 'shops', shopId),
      (snapshot) => {
        setShop(snapshot.exists() ? ({ ...(snapshot.data() as ShopRecord), id: snapshot.id }) : null)
        setShopLoading(false)
      },
      (error) => {
        console.error('[shop] profile lookup failed:', error)
        setShopLoading(false)
      },
    )
    return unsubscribe
  }, [shopId])

  return { shop, slugRecord, loading: slugLoading || shopLoading }
}
