import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'

/**
 * LG account connection profile, stored in `settings/lgConnection`.
 *
 * ⚠️ SECURITY NOTE: in production the LG account `password` must NOT live in a
 * browser-readable Firestore doc — it belongs in the Cloud Function that logs
 * into Laundry Crew Manager on the owner's behalf (e.g. an encrypted secret).
 * The sync backend (functions/) reads these to log into LG. The password is
 * stored here so the Cloud Function can use it; protect this doc with Firestore
 * rules so only admins/managers can read it.
 */
export interface LgConnection {
  /** Master switch — when off, all machines behave as Manual regardless of mode. */
  enabled: boolean
  /** LG account email used on the Laundry Crew Manager site. */
  email: string
  /** LG account password (move server-side in production). */
  password: string
  region: string
  /** True once a successful login + device-list handshake has happened. */
  connected: boolean
  /** Timestamp (ms) of the last successful login. */
  connectedAt?: number
}

export const defaultLgConnection: LgConnection = {
  enabled: false,
  email: '',
  password: '',
  region: 'PH',
  connected: false,
}

/** Realtime binding to the LG connection profile with a local-state fallback. */
export function useLgConnection() {
  const [connection, setConnection] = useState<LgConnection>(defaultLgConnection)

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'lgConnection'),
      (snapshot) => {
        if (snapshot.exists()) setConnection({ ...defaultLgConnection, ...(snapshot.data() as LgConnection) })
      },
      (error) => console.error('[Firestore] listen(settings/lgConnection) failed:', error),
    )
    return unsubscribe
  }, [])

  const save = async (next: LgConnection) => {
    setConnection(next)
    if (isFirebaseConfigured && db) await setDoc(doc(db, 'settings', 'lgConnection'), next)
  }

  return { connection, save }
}
