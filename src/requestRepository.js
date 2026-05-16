import { get, push, ref, remove, runTransaction, set, update } from 'firebase/database'
import { database } from './firebase'

const REQUESTS_PATH = 'requests'
const CUSTOMER_REQUESTS_PATH = 'customerRequests'
const REQUEST_COUNTERS_PATH = 'requestCounters'
const SEQUENCE_COUNTER_KEY = 'sequence'
export const FIRST_REQUEST_SEQUENCE = 1265

export function formatRequestNumber(year, sequence) {
  return `A${year}-${String(sequence).padStart(4, '0')}`
}

async function allocateRequestNumber(createdAt = new Date()) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')

  const year = createdAt.getFullYear()
  const counterRef = ref(database, `${REQUEST_COUNTERS_PATH}/${SEQUENCE_COUNTER_KEY}`)
  const { committed, snapshot } = await runTransaction(counterRef, (current) => {
    if (current === null || current === undefined) {
      return FIRST_REQUEST_SEQUENCE
    }
    const prev = typeof current === 'number' && Number.isFinite(current) ? current : FIRST_REQUEST_SEQUENCE - 1
    return prev + 1
  })

  if (!committed) {
    throw new Error('Kon geen aanvraagnummer toewijzen.')
  }

  const sequence = snapshot.val()
  return {
    requestNumber: formatRequestNumber(year, sequence),
    requestSequence: sequence,
    requestYear: year,
  }
}

function normalizeRequest(value, id) {
  return {
    id,
    status: value.status || 'nieuw',
    createdAt: value.createdAt || '',
    customerUid: value.customerUid || '',
    customerEmail: value.customerEmail || '',
    customerProfile: value.customerProfile || null,
    requestNumber: value.requestNumber || '',
    requestSequence: Number(value.requestSequence) || 0,
    requestYear: Number(value.requestYear) || 0,
    material: value.material || null,
    lines: Array.isArray(value.lines) ? value.lines : [],
    totalLength: Number(value.totalLength) || 0,
    aantalStuks: Number(value.aantalStuks) || 1,
    prijsPerStuk: Number(value.prijsPerStuk) || 0,
    totaalPrijs: Number(value.totaalPrijs) || 0,
    pricing: value.pricing || null,
  }
}

export async function createRequest(request) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')

  const requestRef = push(ref(database, REQUESTS_PATH))
  const createdAt = new Date().toISOString()
  const numbering = await allocateRequestNumber(new Date(createdAt))
  const payload = {
    ...request,
    ...numbering,
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

export async function deleteRequest(requestId, customerUid) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  await remove(ref(database, `${REQUESTS_PATH}/${requestId}`))
  if (customerUid) {
    try {
      await remove(ref(database, `${CUSTOMER_REQUESTS_PATH}/${customerUid}/${requestId}`))
    } catch (error) {
      console.warn('Klant-index voor aanvraag verwijderen mislukt:', error)
    }
  }
}
