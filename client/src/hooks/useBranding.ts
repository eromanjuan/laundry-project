import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import defaultLogo from '../assets/brand-logo.png'

/**
 * App branding (currently the logo), stored in `settings/branding` as a small
 * base64 data URL. Falls back to the bundled default logo when none is set.
 */
export function useBranding() {
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogo)

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'branding'),
      (snapshot) => {
        const data = snapshot.data()
        setLogoUrl(data?.logoDataUrl ? (data.logoDataUrl as string) : defaultLogo)
      },
      (error) => console.error('[Firestore] listen(settings/branding) failed:', error),
    )
    return unsubscribe
  }, [])

  // Keep the browser-tab favicon in sync with the active logo.
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (link) link.href = logoUrl
  }, [logoUrl])

  const saveLogo = async (dataUrl: string) => {
    setLogoUrl(dataUrl)
    if (isFirebaseConfigured && db) await setDoc(doc(db, 'settings', 'branding'), { logoDataUrl: dataUrl })
  }

  const resetLogo = async () => {
    setLogoUrl(defaultLogo)
    if (isFirebaseConfigured && db) await setDoc(doc(db, 'settings', 'branding'), { logoDataUrl: '' })
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
