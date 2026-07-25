import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail,
  type User as FbUser,
} from 'firebase/auth'
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { app, db, isFirebaseConfigured, firebaseConfig } from '../lib/firebase'
import { seedUsers, type UserRecord } from '../data/seeds'
import type { WithDocId } from '../hooks/useCollection'

export type { UserRole } from '../data/seeds'
export type AuthUser = UserRecord & WithDocId

interface AuthContextValue {
  user: AuthUser | null
  users: AuthUser[]
  loading: boolean
  hasSession: boolean
  login: (emailOrUsername: string, password: string) => Promise<boolean>
  logout: () => void
  /** Create a user (Firebase Auth account + profile). Returns an error message or null. */
  addUser: (payload: UserRecord & { password: string }) => Promise<string | null>
  updateUser: (row: AuthUser, changes: Partial<UserRecord>) => Promise<void>
  /** Delete a user's profile after verifying the admin's password. Returns an error or null. */
  removeUser: (row: AuthUser, adminPassword: string) => Promise<string | null>
  /** Verify the signed-in user's password (for sensitive actions). */
  verifyPassword: (password: string) => Promise<boolean>
  /** Send a password-reset email to a user. */
  sendReset: (row: AuthUser) => Promise<void>
  /** Change the signed-in user's own password (used by the forced-change screen). */
  changeOwnPassword: (newPassword: string) => Promise<void>
}

