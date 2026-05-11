import { get, push, ref, set, update } from 'firebase/database'
import { database } from './firebase'

const REQUESTS_PATH = 'requests'

function normalizeRequest(value, id) {
  return {
    id,
    status: value.status || 'nieuw',
    createdAt: value.createdAt || '',
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
  const payload = {
    ...request,
    status: 'nieuw',
    createdAt: new Date().toISOString(),
  }
  await set(requestRef, payload)
  return { id: requestRef.key, ...payload }
}

export async function loadRequests() {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')

  const snapshot = await get(ref(database, REQUESTS_PATH))
  return Object.entries(snapshot.val() || {})
    .map(([id, value]) => normalizeRequest(value || {}, id))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export async function updateRequestStatus(requestId, status) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  await update(ref(database, `${REQUESTS_PATH}/${requestId}`), { status })
}
