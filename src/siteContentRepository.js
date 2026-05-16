import { get, onValue, ref, set } from 'firebase/database'
import { database } from './firebase'
import { DEFAULT_SITE_CONTENT } from './siteContent'
import { DEFAULT_SITE_CONTENT_EN } from './i18n/siteContentEn.js'

const SITE_CONTENT_PATH = 'siteContent'
export const SITE_CONTENT_LOCALE_NL = 'nl'
export const SITE_CONTENT_LOCALE_EN = 'en-GB'

function str(value, fallback) {
  const text = value == null ? '' : String(value).trim()
  return text || fallback
}

function normalizeStringMap(input, defaultsMap) {
  return Object.fromEntries(
    Object.entries(defaultsMap).map(([key, fallback]) => [key, str(input?.[key], fallback)]),
  )
}

function normalizeCalculator(calculator, defaults) {
  return normalizeStringMap(calculator, defaults.calculator)
}

export function normalizeSiteContent(value, defaults = DEFAULT_SITE_CONTENT) {
  const welcome = value?.welcome || {}
  const footer = value?.footer || {}

  return {
    home: normalizeStringMap(value?.home, defaults.home),
    welcome: {
      title: str(welcome.title, defaults.welcome.title),
      body: str(welcome.body, defaults.welcome.body),
    },
    calculator: normalizeCalculator(value?.calculator, defaults),
    footer: {
      companyTitle: str(footer.companyTitle, defaults.footer.companyTitle),
      addressLine1: str(footer.addressLine1, defaults.footer.addressLine1),
      addressLine2: str(footer.addressLine2, defaults.footer.addressLine2),
      addressLine3: str(footer.addressLine3, defaults.footer.addressLine3),
      phone: str(footer.phone, defaults.footer.phone),
      email: str(footer.email, defaults.footer.email),
      websiteUrl: str(footer.websiteUrl, defaults.footer.websiteUrl),
      websiteLabel: str(footer.websiteLabel, defaults.footer.websiteLabel),
      kvk: str(footer.kvk, defaults.footer.kvk),
      btw: str(footer.btw, defaults.footer.btw),
      priceNote: str(footer.priceNote, defaults.footer.priceNote),
      copyrightLine: str(footer.copyrightLine, defaults.footer.copyrightLine),
    },
  }
}

export function createDefaultContentBundle() {
  return {
    [SITE_CONTENT_LOCALE_NL]: normalizeSiteContent(null, DEFAULT_SITE_CONTENT),
    [SITE_CONTENT_LOCALE_EN]: normalizeSiteContent(null, DEFAULT_SITE_CONTENT_EN),
  }
}

/** Alleen Nederlandse standaardteksten (bijv. herstel na per ongeluk Engels onder nl). */
export function getDefaultNlSiteContent() {
  return normalizeSiteContent(null, DEFAULT_SITE_CONTENT)
}

/** Oude Firebase-structuur: home/welcome/calculator/footer op rootniveau. */
function isLegacyFlatContent(value) {
  if (!value || typeof value !== 'object') return false
  if (value[SITE_CONTENT_LOCALE_NL] || value[SITE_CONTENT_LOCALE_EN]) return false
  return Boolean(value.welcome || value.home || value.calculator || value.footer)
}

/** Normaliseert ruwe Firebase-data naar { nl, en-GB } zonder locales te vermengen. */
export function normalizeContentBundle(value) {
  if (!value || typeof value !== 'object') {
    return createDefaultContentBundle()
  }

  if (isLegacyFlatContent(value)) {
    return {
      [SITE_CONTENT_LOCALE_NL]: normalizeSiteContent(value, DEFAULT_SITE_CONTENT),
      [SITE_CONTENT_LOCALE_EN]: normalizeSiteContent(null, DEFAULT_SITE_CONTENT_EN),
    }
  }

  const hasNl = Object.prototype.hasOwnProperty.call(value, SITE_CONTENT_LOCALE_NL)
  const hasEn = Object.prototype.hasOwnProperty.call(value, SITE_CONTENT_LOCALE_EN)

  if (!hasNl && !hasEn) {
    return createDefaultContentBundle()
  }

  return {
    [SITE_CONTENT_LOCALE_NL]: normalizeSiteContent(
      hasNl ? value[SITE_CONTENT_LOCALE_NL] : null,
      DEFAULT_SITE_CONTENT,
    ),
    [SITE_CONTENT_LOCALE_EN]: normalizeSiteContent(
      hasEn ? value[SITE_CONTENT_LOCALE_EN] : null,
      DEFAULT_SITE_CONTENT_EN,
    ),
  }
}