const SESSION_KEY = 'laundrypos.session.userId'
const auth = isFirebaseConfigured && app ? getAuth(app) : null

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fbUser, setFbUser] = useState<FbUser | null>(null)
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured)
  const [users, setUsers] = useState<AuthUser[]>(seedUsers)
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [localUserId, setLocalUserId] = useState<string | null>(() => (!isFirebaseConfigured ? localStorage.getItem(SESSION_KEY) : null))

  // Track Firebase auth state.
  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (current) => {
      setFbUser(current)
      setAuthReady(true)
    })
  }, [])

  // Load user profiles once signed in (roles live in the `users` collection).
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !fbUser) return
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setUsers(snapshot.docs.map((entry) => ({ ...(entry.data() as UserRecord), _docId: entry.id })))
        setUsersLoaded(true)
      },
      (error) => {
        console.error('[Auth] users listen failed:', error)
        setUsersLoaded(true)
      },
    )
    return unsubscribe
  }, [fbUser])

  const user = useMemo<AuthUser | null>(() => {
    if (isFirebaseConfigured) {
      if (!fbUser) return null
      const email = (fbUser.email || '').toLowerCase()
      return users.find((entry) => (entry.email || '').toLowerCase() === email && entry.isActive !== false) ?? null
    }
    return users.find((entry) => entry.id === localUserId) ?? null
  }, [fbUser, users, localUserId])

  const hasSession = isFirebaseConfigured ? Boolean(fbUser) : Boolean(localUserId)
  const loading = isFirebaseConfigured ? !authReady || (Boolean(fbUser) && !usersLoaded && !user) : false

  const login = async (emailOrUsername: string, password: string) => {
    let value = emailOrUsername.trim()
    if (auth) {
      // Resolve a username to its email via the public `usernames` lookup.
      if (!value.includes('@') && db) {
        try {
          const snapshot = await getDoc(doc(db, 'usernames', value.toLowerCase()))
          if (snapshot.exists()) value = (snapshot.data() as { email: string }).email
        } catch {
          /* fall through — signIn will fail as invalid */
        }
      }
      try {
        await signInWithEmailAndPassword(auth, value, password)
        return true
      } catch {
        return false
      }
    }
    const match = users.find(
      (entry) => (entry.email === value || entry.username === value) && entry.password === password && entry.isActive !== false,
    )
    if (match) {
      setLocalUserId(match.id)
      localStorage.setItem(SESSION_KEY, match.id)
      return true
    }
    return false
  }

  const logout = () => {
    if (auth) {
      void signOut(auth)
    } else {
      setLocalUserId(null)
      localStorage.removeItem(SESSION_KEY)
    }
  }

  const addUser = async (payload: UserRecord & { password: string }): Promise<string | null> => {
    if (isFirebaseConfigured && db && firebaseConfig) {
      // Use a throwaway secondary app so creating the account doesn't sign the admin out.
      const secondary = initializeApp(firebaseConfig as Record<string, string>, `secondary-${Date.now()}`)
      try {
        const cred = await createUserWithEmailAndPassword(getAuth(secondary), payload.email, payload.password)
        await setDoc(doc(db, 'users', cred.user.uid), {
          id: cred.user.uid,
          name: payload.name,
          username: payload.username,
          email: payload.email,
          role: payload.role,
          isActive: true,
          password: '',
          mustChangePassword: true,
          photo: payload.photo ?? '',
        })
        await setDoc(doc(db, 'usernames', payload.username.toLowerCase()), { email: payload.email })
        await signOut(getAuth(secondary))
        return null
      } catch (error) {
        const code = (error as { code?: string })?.code
        if (code === 'auth/email-already-in-use') return 'That email already has an account.'
        if (code === 'auth/weak-password') return 'Password must be at least 6 characters.'
        return (error as Error)?.message ?? 'Failed to create user.'
      } finally {
        await deleteApp(secondary)
      }
    }
    setUsers((previous) => [...previous, { ...payload }])
    return null
  }

  const updateUser = async (row: AuthUser, changes: Partial<UserRecord>) => {
    if (isFirebaseConfigured && db && row._docId) {
      await updateDoc(doc(db, 'users', row._docId), changes as Record<string, unknown>)
      return
    }
    setUsers((previous) => previous.map((entry) => (entry.id === row.id ? { ...entry, ...changes } : entry)))
  }

  // Verify the signed-in user's password via a throwaway secondary sign-in
  // (doesn't disturb the current session). Falls back to the local seed in dev.
  const verifyPassword = async (password: string): Promise<boolean> => {
    if (auth && firebaseConfig && user?.email) {
      const check = initializeApp(firebaseConfig as Record<string, string>, `pw-${Date.now()}`)
      try {
        await signInWithEmailAndPassword(getAuth(check), user.email, password)
        await signOut(getAuth(check))
        return true
      } catch {
        return false
      } finally {
        await deleteApp(check)
      }
    }
    return Boolean(user?.password) && password === user?.password
  }

  const removeUser = async (row: AuthUser, adminPassword: string): Promise<string | null> => {
    const ok = await verifyPassword(adminPassword)
    if (!ok) return 'Incorrect password. Please try again.'

    if (isFirebaseConfigured && db) {
      try {
        if (row._docId) await deleteDoc(doc(db, 'users', row._docId))
        if (row.username) await deleteDoc(doc(db, 'usernames', row.username.toLowerCase())).catch(() => {})
      } catch (error) {
        return `Could not delete the account. ${(error as Error)?.message ?? ''}`
      }
      return null
    }
    setUsers((previous) => previous.filter((entry) => entry.id !== row.id))
    return null
  }

  const sendReset = async (row: AuthUser) => {
    if (auth && row.email) await sendPasswordResetEmail(auth, row.email)
  }

  const changeOwnPassword = async (newPassword: string) => {
    if (auth?.currentUser) {
      await updatePassword(auth.currentUser, newPassword)
      if (db && user?._docId) await updateDoc(doc(db, 'users', user._docId), { mustChangePassword: false })
      return
    }
    if (user) {
      setUsers((previous) => previous.map((entry) => (entry.id === user.id ? { ...entry, password: newPassword, mustChangePassword: false } : entry)))
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({ user, users, loading, hasSession, login, logout, addUser, updateUser, removeUser, verifyPassword, sendReset, changeOwnPassword }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, users, loading, hasSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
