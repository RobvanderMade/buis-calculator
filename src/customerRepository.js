import { get, onValue, ref, set } from 'firebase/database'
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

const ADDRESS_PROFILE_FIELDS = [
  ['street', 'Straat en huisnummer'],
  ['postalCode', 'Postcode'],
  ['city', 'Plaats'],
  ['country', 'Land'],
]

const REQUIRED_PROFILE_FIELDS = [
  ['name', 'Naam'],
  ...ADDRESS_PROFILE_FIELDS,
  ['phone', 'Telefoon'],
]

/** @returns {string | null} Foutmelding of null als adresvelden ingevuld zijn. */
export function validateCustomerAddress(profile) {
  for (const [key, label] of ADDRESS_PROFILE_FIELDS) {
    if (!String(profile?.[key] ?? '').trim()) {
      return `Vul ${label} in.`
    }
  }
  return null
}

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
  const normalized = {
    company: String(profile?.company ?? '').trim(),
    name: String(profile?.name ?? '').trim(),
    street: String(profile?.street ?? '').trim(),
    postalCode: String(profile?.postalCode ?? '').trim(),
    city: String(profile?.city ?? '').trim(),
    country: String(profile?.country ?? '').trim(),
    phone: String(profile?.phone ?? '').trim(),
  }
  const email = String(profile?.email ?? '').trim()
  if (email) normalized.email = email
  if (profile?.createdAt) normalized.createdAt = profile.createdAt
  if (profile?.uid) normalized.uid = String(profile.uid)
  return normalized
}

export function mapCustomerRecord(uid, data) {
  const profile = normalizeCustomerProfile({ uid, ...data })
  return {
    uid,
    ...profile,
    email: profile.email || String(data?.email ?? '').trim(),
    createdAt: profile.createdAt || data?.createdAt || '',
  }
}

export function mapCustomersSnapshot(snapshot) {
  if (!snapshot?.exists?.() || !snapshot.exists()) return []
  return Object.entries(snapshot.val())
    .map(([uid, data]) => mapCustomerRecord(uid, data))
    .sort((a, b) => {
      const nameCmp = (a.name || '').localeCompare(b.name || '', 'nl', { sensitivity: 'base' })
      if (nameCmp !== 0) return nameCmp
      return (a.email || '').localeCompare(b.email || '', 'nl', { sensitivity: 'base' })
    })
}

export async function loadCustomers() {
  if (!database) {
    return {
      customers: [],
      source: 'local',
      message: 'Firebase is niet geconfigureerd.',
    }
  }

  try {
    const snapshot = await get(ref(database, CUSTOMERS_PATH))
    return { customers: mapCustomersSnapshot(snapshot), source: 'firebase' }
  } catch (error) {
    return {
      customers: [],
      source: 'error',
      message: `Klanten laden mislukt: ${error.message}`,
    }
  }
}

export function subscribeCustomers(onUpdate) {
  if (!database) {
    onUpdate({
      customers: [],
      source: 'local',
      message: 'Firebase is niet geconfigureerd.',
    })
    return () => {}
  }

  return onValue(
    ref(database, CUSTOMERS_PATH),
    (snapshot) => onUpdate({ customers: mapCustomersSnapshot(snapshot), source: 'firebase' }),
    (error) =>
      onUpdate({
        customers: [],
        source: 'error',
        message: `Klanten laden mislukt: ${error.message}`,
      }),
  )
}

export async function saveCustomerProfile(uid, profile) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  const record = normalizeCustomerProfile({ uid, ...profile })
  await set(ref(database, `${CUSTOMERS_PATH}/${uid}`), record)
  return record
}

export async function loadCustomerProfile(uid) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  const snapshot = await get(ref(database, `${CUSTOMERS_PATH}/${uid}`))
  return snapshot.exists() ? snapshot.val() : null
}
