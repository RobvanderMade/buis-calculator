import { get, onValue, push, ref, remove, runTransaction, set, update } from 'firebase/database'
import { database } from './firebase'

const REQUESTS_PATH = 'requests'
const CUSTOMER_REQUESTS_PATH = 'customerRequests'

export const REQUEST_STATUS_LABELS = {
  nieuw: 'Nieuw',
  in_behandeling: 'In behandeling',
  in_productie: 'In productie',
  gereed: 'Gereed',
}

/** Oude statuswaarden uit eerdere versies. */
const LEGACY_STATUS_MAP = {
  afgerond: 'gereed',
}

export const REQUEST_STATUS_OPTIONS = Object.entries(REQUEST_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export function normalizeRequestStatus(status) {
  const key = String(status || 'nieuw')
  return LEGACY_STATUS_MAP[key] || key
}

export function formatRequestStatus(status, t) {
  const normalized = normalizeRequestStatus(status)
  if (t) {
    const translated = t(`requestStatus.${normalized}`)
    if (translated && translated !== `requestStatus.${normalized}`) return translated
  }
  return REQUEST_STATUS_LABELS[normalized] || normalized || REQUEST_STATUS_LABELS.nieuw
}

export function isRequestArchived(request) {
  return request?.archived === true || request?.archived === 'true'
}

export function canArchiveRequest(request) {
  return normalizeRequestStatus(request?.status) === 'gereed' && !isRequestArchived(request)
}

function sortRequests(requests) {
  return [...requests].sort((a, b) => {
    const dateA = a.archivedAt || a.createdAt
    const dateB = b.archivedAt || b.createdAt
    return String(dateB).localeCompare(String(dateA))
  })
}
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
    status: normalizeRequestStatus(value.status),
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
    archived: value.archived === true || value.archived === 'true',
    archivedAt: value.archivedAt || '',
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
    archived: false,
    archivedAt: '',
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
  return sortRequests(
    Object.entries(snapshot.val() || {}).map(([id, value]) => normalizeRequest(value || {}, id)),
  )
}

/** Live updates voor admin-backoffice. */
export function subscribeRequests(onUpdate) {
  if (!database) {
    onUpdate([])
    return () => {}
  }

  return onValue(
    ref(database, REQUESTS_PATH),
    (snapshot) => {
      const requests = sortRequests(
        Object.entries(snapshot.val() || {}).map(([id, value]) =>
          normalizeRequest(value || {}, id),
        ),
      )
      onUpdate(requests)
    },
    (error) => {
      console.warn('Aanvragen laden mislukt:', error)
      onUpdate([])
    },
  )
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

  return sortRequests(results.filter(Boolean))
}

/** Live updates voor klantaccount (statuswijzigingen door admin). */
export function subscribeRequestsForUser(uid, onUpdate) {
  if (!database || !uid) {
    onUpdate([])
    return () => {}
  }

  const cache = new Map()
  const requestUnsubs = new Map()

  function emit() {
    onUpdate(sortRequests([...cache.values()]))
  }

  const indexUnsub = onValue(
    ref(database, `${CUSTOMER_REQUESTS_PATH}/${uid}`),
    (indexSnap) => {
      const ids = Object.keys(indexSnap.val() || {})

      for (const [id, unsub] of requestUnsubs) {
        if (!ids.includes(id)) {
          unsub()
          requestUnsubs.delete(id)
          cache.delete(id)
        }
      }

      for (const id of ids) {
        if (requestUnsubs.has(id)) continue
        const unsub = onValue(
          ref(database, `${REQUESTS_PATH}/${id}`),
          (reqSnap) => {
            if (reqSnap.exists()) {
              cache.set(id, normalizeRequest(reqSnap.val(), id))
            } else {
              cache.delete(id)
            }
            emit()
          },
          (error) => {
            console.warn(`Aanvraag ${id} volgen mislukt:`, error)
          },
        )
        requestUnsubs.set(id, unsub)
      }

      if (ids.length === 0) emit()
    },
    (error) => {
      console.warn('Klantaanvragen laden mislukt:', error)
      onUpdate([])
    },
  )

  return () => {
    indexUnsub()
    for (const unsub of requestUnsubs.values()) unsub()
    cache.clear()
    requestUnsubs.clear()
  }
}

export async function updateRequestStatus(requestId, status) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  await update(ref(database, `${REQUESTS_PATH}/${requestId}`), { status })
}

export async function archiveRequest(requestId, { status } = {}) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  if (status != null && normalizeRequestStatus(status) !== 'gereed') {
    throw new Error('Alleen orders met status Gereed kunnen naar de historie.')
  }
  await update(ref(database, `${REQUESTS_PATH}/${requestId}`), {
    archived: true,
    archivedAt: new Date().toISOString(),
  })
}

export async function restoreRequestFromHistory(requestId) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  await update(ref(database, `${REQUESTS_PATH}/${requestId}`), {
    archived: false,
    archivedAt: null,
  })
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
