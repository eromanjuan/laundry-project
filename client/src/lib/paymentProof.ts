/**
 * Customer GCash proof-of-payment upload from the public tracking page.
 *
 * The customer pays the merchant's GCash QR, then uploads a screenshot of their
 * GCash receipt. It's compressed to a small JPEG data URL and written to a
 * `paymentProofs` doc (public create; staff-only read) so the store can verify
 * and settle the balance.
 */
import { doc, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { trackKey } from './tracking'

export interface PaymentProof {
  id: string
  jobKey: string
  image: string
  submittedAt: number
  reviewed?: boolean
}

/** Resize an image file to a compressed JPEG data URL (keeps it under Firestore's 1MB doc limit). */
export function resizeImageToJpeg(file: File, max = 900, quality = 0.7): Promise<string> {
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
        if (!ctx) return reject(new Error('Canvas not supported'))
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      image.onerror = () => reject(new Error('Invalid image'))
      image.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

/** Store a proof-of-payment image for a job. Returns true on success. */
export async function submitPaymentProof(jobId: string, image: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false
  const jobKey = trackKey(jobId)
  if (!jobKey || !image) return false
  try {
    // A fresh doc id each time so re-submits are allowed (public create only).
    const id = crypto.randomUUID()
    await setDoc(doc(db, 'paymentProofs', id), {
      id: jobId,
      jobKey,
      image,
      submittedAt: Date.now(),
      reviewed: false,
    })
    return true
  } catch (error) {
    console.error('[proof] submit failed:', error)
    return false
  }
}
