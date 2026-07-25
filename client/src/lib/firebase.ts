import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getFunctions, type Functions } from 'firebase/functions'

/**
 * Firebase configuration is read from environment variables (see `.env.example`).
 * Create a project in the Firebase console named "laundryprojectpos", register a
 * Web App, and paste the generated values into a `.env` file at the client root.
 *
 * While no config is present the app still runs against local seed data, so the
 * UI never breaks. The moment valid config is supplied it switches to live
 * Firestore automatically.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)
export { firebaseConfig }

let app: FirebaseApp | undefined
let db: Firestore | undefined
let functions: Functions | undefined

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig as Record<string, string>)
  db = getFirestore(app)
  functions = getFunctions(app)

  console.info('[Firebase] Connected to project:', firebaseConfig.projectId)
} else {

  console.warn(
    '[Firebase] No configuration found — running on local seed data. ' +
      'Add your project config to client/.env to enable the live database.',
  )
}

export { app, db, functions }
