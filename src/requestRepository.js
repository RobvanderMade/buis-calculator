import { get, push, ref, set, update } from 'firebase/database'
import { database } from './firebase'

const REQUESTS_PATH = 'requests'
const CUSTOMER_REQUESTS_PATH = 'customerRequests'

function normalizeRequest(value, id) {
  return {
    id,
    status: value.status || 'nieuw',
    createdAt: value.createdAt || '',
    customerUid: value.customerUid || '',
    customerEmail: value.customerEmail || '',
    customerProfile: value.customerProfile || null,
    material: value.material || null,
    lines: Array.isArray(value.lines) ? value.lines : [],
    totalLength: Number(value.totalLength) || 0,
    aantalStuks: Number(value.aantalStuks) || 1,
    prijsPerStuk: Number(value.prijsPerStuk) || 0,
    totaalPrijs: Number(value.totaalPrijs) || 0,
  }
}

export async function createRequest(request) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')

  const requestRef = push(ref(database, REQUESTS_PATH))
  const createdAt = new Date().toISOString()
  const payload = {
    ...request,
    status: 'nieuw',
    createdAt,
  }
  await set(requestRef, payload)

  if (request.customerUid && requestRef.key) {
    try {
      await set(
        ref(database, `${CUSTOMER_REQUESTS_PATH}/${request.customerUid}/${requestRef.key}`),
        createdAt,
      )
    } catch (error) {
      console.warn('Klant-index voor aanvraag bijwerken mislukt:', error)
    }
  }

  return { id: requestRef.key, ...payload }
}

export async function loadRequests() {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')

  const snapshot = await get(ref(database, REQUESTS_PATH))
  return Object.entries(snapshot.val() || {})
    .map(([id, value]) => normalizeRequest(value || {}, id))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export async function loadRequestsForUser(uid) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  if (!uid) return []

  const indexSnap = await get(ref(database, `${CUSTOMER_REQUESTS_PATH}/${uid}`))
  if (!indexSnap.exists()) return []

  const ids = Object.keys(indexSnap.val() || {})
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const snap = await get(ref(database, `${REQUESTS_PATH}/${id}`))
        return snap.exists() ? normalizeRequest(snap.val(), id) : null
      } catch (error) {
        console.warn(`Aanvraag ${id} ophalen mislukt:`, error)
        return null
      }
    }),
  )

  return results
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export async function updateRequestStatus(requestId, status) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  await update(ref(database, `${REQUESTS_PATH}/${requestId}`), { status })
}
