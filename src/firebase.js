import { getApps, initializeApp } from 'firebase/app'
import { browserLocalPersistence, getAuth, initializeAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

function envValue(key, fallback) {
  const raw = import.meta.env[key]
  if (raw == null || String(raw).trim() === '') return fallback
  return String(raw).trim()
}

const firebaseConfig = {
  apiKey: envValue('VITE_FIREBASE_API_KEY', 'AIzaSyBHkD9eU6zLMKFSZ2zcwvvJl1pbqs9sm1g'),
  authDomain: envValue('VITE_FIREBASE_AUTH_DOMAIN', 'bendr-a35e7.firebaseapp.com'),
  databaseURL: envValue(
    'VITE_FIREBASE_DATABASE_URL',
    'https://bendr-a35e7-default-rtdb.europe-west1.firebasedatabase.app',
  ),
  projectId: envValue('VITE_FIREBASE_PROJECT_ID', 'bendr-a35e7'),
  storageBucket: envValue(
    'VITE_FIREBASE_STORAGE_BUCKET',
    'bendr-a35e7.firebasestorage.app',
  ),
  messagingSenderId: envValue('VITE_FIREBASE_MESSAGING_SENDER_ID', '1054975607766'),
  appId: envValue('VITE_FIREBASE_APP_ID', '1:1054975607766:web:93f642c0e6f23943d91a77'),
}

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
)

function createAuth(app) {
  try {
    return initializeAuth(app, {
      persistence: browserLocalPersistence,
    })
  } catch (error) {
    const message = String(error?.message || '')
    if (message.includes('already initialized') || error?.code === 'auth/already-initialized') {
      return getAuth(app)
    }
    throw error
  }
}

export const firebaseApp = hasFirebaseConfig
  ? getApps()[0] || initializeApp(firebaseConfig)
  : null

export const auth = firebaseApp ? createAuth(firebaseApp) : null
export const database = firebaseApp ? getDatabase(firebaseApp) : null

if (import.meta.env.DEV && firebaseApp) {
  const usingEnvFile = Boolean(import.meta.env.VITE_FIREBASE_API_KEY)
  if (!usingEnvFile) {
    console.info('[Firebase] Standaard projectconfiguratie wordt gebruikt (geen .env).')
  }
}
