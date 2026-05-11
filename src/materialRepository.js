import { get, ref, remove, set } from 'firebase/database'
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

export async function loadMaterials() {
  if (!database) {
    return {
      materials: DEFAULT_MATERIALS,
      source: 'local',
      message: 'Firebase is nog niet geconfigureerd; lokale materialen worden gebruikt.',
    }
  }

  try {
    const materialsRef = ref(database, MATERIALS_PATH)
    const snapshot = await get(materialsRef)

    if (!snapshot.exists()) {
      await set(materialsRef, materialsRecord(DEFAULT_MATERIALS))
      return { materials: DEFAULT_MATERIALS, source: 'firebase-seeded' }
    }

    const materials = normalizeMaterials(snapshot.val())
    if (materials.length === 0) {
      await set(materialsRef, materialsRecord(DEFAULT_MATERIALS))
      return { materials: DEFAULT_MATERIALS, source: 'firebase-seeded' }
    }

    return { materials, source: 'firebase' }
  } catch (error) {
    return {
      materials: DEFAULT_MATERIALS,
      source: 'local',
      message: `Firebase-materialen laden mislukt: ${error.message}`,
    }
  }
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
