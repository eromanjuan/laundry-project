import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { useShopId, useShop } from '../context/ShopContext'
import defaultLogo from '../assets/brand-logo.png'

/**
 * Shop branding (currently the logo), stored in
 * `shops/{shopId}/settings/branding` as a small base64 data URL. Outside a shop
 * workspace (e.g. the platform login screen) it falls back to the bundled logo.
 *
 * When saved from inside a shop workspace the logo is mirrored (best-effort)
 * onto the public `shopSlugs/{slug}` document, because the login screen is
 * unauthenticated and cannot read the shop's private settings.
 */
export function useBranding(explicitShopId?: string) {
  const contextShopId = useShopId()
  const shop = useShop()
  const shopId = explicitShopId ?? contextShopId
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogo)

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !shopId) {
      setLogoUrl(defaultLogo)
      return
    }
    const unsubscribe = onSnapshot(
      doc(db, 'shops', shopId, 'settings', 'branding'),
      (snapshot) => {
        const data = snapshot.data()
        setLogoUrl(data?.logoDataUrl ? (data.logoDataUrl as string) : defaultLogo)
      },
      (error) => console.error('[Firestore] listen(settings/branding) failed:', error),
    )
    return unsubscribe
  }, [shopId])

  // Keep the browser-tab favicon in sync with the active logo.
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (link) link.href = logoUrl
  }, [logoUrl])

  /** Mirror the logo onto the public slug doc so the login screen can show it. */
  const publishToSlug = async (dataUrl: string) => {
    if (!isFirebaseConfigured || !db || !shop?.slug) return
    try {
      await setDoc(doc(db, 'shopSlugs', shop.slug), { logoDataUrl: dataUrl, updatedAt: Date.now() }, { merge: true })
    } catch (error) {
      console.warn('[branding] could not mirror logo to public slug (admin only):', error)
    }
  }

  const saveLogo = async (dataUrl: string) => {
    setLogoUrl(dataUrl)
    if (isFirebaseConfigured && db && shopId) {
      await setDoc(doc(db, 'shops', shopId, 'settings', 'branding'), { logoDataUrl: dataUrl })
      await publishToSlug(dataUrl)
    }
  }

  const resetLogo = async () => {
    setLogoUrl(defaultLogo)
    if (isFirebaseConfigured && db && shopId) {
      await setDoc(doc(db, 'shops', shopId, 'settings', 'branding'), { logoDataUrl: '' })
      await publishToSlug('')
    }
  }

  return { logoUrl, saveLogo, resetLogo, defaultLogo }
}

/**
 * Load an image file and return a small square-ish PNG data URL (max 256px),
 * keeping it well under Firestore's 1 MB document limit.
 */
export function fileToResizedDataUrl(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const scale = Math.min(1, max / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas not supported'))
          return
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      }
      image.onerror = () => reject(new Error('Invalid image'))
      image.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}