/** Teksten voor de actieve site-taal (klant / calculator / footer). */
export function pickSiteContentForLocale(bundleOrLegacy, locale) {
  const bundle = normalizeContentBundle(bundleOrLegacy)
  return locale === SITE_CONTENT_LOCALE_EN
    ? bundle[SITE_CONTENT_LOCALE_EN]
    : bundle[SITE_CONTENT_LOCALE_NL]
}

function contentResultFromSnapshot(snapshot, { seedIfEmpty }) {
  if (!snapshot.exists()) {
    if (seedIfEmpty) {
      return { needsSeed: true, content: createDefaultContentBundle(), source: 'firebase-seeded' }
    }
    return {
      content: createDefaultContentBundle(),
      source: 'firebase',
      message: 'Geen siteteksten in Firebase; standaardteksten worden getoond.',
    }
  }

  return { content: normalizeContentBundle(snapshot.val()), source: 'firebase' }
}

export async function loadSiteContent({ seedIfEmpty = true } = {}) {
  if (!database) {
    return {
      content: createDefaultContentBundle(),
      source: 'local',
      message: 'Firebase is niet geconfigureerd; standaardteksten worden gebruikt.',
    }
  }

  try {
    const contentRef = ref(database, SITE_CONTENT_PATH)
    const snapshot = await get(contentRef)
    const result = contentResultFromSnapshot(snapshot, { seedIfEmpty })

    if (result.needsSeed) {
      await set(contentRef, result.content)
      return { content: result.content, source: 'firebase-seeded' }
    }

    return result
  } catch (error) {
    return {
      content: createDefaultContentBundle(),
      source: 'error',
      message: `Siteteksten laden mislukt: ${error.message}`,
    }
  }
}

export function subscribeSiteContent(onUpdate, { seedIfEmpty = false } = {}) {
  if (!database) {
    onUpdate({
      content: createDefaultContentBundle(),
      source: 'local',
      message: 'Firebase is niet geconfigureerd.',
    })
    return () => {}
  }

  const contentRef = ref(database, SITE_CONTENT_PATH)
  return onValue(
    contentRef,
    (snapshot) => {
      const result = contentResultFromSnapshot(snapshot, { seedIfEmpty })
      if (result.needsSeed) {
        const bundle = createDefaultContentBundle()
        set(contentRef, bundle)
          .then(() => onUpdate({ content: bundle, source: 'firebase-seeded' }))
          .catch((error) =>
            onUpdate({
              content: bundle,
              source: 'error',
              message: `Siteteksten seeden mislukt: ${error.message}`,
            }),
          )
        return
      }
      onUpdate(result)
    },
    (error) =>
      onUpdate({
        content: createDefaultContentBundle(),
        source: 'error',
        message: `Siteteksten laden mislukt: ${error.message}`,
      }),
  )
}

export async function saveSiteContent(bundle) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')

  const defaults = createDefaultContentBundle()
  const normalized = {
    [SITE_CONTENT_LOCALE_NL]: normalizeSiteContent(
      bundle?.[SITE_CONTENT_LOCALE_NL] ?? defaults[SITE_CONTENT_LOCALE_NL],
      DEFAULT_SITE_CONTENT,
    ),
    [SITE_CONTENT_LOCALE_EN]: normalizeSiteContent(
      bundle?.[SITE_CONTENT_LOCALE_EN] ?? defaults[SITE_CONTENT_LOCALE_EN],
      DEFAULT_SITE_CONTENT_EN,
    ),
  }

  await set(ref(database, SITE_CONTENT_PATH), normalized)
  return normalized
}
