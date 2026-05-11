import { get, ref, set } from 'firebase/database'
import { database } from './firebase'

const CUSTOMERS_PATH = 'customers'

export function emptyCustomerProfile() {
  return {
    company: '',
    name: '',
    street: '',
    postalCode: '',
    city: '',
    country: 'Nederland',
    phone: '',
  }
}

export async function saveCustomerProfile(uid, profile) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  await set(ref(database, `${CUSTOMERS_PATH}/${uid}`), profile)
  return profile
}

export async function loadCustomerProfile(uid) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  const snapshot = await get(ref(database, `${CUSTOMERS_PATH}/${uid}`))
  return snapshot.exists() ? snapshot.val() : null
}
