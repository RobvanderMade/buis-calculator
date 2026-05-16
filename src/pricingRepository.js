import { get, onValue, ref, set } from 'firebase/database'
import { database } from './firebase'
import { DEFAULT_PRICING } from './pricing'

const PRICING_PATH = 'pricing'

function toNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function normalizePricing(value) {
  const input = value || {}
  return {
    prijsPerLijn: toNumber(input.prijsPerLijn, DEFAULT_PRICING.prijsPerLijn),
    buisMeterFactor: toNumber(input.buisMeterFactor, DEFAULT_PRICING.buisMeterFactor),
    buisLengteMm: toNumber(input.buisLengteMm, DEFAULT_PRICING.buisLengteMm),
    vasteKosten: toNumber(input.vasteKosten, DEFAULT_PRICING.vasteKosten),
    maxGestrekteLengteMm: toNumber(
      input.maxGestrekteLengteMm,
      DEFAULT_PRICING.maxGestrekteLengteMm,
    ),
  }
}

function pricingResultFromSnapshot(snapshot, { seedIfEmpty }) {
  if (!snapshot.exists()) {
    if (seedIfEmpty) {
      return { needsSeed: true, pricing: DEFAULT_PRICING, source: 'firebase-seeded' }
    }
    return {
      pricing: DEFAULT_PRICING,
      source: 'firebase',
      message: 'Geen prijsinstellingen in Firebase; standaardwaarden worden gebruikt.',
    }
  }

  return { pricing: normalizePricing(snapshot.val()), source: 'firebase' }
}

export async function loadPricing({ seedIfEmpty = true } = {}) {
  if (!database) {
    return {
      pricing: DEFAULT_PRICING,
      source: 'local',
      message: 'Firebase is niet geconfigureerd; standaardprijzen worden gebruikt.',
    }
  }

  try {
    const pricingRef = ref(database, PRICING_PATH)
    const snapshot = await get(pricingRef)
    const result = pricingResultFromSnapshot(snapshot, { seedIfEmpty })

    if (result.needsSeed) {
      await set(pricingRef, DEFAULT_PRICING)
      return { pricing: DEFAULT_PRICING, source: 'firebase-seeded' }
    }

    return result
  } catch (error) {
    return {
      pricing: DEFAULT_PRICING,
      source: 'error',
      message: `Prijsinstellingen laden mislukt: ${error.message}`,
    }
  }
}

export function subscribePricing(onUpdate, { seedIfEmpty = false } = {}) {
  if (!database) {
    onUpdate({
      pricing: DEFAULT_PRICING,
      source: 'local',
      message: 'Firebase is niet geconfigureerd.',
    })
    return () => {}
  }

  const pricingRef = ref(database, PRICING_PATH)
  return onValue(
    pricingRef,
    (snapshot) => {
      const result = pricingResultFromSnapshot(snapshot, { seedIfEmpty })
      if (result.needsSeed) {
        set(pricingRef, DEFAULT_PRICING)
          .then(() => onUpdate({ pricing: DEFAULT_PRICING, source: 'firebase-seeded' }))
          .catch((error) =>
            onUpdate({
              pricing: DEFAULT_PRICING,
              source: 'error',
              message: `Prijsinstellingen seeden mislukt: ${error.message}`,
            }),
          )
        return
      }
      onUpdate(result)
    },
    (error) =>
      onUpdate({
        pricing: DEFAULT_PRICING,
        source: 'error',
        message: `Prijsinstellingen laden mislukt: ${error.message}`,
      }),
  )
}

export async function savePricing(pricing) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  const normalized = normalizePricing(pricing)
  await set(ref(database, PRICING_PATH), normalized)
  return normalized
}
