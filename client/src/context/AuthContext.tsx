import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
} from 'firebase/firestore'
import { app, db, isFirebaseConfigured, firebaseConfig } from '../lib/firebase'
import { MASTER_UID, DEV_SHOP } from '../lib/tenant'
import { seedUsers, slugify, RESERVED_SLUGS, SHOP_ROLES, type UserRecord, type ShopRecord, type ShopRole } from '../data/seeds'
import type { WithDocId } from '../hooks/useCollection'

export type { UserRole, ShopRole, ShopStatus, ShopRecord } from '../data/seeds'
export type AuthUser = UserRecord & WithDocId

/**
 * A platform administrator as stored in the `platformAdmins` allow-list.
 *
 * `promoted` marks an existing shop account that was granted master rights
 * without losing its shop role — removing it must therefore revoke only the
 * allow-list entry, never the person's shop profile.
 */
export interface PlatformAdminRecord {
  uid: string
  name: string
  email: string
  username?: string
  promoted?: boolean
  primary?: boolean
  createdAt?: number
  _docId?: string
}

/** Outcome of adding/promoting a platform administrator. */
export interface AddPlatformAdminResult {
  /** Present when the operation failed. */
  error?: string
  /** `created` = brand-new account; `promoted` = existing account granted rights. */
  mode?: 'created' | 'promoted'
}

export interface RegisterShopInput {
  shopName: string
  ownerName: string
  email: string
  contact: string
  address: string
  location: string
  password: string
}

export interface RegisterShopResult {
  ok: boolean
  slug?: string
  error?: string
}

/** Payload for creating an additional platform administrator. */
export interface AddPlatformAdminInput {
  name: string
  username: string
  email: string
  password: string
  photo?: string
}

interface AuthContextValue {
  user: AuthUser | null
  /** Staff of the signed-in user's shop (shop admins only; the master loads a
   *  shop's staff on demand via `useShopStaff`). */
  users: AuthUser[]
  loading: boolean
  hasSession: boolean
  /** True when the signed-in profile is the platform master. */
  isMaster: boolean
  /** The signed-in member's shop profile (null for the master). */
  shop: ShopRecord | null
  /** Every registered shop — only populated for the master. */
  allShops: ShopRecord[]
  /** Platform administrators (allow-list). Only populated for a master. */
  platformAdmins: PlatformAdminRecord[]
  /** Sign in with an email or username. Returns true on success. */
  login: (emailOrUsername: string, password: string) => Promise<boolean>
  logout: () => void
  /** Register a new laundry shop + owner (pending approval). */
  registerShop: (input: RegisterShopInput) => Promise<RegisterShopResult>
  /** Create a staff account. Shop owners use their own shop; the platform
   *  master passes the target shop id (`shopIdOverride`). */
  addUser: (payload: UserRecord & { password: string }, shopIdOverride?: string) => Promise<string | null>
  updateUser: (row: AuthUser, changes: Partial<UserRecord>) => Promise<void>
  removeUser: (row: AuthUser, adminPassword: string) => Promise<string | null>
  verifyPassword: (password: string) => Promise<boolean>
  sendReset: (row: AuthUser) => Promise<void>
  /** Send a password-reset email from the sign-in screen (email or username). */
  forgotPassword: (emailOrUsername: string) => Promise<void>
  changeOwnPassword: (newPassword: string) => Promise<void>
  /** Master-only: change a shop's approval status. */
  setShopStatus: (shopId: string, status: ShopRecord['status'], reason?: string) => Promise<void>
  /** Reload a single shop's record (master review). */
  getShop: (shopId: string) => Promise<ShopRecord | null>
  /** Master-only: create (or promote an existing account to) a platform administrator. */
  addPlatformAdmin: (payload: AddPlatformAdminInput) => Promise<AddPlatformAdminResult>
  /** Master-only: revoke a platform administrator (removes the allow-list entry). */
  removePlatformAdmin: (row: PlatformAdminRecord, adminPassword: string) => Promise<string | null>
}

