import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBHkD9eU6zLMKFSZ2zcwvvJl1pbqs9sm1g',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'bendr-a35e7.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://bendr-a35e7-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'bendr-a35e7',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'bendr-a35e7.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1054975607766',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1054975607766:web:93f642c0e6f23943d91a77',
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
