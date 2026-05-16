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

const REQUIRED_PROFILE_FIELDS = [
  ['name', 'Naam'],
  ['street', 'Straat en huisnummer'],
  ['postalCode', 'Postcode'],
  ['city', 'Plaats'],
  ['country', 'Land'],
  ['phone', 'Telefoon'],
]

/** @returns {string | null} Foutmelding of null als alles ingevuld is (bedrijfsnaam optioneel). */
export function validateCustomerProfile(profile) {
  for (const [key, label] of REQUIRED_PROFILE_FIELDS) {
    if (!String(profile?.[key] ?? '').trim()) {
      return `Vul ${label} in.`
    }
  }
  return null
}

export function normalizeCustomerProfile(profile) {
  return {
    company: String(profile?.company ?? '').trim(),
    name: String(profile?.name ?? '').trim(),
    street: String(profile?.street ?? '').trim(),
    postalCode: String(profile?.postalCode ?? '').trim(),
    city: String(profile?.city ?? '').trim(),
    country: String(profile?.country ?? '').trim(),
    phone: String(profile?.phone ?? '').trim(),
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
