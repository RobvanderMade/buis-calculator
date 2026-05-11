import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCG8OaDlFFWSk7hTTc2r-Is-Lrdt_Mubnw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'productie-app.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://productie-app-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'productie-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'productie-app.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '411427524297',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:411427524297:web:d4bd076926e62eeb094718',
}

const hasFirebaseConfig =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.databaseURL &&
  firebaseConfig.projectId &&
  firebaseConfig.appId

export const firebaseApp = hasFirebaseConfig ? getApps()[0] || initializeApp(firebaseConfig) : null
export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const database = firebaseApp ? getDatabase(firebaseApp) : null