const SESSION_KEY = 'laundrypos.session.userId'
const auth = isFirebaseConfigured && app ? getAuth(app) : null
const STAFF_ROLES: ShopRole[] = ['Manager', 'Staff/Cashier']

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fbUser, setFbUser] = useState<FbUser | null>(null)
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured)
  const [profile, setProfile] = useState<AuthUser | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [shop, setShop] = useState<ShopRecord | null>(null)
  const [staff, setStaff] = useState<AuthUser[]>([])
  const [allShops, setAllShops] = useState<ShopRecord[]>([])
  const [platformAdmins, setPlatformAdmins] = useState<PlatformAdminRecord[]>([])
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [platformAdminLoaded, setPlatformAdminLoaded] = useState(false)
  const [localUserId, setLocalUserId] = useState<string | null>(() => (!isFirebaseConfigured ? localStorage.getItem(SESSION_KEY) : null))
  const bootstrapped = useRef(false)

  // 1. Track Firebase auth state.
  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (current) => {
      setFbUser(current)
      setAuthReady(true)
    })
  }, [])

  // 2. Subscribe to the signed-in user's profile document.
  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setProfile(null)
      setProfileLoaded(true)
      return
    }
    // Auth is still resolving: remain in the loading state instead of treating
    // the absent `fbUser` as "no profile". Otherwise the render between the
    // session arriving and the profile snapshot would bounce guards (e.g. a
    // master deep-linking to /admin/settings would be sent back to /admin).
    if (!fbUser) {
      setProfile(null)
      setProfileLoaded(false)
      return
    }
    setProfileLoaded(false)
    const unsubscribe = onSnapshot(
      doc(db, 'users', fbUser.uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? ({ ...(snapshot.data() as UserRecord), _docId: snapshot.id }) : null)
        setProfileLoaded(true)
      },
      (error) => {
        console.error('[Auth] profile listen failed:', error)
        setProfileLoaded(true)
      },
    )
    return unsubscribe
  }, [fbUser])

  // 3. Bootstrap the master profile once (uid allow-listed in security rules).
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !fbUser) return
    if (fbUser.uid !== MASTER_UID || profile || profileLoaded === false) return
    if (bootstrapped.current) return
    bootstrapped.current = true
    void setDoc(doc(db, 'users', fbUser.uid), {
      id: fbUser.uid,
      uid: fbUser.uid,
      name: 'Platform Administrator',
      username: 'master',
      email: fbUser.email ?? '',
      role: 'Master',
      shopId: '',
      isActive: true,
      status: 'active',
      password: '',
      mustChangePassword: false,
      photo: '',
      createdAt: Date.now(),
    }).catch((error) => console.error('[Auth] master bootstrap failed:', error))
  }, [fbUser, profile, profileLoaded])

  // 3b. Detect platform-admin membership for the signed-in uid. A user is a
  //     platform administrator when their profile role is Master OR their uid
  //     is in the `platformAdmins` allow-list. Promoted shop accounts keep
  //     their shop role, so the allow-list — not the role — is authoritative.
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !fbUser) {
      setIsPlatformAdmin(false)
      setPlatformAdminLoaded(false)
      return
    }
    setPlatformAdminLoaded(false)
    const unsubscribe = onSnapshot(
      doc(db, 'platformAdmins', fbUser.uid),
      (snapshot) => {
        setIsPlatformAdmin(snapshot.exists())
        setPlatformAdminLoaded(true)
      },
      (error) => {
        // A missing/denied doc simply means "not a platform administrator".
        setIsPlatformAdmin(false)
        setPlatformAdminLoaded(true)
        if ((error as { code?: string })?.code !== 'permission-denied') {
          console.error('[Auth] platform-admin membership listen failed:', error)
        }
      },
    )
    return unsubscribe
  }, [fbUser])

  // 3c. The primary master's row is synthesized from its profile in effect 6.

  // 4. Load the member's shop profile.
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !profile?.shopId) {
      setShop(null)
      return
    }
    const unsubscribe = onSnapshot(
      doc(db, 'shops', profile.shopId),
      (snapshot) => setShop(snapshot.exists() ? ({ ...(snapshot.data() as ShopRecord), id: snapshot.id }) : null),
      (error) => console.error('[Auth] shop listen failed:', error),
    )
    return unsubscribe
  }, [profile?.shopId])

  // 5. Load staff (shop admins only) or all shops (master).
  const isAdmin = profile?.role === 'Administrator'
  // A platform administrator is either a dedicated master (role Master) or a
  // promoted shop account present in the `platformAdmins` allow-list.
  const isMaster = profile?.role === 'Master' || isPlatformAdmin
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !profile?.shopId || !isAdmin) {
      setStaff([])
      return
    }
    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), where('shopId', '==', profile.shopId)),
      (snapshot) => setStaff(snapshot.docs.map((entry) => ({ ...(entry.data() as UserRecord), _docId: entry.id }))),
      (error) => console.error('[Auth] staff listen failed:', error),
    )
    return unsubscribe
  }, [profile?.shopId, isAdmin])

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !isMaster) {
      setAllShops([])
      return
    }
    const unsubscribe = onSnapshot(
      collection(db, 'shops'),
      (snapshot) => setAllShops(snapshot.docs.map((entry) => ({ ...(entry.data() as ShopRecord), id: entry.id }))),
      (error) => console.error('[Auth] shops listen failed:', error),
    )
    return unsubscribe
  }, [isMaster])

  // 6. Load the platform-administrator allow-list (masters only). The primary
  //    master is always shown, synthesized from its profile when it has no
  //    explicit allow-list entry.
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !isMaster) {
      setPlatformAdmins([])
      return
    }
    const firestore = db
    let cancelled = false
    const unsubscribe = onSnapshot(
      collection(firestore, 'platformAdmins'),
      async (snapshot) => {
        const rows: PlatformAdminRecord[] = snapshot.docs.map((entry) => {
          const data = entry.data() as Partial<PlatformAdminRecord>
          return {
            uid: data.uid ?? entry.id,
            name: data.name ?? '',
            email: data.email ?? '',
            username: data.username ?? '',
            promoted: Boolean(data.promoted),
            primary: Boolean(data.primary),
            createdAt: data.createdAt,
            _docId: entry.id,
          }
        })
        if (!rows.some((row) => row.uid === MASTER_UID)) {
          try {
            const primarySnap = await getDoc(doc(firestore, 'users', MASTER_UID))
            if (!cancelled && primarySnap.exists()) {
              const data = primarySnap.data() as UserRecord
              rows.unshift({
                uid: MASTER_UID,
                name: data.name ?? 'Primary administrator',
                email: data.email ?? '',
                username: data.username ?? '',
                primary: true,
                _docId: MASTER_UID,
              })
            }
          } catch {
            /* best effort */
          }
        }
        if (!cancelled) setPlatformAdmins(rows)
      },
      (error) => console.error('[Auth] platform admins listen failed:', error),
    )
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [isMaster])

  const user = useMemo<AuthUser | null>(() => {
    if (isFirebaseConfigured) {
      if (!fbUser) return null
      // Master may not have an approved/active flag — treat the allow-listed
      // uid (or role Master) as valid. Everyone else must be enabled.
      if (profile?.role === 'Master') return profile
      return profile && profile.isActive !== false ? profile : null
    }
    return seedUsers.find((entry) => entry.id === localUserId) ?? null
  }, [fbUser, profile, localUserId])

  const shopForUser = useMemo<ShopRecord | null>(() => {
    if (isFirebaseConfigured) return shop
    return DEV_SHOP
  }, [shop])

  const hasSession = isFirebaseConfigured ? Boolean(fbUser) : Boolean(localUserId)
  const loading = isFirebaseConfigured
    ? !authReady || (Boolean(fbUser) && (!profileLoaded || !platformAdminLoaded))
    : false

  const login = async (emailOrUsername: string, password: string) => {
    let value = emailOrUsername.trim()
    if (auth) {
      if (!value.includes('@') && db) {
        try {
          const snapshot = await getDoc(doc(db, 'usernames', value.toLowerCase()))
          if (snapshot.exists()) value = (snapshot.data() as { email: string }).email
        } catch {
          /* fall through */
        }
      }
      try {
        await signInWithEmailAndPassword(auth, value, password)
        return true
      } catch {
        return false
      }
    }
    const match = seedUsers.find(
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
    if (auth) void signOut(auth)
    else {
      setLocalUserId(null)
      localStorage.removeItem(SESSION_KEY)
    }
  }

  /** Derive a unique username from an email local-part. */
  const uniqueUsername = async (email: string, reserved: Set<string>): Promise<string> => {
    const base = slugify(email.split('@')[0] || 'user') || 'user'
    let candidate = base
    let n = 1
    while (reserved.has(candidate)) {
      candidate = `${base}${n}`
      n += 1
    }
    if (db) {
      // Walk until the username doc is unused.
      for (let i = 0; i < 50; i += 1) {
        const snap = await getDoc(doc(db, 'usernames', candidate))
        if (!snap.exists()) break
        candidate = `${base}${i + 1}`
      }
    }
    return candidate
  }

  const registerShop = useCallback(async (input: RegisterShopInput): Promise<RegisterShopResult> => {
    if (!isFirebaseConfigured || !auth || !db) {
      return { ok: false, error: 'Firebase is not configured.' }
    }
    const shopName = input.shopName.trim()
    const slug = slugify(shopName)
    if (!shopName) return { ok: false, error: 'Please enter a shop name.' }
    if (!slug) return { ok: false, error: 'That shop name cannot form a web address. Try letters and numbers.' }
    if (RESERVED_SLUGS.has(slug)) return { ok: false, error: 'That shop name is reserved. Please choose another.' }
    if (input.password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }

    try {
      const existing = await getDoc(doc(db, 'shopSlugs', slug))
      if (existing.exists()) return { ok: false, error: 'That shop web address is already taken. Try a different shop name.' }
    } catch {
      return { ok: false, error: 'Could not verify the shop address. Please try again.' }
    }

    let uid: string
    try {
      const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password)
      uid = cred.user.uid
    } catch (error) {
      const code = (error as { code?: string })?.code
      if (code === 'auth/email-already-in-use') return { ok: false, error: 'That email already has an account.' }
      if (code === 'auth/invalid-email') return { ok: false, error: 'Please enter a valid email address.' }
      if (code === 'auth/weak-password') return { ok: false, error: 'Password must be at least 6 characters.' }
      return { ok: false, error: (error as Error)?.message ?? 'Could not create the account.' }
    }

    const shopRef = doc(collection(db, 'shops'))
    const shopId = shopRef.id
    const username = await uniqueUsername(input.email.trim(), RESERVED_SLUGS)

    try {
      // Order matters: the slug/user rules verify the shop already exists.
      await setDoc(shopRef, {
        id: shopId,
        name: shopName,
        slug,
        ownerUid: uid,
        ownerName: input.ownerName.trim(),
        ownerEmail: input.email.trim(),
        contact: input.contact.trim(),
        address: input.address.trim(),
        location: input.location.trim(),
        status: 'pending',
        createdAt: Date.now(),
      } satisfies ShopRecord & { id: string })

      await setDoc(doc(db, 'shopSlugs', slug), {
        shopId,
        slug,
        name: shopName,
        status: 'pending',
        ownerUid: uid,
        updatedAt: Date.now(),
      })

      await setDoc(doc(db, 'users', uid), {
        id: uid,
        uid,
        name: input.ownerName.trim(),
        username,
        email: input.email.trim(),
        role: 'Administrator',
        shopId,
        shopSlug: slug,
        status: 'pending',
        isActive: true,
        password: '',
        mustChangePassword: false,
        photo: '',
        createdAt: Date.now(),
      })

      await setDoc(doc(db, 'usernames', username), { email: input.email.trim(), uid, shopId })
      return { ok: true, slug }
    } catch (error) {
      console.error('[Auth] registration write failed:', error)
      return { ok: false, error: 'Your account was created, but the shop could not be set up. Please contact support.' }
    }
  }, [])

  const addUser = async (
    payload: UserRecord & { password: string },
    shopIdOverride?: string,
  ): Promise<string | null> => {
    if (!isFirebaseConfigured || !db || !firebaseConfig) {
      setStaff((previous) => [...previous, { ...payload }])
      return null
    }
    // Shop owners create staff in their own shop; the platform master (who is
    // not a member of any shop) passes the target shop explicitly.
    const targetShopId = shopIdOverride?.trim() || profile?.shopId || ''
    if (!targetShopId) return 'You are not assigned to a shop.'
    // Shop owners may only mint Manager / Staff-Cashier accounts. The platform
    // master may also create shop Administrators.
    const allowedRoles = isMaster ? SHOP_ROLES : STAFF_ROLES
    if (!allowedRoles.includes(payload.role as ShopRole)) {
      return isMaster ? 'Unsupported role.' : 'Only Manager or Cashier roles can be created here.'
    }

    // Verify the target shop exists and capture its slug for the new profile.
    const shopSnap = await getDoc(doc(db, 'shops', targetShopId))
    if (!shopSnap.exists()) return 'That shop no longer exists.'
    const targetSlug = (shopSnap.data() as ShopRecord).slug ?? ''

    // A throwaway secondary app keeps the owner signed in while creating staff.
    const secondary = initializeApp(firebaseConfig as Record<string, string>, `secondary-${Date.now()}`)
    try {
      const cred = await createUserWithEmailAndPassword(getAuth(secondary), payload.email.trim(), payload.password)
      const uid = cred.user.uid
      await setDoc(doc(db, 'users', uid), {
        id: uid,
        uid,
        name: payload.name,
        username: payload.username,
        email: payload.email.trim(),
        role: payload.role,
        shopId: targetShopId,
        shopSlug: targetSlug,
        status: 'active',
        isActive: true,
        password: '',
        mustChangePassword: true,
        photo: payload.photo ?? '',
        createdAt: Date.now(),
      })
      await setDoc(doc(db, 'usernames', payload.username.toLowerCase()), {
        email: payload.email.trim(),
        uid,
        shopId: targetShopId,
      })
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

  const updateUser = async (row: AuthUser, changes: Partial<UserRecord>) => {
    if (isFirebaseConfigured && db && row._docId) {
      await updateDoc(doc(db, 'users', row._docId), changes as Record<string, unknown>)
      return
    }
    setStaff((previous) => previous.map((entry) => (entry.id === row.id ? { ...entry, ...changes } : entry)))
  }

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
    // Shop owners cannot remove an Administrator; the platform master can.
    if (!isMaster && row.role === 'Administrator') return 'You cannot remove a shop administrator.'

    if (isFirebaseConfigured && db) {
      try {
        if (row._docId) await deleteDoc(doc(db, 'users', row._docId))
        if (row.username) await deleteDoc(doc(db, 'usernames', row.username.toLowerCase())).catch(() => {})
        // The Firebase Auth account itself can only be removed with the Admin
        // SDK (unavailable on the Spark plan). Without a profile document the
        // account is inert: security rules deny all shop access.
      } catch (error) {
        return `Could not delete the account. ${(error as Error)?.message ?? ''}`
      }
      return null
    }
    setStaff((previous) => previous.filter((entry) => entry.id !== row.id))
    return null
  }

  const sendReset = async (row: AuthUser) => {
    if (auth && row.email) await sendPasswordResetEmail(auth, row.email)
  }

  const forgotPassword = async (emailOrUsername: string) => {
    if (!auth) return
    let value = emailOrUsername.trim()
    if (value && !value.includes('@') && db) {
      const snapshot = await getDoc(doc(db, 'usernames', value.toLowerCase()))
      if (snapshot.exists()) value = (snapshot.data() as { email: string }).email
    }
    if (value) await sendPasswordResetEmail(auth, value)
  }

  const changeOwnPassword = async (newPassword: string) => {
    if (auth?.currentUser) {
      await updatePassword(auth.currentUser, newPassword)
      if (db && user?._docId) await updateDoc(doc(db, 'users', user._docId), { mustChangePassword: false })
      return
    }
    if (user) {
      setStaff((previous) => previous.map((entry) => (entry.id === user.id ? { ...entry, password: newPassword, mustChangePassword: false } : entry)))
    }
  }

  const setShopStatus = async (shopId: string, status: ShopRecord['status'], reason?: string) => {
    if (!isFirebaseConfigured || !db) return
    const changes: Record<string, unknown> = { status }
    if (status === 'active') {
      changes.approvedAt = Date.now()
      changes.approvedBy = fbUser?.uid ?? ''
      changes.rejectedReason = ''
    }
    if (status === 'rejected') changes.rejectedReason = reason ?? ''
    await updateDoc(doc(db, 'shops', shopId), changes)
    // Keep the public slug doc in sync so login branding reflects status.
    try {
      const rows = await getDocs(query(collection(db, 'shopSlugs'), where('shopId', '==', shopId)))
      await Promise.all(rows.docs.map((entry) => updateDoc(entry.ref, { status, updatedAt: Date.now() })))
    } catch {
      /* best effort */
    }
  }

  const getShop = async (shopId: string): Promise<ShopRecord | null> => {
    if (!isFirebaseConfigured || !db) return null
    const snap = await getDoc(doc(db, 'shops', shopId))
    return snap.exists() ? ({ ...(snap.data() as ShopRecord), id: snap.id }) : null
  }

  /** Create an extra platform administrator (master-only), or promote an
   *  existing account when the email already belongs to one. Promotion only
   *  adds the uid to the `platformAdmins` allow-list, so the person keeps their
   *  shop role and profile. New accounts get a throwaway-app Auth user (which
   *  keeps the signed-in master signed in) plus profile + allow-list docs. */
  const addPlatformAdmin = async (payload: AddPlatformAdminInput): Promise<AddPlatformAdminResult> => {
    const name = payload.name.trim()
    const email = payload.email.trim()
    const username = payload.username.trim().toLowerCase()

    if (!isFirebaseConfigured || !db || !firebaseConfig) {
      setPlatformAdmins((previous) => [
        ...previous,
        { uid: `pm${Date.now()}`, name, email, username, createdAt: Date.now() },
      ])
      return { mode: 'created' }
    }
    if (!email) return { error: 'Enter the email address of the account to add or promote.' }

    // 1. Does an account already exist for this email? If so, promote it rather
    //    than failing (Firebase Auth forbids a second account on the same email).
    let existing: { uid: string; name: string; email: string; username?: string } | null = null
    try {
      const rows = await getDocs(query(collection(db, 'users'), where('email', '==', email)))
      if (!rows.empty) {
        // Prefer a profile whose doc id is its Auth uid (our own convention);
        // fall back to the first match for legacy profiles.
        const doc0 = rows.docs.find((d) => d.id === (d.data() as UserRecord).uid) ?? rows.docs[0]
        const data = doc0.data() as UserRecord
        existing = {
          uid: (data.uid as string) || doc0.id,
          name: data.name || email,
          email: data.email || email,
          username: data.username,
        }
      }
    } catch (error) {
      return { error: `Could not look up that email. ${(error as Error)?.message ?? ''}` }
    }

    if (existing) {
      if (existing.uid === fbUser?.uid) return { error: 'You already have platform administrator access.' }
      try {
        await setDoc(
          doc(db, 'platformAdmins', existing.uid),
          {
            uid: existing.uid,
            name: existing.name,
            email: existing.email,
            username: existing.username ?? '',
            promoted: true,
            createdAt: Date.now(),
            createdBy: fbUser?.uid ?? '',
          },
          { merge: true },
        )
        return { mode: 'promoted' }
      } catch (error) {
        return { error: `Could not promote that account. ${(error as Error)?.message ?? ''}` }
      }
    }

    // 2. No existing account — create a dedicated platform administrator.
    if (!name || !username) {
      return { error: 'Fill in name, username, and email, or use an email that already has an account.' }
    }
    if (payload.password.length < 6) return { error: 'Password must be at least 6 characters.' }

    // Usernames must be unique platform-wide (the sign-in screen resolves them).
    try {
      const taken = await getDoc(doc(db, 'usernames', username))
      if (taken.exists()) return { error: 'That username is already taken.' }
    } catch {
      return { error: 'Could not verify the username. Please try again.' }
    }

    const secondary = initializeApp(firebaseConfig as Record<string, string>, `master-${Date.now()}`)
    try {
      const cred = await createUserWithEmailAndPassword(getAuth(secondary), email, payload.password)
      const uid = cred.user.uid
      // Order matters: `platformAdmins` grants the uid master rights, so the
      // profile can be written under that authority.
      await setDoc(doc(db, 'platformAdmins', uid), {
        uid,
        email,
        name,
        username,
        createdAt: Date.now(),
        createdBy: fbUser?.uid ?? '',
      })
      await setDoc(doc(db, 'users', uid), {
        id: uid,
        uid,
        name,
        username,
        email,
        role: 'Master',
        shopId: '',
        status: 'active',
        isActive: true,
        password: '',
        mustChangePassword: true,
        photo: payload.photo ?? '',
        createdAt: Date.now(),
      })
      await setDoc(doc(db, 'usernames', username), { email, uid, shopId: '' })
      await signOut(getAuth(secondary))
      return { mode: 'created' }
    } catch (error) {
      const code = (error as { code?: string })?.code
      if (code === 'auth/email-already-in-use') return { error: 'That email already has an account.' }
      if (code === 'auth/weak-password') return { error: 'Password must be at least 6 characters.' }
      if (code === 'auth/invalid-email') return { error: 'Please enter a valid email address.' }
      return { error: (error as Error)?.message ?? 'Failed to create the platform administrator.' }
    } finally {
      await deleteApp(secondary)
    }
  }

  /** Revoke a platform administrator. Deleting the `platformAdmins` allow-list
   *  entry cuts off access immediately. A dedicated account's profile is also
   *  removed (its Auth login is left inert — purging it needs the Admin SDK,
   *  unavailable on Spark); a promoted account keeps its shop profile. */
  const removePlatformAdmin = async (row: PlatformAdminRecord, adminPassword: string): Promise<string | null> => {
    const ok = await verifyPassword(adminPassword)
    if (!ok) return 'Incorrect password. Please try again.'
    const uid = row.uid ?? row._docId ?? ''
    if (uid === MASTER_UID) return 'The primary platform administrator cannot be removed.'
    if (uid === fbUser?.uid) return 'You cannot remove your own account.'

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'platformAdmins', uid)).catch(() => {})
        // A promoted account is still a shop user — keep its profile/username.
        if (!row.promoted) {
          const profileId = row._docId ?? uid
          await deleteDoc(doc(db, 'users', profileId)).catch(() => {})
          if (row.username) await deleteDoc(doc(db, 'usernames', row.username.toLowerCase())).catch(() => {})
        }
      } catch (error) {
        return `Could not remove the administrator. ${(error as Error)?.message ?? ''}`
      }
      return null
    }
    setPlatformAdmins((previous) => previous.filter((entry) => entry.uid !== row.uid))
    return null
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      users: staff,
      loading,
      hasSession,
      isMaster,
      shop: shopForUser,
      allShops,
      platformAdmins,
      login,
      logout,
      registerShop,
      addUser,
      updateUser,
      removeUser,
      verifyPassword,
      sendReset,
      forgotPassword,
      changeOwnPassword,
      setShopStatus,
      getShop,
      addPlatformAdmin,
      removePlatformAdmin,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, staff, loading, hasSession, isMaster, shopForUser, allShops, platformAdmins],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
