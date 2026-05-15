import { get, onValue, ref, set } from 'firebase/database'
import { database } from './firebase'
import { DEFAULT_SITE_CONTENT } from './siteContent'

const SITE_CONTENT_PATH = 'siteContent'

function str(value, fallback) {
  const text = value == null ? '' : String(value).trim()
  return text || fallback
}

export function normalizeSiteContent(value) {
  const welcome = value?.welcome || {}
  const footer = value?.footer || {}
  const defaults = DEFAULT_SITE_CONTENT

  return {
    welcome: {
      title: str(welcome.title, defaults.welcome.title),
      body: str(welcome.body, defaults.welcome.body),
    },
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

function contentResultFromSnapshot(snapshot, { seedIfEmpty }) {
  if (!snapshot.exists()) {
    if (seedIfEmpty) {
      return { needsSeed: true, content: DEFAULT_SITE_CONTENT, source: 'firebase-seeded' }
    }
    return {
      content: DEFAULT_SITE_CONTENT,
      source: 'firebase',
      message: 'Geen siteteksten in Firebase; standaardteksten worden getoond.',
    }
  }

  return { content: normalizeSiteContent(snapshot.val()), source: 'firebase' }
}

export async function loadSiteContent({ seedIfEmpty = true } = {}) {
  if (!database) {
    return {
      content: DEFAULT_SITE_CONTENT,
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
      content: DEFAULT_SITE_CONTENT,
      source: 'error',
      message: `Siteteksten laden mislukt: ${error.message}`,
    }
  }
}

export function subscribeSiteContent(onUpdate, { seedIfEmpty = false } = {}) {
  if (!database) {
    onUpdate({
      content: DEFAULT_SITE_CONTENT,
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
        set(contentRef, DEFAULT_SITE_CONTENT)
          .then(() => onUpdate({ content: DEFAULT_SITE_CONTENT, source: 'firebase-seeded' }))
          .catch((error) =>
            onUpdate({
              content: DEFAULT_SITE_CONTENT,
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
        content: DEFAULT_SITE_CONTENT,
        source: 'error',
        message: `Siteteksten laden mislukt: ${error.message}`,
      }),
  )
}

export async function saveSiteContent(content) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  const normalized = normalizeSiteContent(content)
  await set(ref(database, SITE_CONTENT_PATH), normalized)
  return normalized
}
