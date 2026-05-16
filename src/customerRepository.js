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
  ['street', 'customerValidation.street'],
  ['postalCode', 'customerValidation.postalCode'],
  ['city', 'customerValidation.city'],
  ['country', 'customerValidation.country'],
]

const REQUIRED_PROFILE_FIELDS = [
  ['name', 'customerValidation.name'],
  ...ADDRESS_PROFILE_FIELDS,
  ['phone', 'customerValidation.phone'],
]

const LEGACY_LABELS = {
  name: 'Naam',
  street: 'Straat en huisnummer',
  postalCode: 'Postcode',
  city: 'Plaats',
  country: 'Land',
  phone: 'Telefoon',
}

function validationMessage(key, t) {
  if (t) return t(key)
  const field = key.replace('customerValidation.', '')
  return `Vul ${LEGACY_LABELS[field] || field} in.`
}

/** @returns {string | null} Foutmelding of null als adresvelden ingevuld zijn. */
export function validateCustomerAddress(profile, t) {
  for (const [fieldKey, msgKey] of ADDRESS_PROFILE_FIELDS) {
    if (!String(profile?.[fieldKey] ?? '').trim()) {
      return validationMessage(msgKey, t)
    }
  }
  return null
}

/** @returns {string | null} Foutmelding of null als alles ingevuld is (bedrijfsnaam optioneel). */
export function validateCustomerProfile(profile, t) {
  for (const [fieldKey, msgKey] of REQUIRED_PROFILE_FIELDS) {
    if (!String(profile?.[fieldKey] ?? '').trim()) {
      return validationMessage(msgKey, t)
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

function isCustomerDataObject(data) {
  return data != null && typeof data === 'object' && !Array.isArray(data)
}

function normalizeCreatedAt(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : date.toISOString()
  }
  if (typeof value === 'string') return value.trim()
  return ''
}

export function mapCustomerRecord(uid, data) {
  const raw = isCustomerDataObject(data) ? data : {}
  const profile = normalizeCustomerProfile({ uid, ...raw })
  return {
    uid: String(uid),
    ...profile,
    email: profile.email || String(raw.email ?? '').trim(),
    createdAt: normalizeCreatedAt(profile.createdAt ?? raw.createdAt),
  }
}

export function mapCustomersSnapshot(snapshot) {
  if (!snapshot?.exists?.() || !snapshot.exists()) return []
  const value = snapshot.val()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []

  return Object.entries(value)
    .map(([uid, data]) => {
      try {
        return mapCustomerRecord(uid, data)
      } catch (error) {
        console.warn(`Klant ${uid} overslaan:`, error)
        return null
      }
    })
    .filter(Boolean)
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
