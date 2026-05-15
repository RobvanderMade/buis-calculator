import { get, onValue, ref, remove, set } from 'firebase/database'
import { database } from './firebase'
import { DEFAULT_MATERIALS } from './materials'

const MATERIALS_PATH = 'materials'

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeMaterial(material, fallbackId, sortOrder) {
  return {
    id: String(material.id || fallbackId),
    materiaal: String(material.materiaal || ''),
    prijsPerMTR: toNumber(material.prijsPerMTR),
    klemLengte: toNumber(material.klemLengte),
    radius: toNumber(material.radius),
    diameterMm: toNumber(material.diameterMm),
    sortOrder: toNumber(material.sortOrder, sortOrder),
  }
}

function normalizeMaterials(value) {
  const entries = Array.isArray(value)
    ? value.map((material, index) => [material?.id || `materiaal-${index}`, material])
    : Object.entries(value || {})

  return entries
    .map(([id, material], index) => normalizeMaterial(material || {}, id, index))
    .filter((material) => material.materiaal)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function materialsRecord(materials) {
  return Object.fromEntries(
    materials.map((material, index) => {
      const normalized = normalizeMaterial(material, material.id || `materiaal-${index}`, index)
      return [normalized.id, normalized]
    }),
  )
}

export function createMaterialId(label) {
  const base = String(label || 'materiaal')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'materiaal'}-${Date.now()}`
}

function materialsResultFromSnapshot(snapshot, { seedIfEmpty }) {
  if (!snapshot.exists()) {
    if (seedIfEmpty) {
      return { needsSeed: true, materials: DEFAULT_MATERIALS, source: 'firebase-seeded' }
    }
    return {
      materials: [],
      source: 'firebase',
      message: 'Geen materialen in Firebase.',
    }
  }

  const materials = normalizeMaterials(snapshot.val())
  if (materials.length === 0) {
    if (seedIfEmpty) {
      return { needsSeed: true, materials: DEFAULT_MATERIALS, source: 'firebase-seeded' }
    }
    return {
      materials: [],
      source: 'firebase',
      message: 'Firebase bevat geen geldige materialen (ontbrekende naam).',
    }
  }

  return { materials, source: 'firebase' }
}

/**
 * @param {{ seedIfEmpty?: boolean }} [options]
 * seedIfEmpty: calculator vult lege FB met defaults; admin leest alleen.
 */
export async function loadMaterials({ seedIfEmpty = true } = {}) {
  if (!database) {
    return {
      materials: seedIfEmpty ? DEFAULT_MATERIALS : [],
      source: 'local',
      message: 'Firebase is nog niet geconfigureerd; lokale materialen worden gebruikt.',
    }
  }

  try {
    const materialsRef = ref(database, MATERIALS_PATH)
    const snapshot = await get(materialsRef)
    const result = materialsResultFromSnapshot(snapshot, { seedIfEmpty })

    if (result.needsSeed) {
      await set(materialsRef, materialsRecord(DEFAULT_MATERIALS))
      return { materials: DEFAULT_MATERIALS, source: 'firebase-seeded' }
    }

    return result
  } catch (error) {
    return {
      materials: seedIfEmpty ? DEFAULT_MATERIALS : [],
      source: 'error',
      message: `Firebase-materialen laden mislukt: ${error.message}`,
    }
  }
}

/**
 * Live luisteren naar /materials (admin-backoffice).
 * @returns {() => void} unsubscribe
 */
export function subscribeMaterials(onUpdate, { seedIfEmpty = false } = {}) {
  if (!database) {
    onUpdate({
      materials: [],
      source: 'local',
      message: 'Firebase is niet geconfigureerd.',
    })
    return () => {}
  }

  const materialsRef = ref(database, MATERIALS_PATH)
  return onValue(
    materialsRef,
    (snapshot) => {
      const result = materialsResultFromSnapshot(snapshot, { seedIfEmpty })
      if (result.needsSeed) {
        set(materialsRef, materialsRecord(DEFAULT_MATERIALS))
          .then(() => onUpdate({ materials: DEFAULT_MATERIALS, source: 'firebase-seeded' }))
          .catch((error) =>
            onUpdate({
              materials: [],
              source: 'error',
              message: `Materialen seeden mislukt: ${error.message}`,
            }),
          )
        return
      }
      onUpdate(result)
    },
    (error) =>
      onUpdate({
        materials: [],
        source: 'error',
        message: `Firebase-materialen laden mislukt: ${error.message}`,
      }),
  )
}

export async function saveMaterial(material) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')

  const materialId = material.id || createMaterialId(material.materiaal)
  const normalized = normalizeMaterial(material, materialId, material.sortOrder ?? 0)
  await set(ref(database, `${MATERIALS_PATH}/${materialId}`), normalized)
  return normalized
}

export async function deleteMaterial(materialId) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  await remove(ref(database, `${MATERIALS_PATH}/${materialId}`))
}
