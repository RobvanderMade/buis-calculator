import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import nl from './locales/nl.js'
import enGB from './locales/en-GB.js'

const STORAGE_KEY = 'bendr-locale'
export const LOCALES = [
  { id: 'nl', labelKey: 'common.languageNl', shortLabel: 'NL' },
  { id: 'en-GB', labelKey: 'common.languageEn', shortLabel: 'EN' },
]

const catalogs = { nl, 'en-GB': enGB }

const I18nContext = createContext(null)

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

function interpolate(template, vars = {}) {
  if (!template) return ''
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key]
    return value == null ? '' : String(value)
  })
}

export function I18nProvider({ children, forceLocale = null }) {
  const [locale, setLocaleState] = useState(() => {
    if (forceLocale) return forceLocale
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'en-GB' ? 'en-GB' : 'nl'
  })

  const effectiveLocale = forceLocale || locale

  useEffect(() => {
    if (forceLocale) return
    localStorage.setItem(STORAGE_KEY, locale)
  }, [locale, forceLocale])

  useEffect(() => {
    document.documentElement.lang = effectiveLocale === 'en-GB' ? 'en-GB' : 'nl'
  }, [effectiveLocale])

  const setLocale = useCallback(
    (next) => {
      if (forceLocale) return
      setLocaleState(next === 'en-GB' ? 'en-GB' : 'nl')
    },
    [forceLocale],
  )

  const t = useCallback(
    (key, vars) => {
      const catalog = catalogs[effectiveLocale] || catalogs.nl
      const value = getByPath(catalog, key) ?? getByPath(catalogs.nl, key) ?? key
      return typeof value === 'string' ? interpolate(value, vars) : key
    },
    [effectiveLocale],
  )

  const value = useMemo(
    () => ({
      locale: effectiveLocale,
      setLocale,
      t,
      isAdminLocale: Boolean(forceLocale),
    }),
    [effectiveLocale, setLocale, t, forceLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
