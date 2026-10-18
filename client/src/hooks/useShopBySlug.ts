import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { DEV_SHOP } from '../lib/tenant'
import type { ShopRecord, ShopSlugRecord } from '../data/seeds'
import { useResetOnChange } from './useResetOnChange'

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
 *
 * Without Firebase configured (local dev) it falls back to the bundled
 * DEV_SHOP — derived during render rather than pushed through state, so there
 * is no effect-driven render just to install a constant.
 */
export function useShopBySlug(slug?: string): ResolvedShop {
  const live = Boolean(isFirebaseConfigured && db)
  const [slugRecord, setSlugRecord] = useState<ShopSlugRecord | null>(null)
  const [shopFromDb, setShopFromDb] = useState<ShopRecord | null>(null)
  const [slugLoading, setSlugLoading] = useState(live)
  const [shopLoading, setShopLoading] = useState(false)

  // Each new slug starts from a clean slate instead of briefly rendering the
  // previous slug's shop while the lookup runs.
  useResetOnChange(slug ?? '', () => {
    setSlugRecord(null)
    setShopFromDb(null)
    setSlugLoading(live && Boolean(slug))
    setShopLoading(false)
  })

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !slug) return
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

  // Same for the resolved shop profile once the slug points somewhere new.
  useResetOnChange(`${shopId ?? ''}|${live ? 'live' : 'local'}`, () => {
    setShopFromDb(null)
    setShopLoading(Boolean(shopId))
  })

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !shopId) return
    const unsubscribe = onSnapshot(
      doc(db, 'shops', shopId),
      (snapshot) => {
        setShopFromDb(snapshot.exists() ? ({ ...(snapshot.data() as ShopRecord), id: snapshot.id }) : null)
        setShopLoading(false)
      },
      (error) => {
        console.error('[shop] profile lookup failed:', error)
        setShopLoading(false)
      },
    )
    return unsubscribe
  }, [shopId])

  // Local dev, or before any Firebase read resolves: synthesise the shop from
  // the slug instead of storing it.
  const shop = live ? shopFromDb : slug ? { ...DEV_SHOP, slug } : null

  return { shop, slugRecord, loading: live && (slugLoading || shopLoading) }
}