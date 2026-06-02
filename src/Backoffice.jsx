import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  loadCustomers,
  normalizeCustomerProfile,
  saveCustomerProfile,
  subscribeCustomers,
  validateCustomerAddress,
  validateCustomerProfile,
} from './customerRepository.js'
import {
  createMaterialId,
  deleteMaterial,
  loadMaterials,
  saveMaterial,
  subscribeMaterials,
} from './materialRepository'
import {
  archiveRequest,
  canArchiveRequest,
  deleteRequest,
  formatRequestStatus,
  isRequestArchived,
  normalizeRequestStatus,
  REQUEST_STATUS_OPTIONS,
  loadRequests,
  loadRequestsForUser,
  restoreRequestFromHistory,
  subscribeRequests,
  subscribeRequestsForUser,
  updateRequestStatus,
} from './requestRepository'
import { DEFAULT_PRICING } from './pricing'
import { savePricing, subscribePricing } from './pricingRepository'
import { DEFAULT_SITE_CONTENT } from './siteContent'
import {
  SITE_CONTENT_LOCALE_EN,
  SITE_CONTENT_LOCALE_NL,
  createDefaultContentBundle,
  getDefaultNlSiteContent,
  normalizeContentBundle,
  saveSiteContent,
  subscribeSiteContent,
} from './siteContentRepository'
import { useI18n } from './i18n/I18nContext.jsx'

const DEFAULT_MATERIAAL_SOORT = 'Staal blank gelast'

const emptyMaterial = {
  id: '',
  materiaalSoort: DEFAULT_MATERIAAL_SOORT,
  materiaal: '',
  prijsPerMTR: 0,
  klemLengte: 0,
  radius: 0,
  diameterMm: 0,
  sortOrder: 0,
}

function formatDate(value) {
  if (value == null || value === '') return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('nl-NL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function parseNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export default function Backoffice({
  user,
  role,
  customerProfile,
  onOpenRequestInCalculator,
  onCustomerProfileUpdate,
}) {
  const [message, setMessage] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)
  const [addressDraft, setAddressDraft] = useState({
    street: '',
    postalCode: '',
    city: '',
    country: 'Nederland',
  })
  const [materials, setMaterials] = useState([])
  const [materialsSource, setMaterialsSource] = useState('')
  const [materialsHint, setMaterialsHint] = useState('')
  const [requests, setRequests] = useState([])
  const [editing, setEditing] = useState(emptyMaterial)
  const [siteContentBundle, setSiteContentBundle] = useState(() => createDefaultContentBundle())
  const [siteContentEditLocale, setSiteContentEditLocale] = useState(SITE_CONTENT_LOCALE_NL)
  const [siteContentSource, setSiteContentSource] = useState('')
  const [pricing, setPricing] = useState(DEFAULT_PRICING)
  const [pricingSource, setPricingSource] = useState('')
  const [activeTab, setActiveTab] = useState('requests')
  const [requestListFilter, setRequestListFilter] = useState('open')
  const [customers, setCustomers] = useState([])
  const [customersSource, setCustomersSource] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [expandedCustomerUid, setExpandedCustomerUid] = useState(null)
  const knownRequestIdsRef = useRef(new Set())
  const hasSeenInitialAdminRequestsRef = useRef(false)

  const isAdmin = role === 'admin'
  const { t } = useI18n()

  useEffect(() => {
    if (!isAdmin) {
      knownRequestIdsRef.current = new Set()
      hasSeenInitialAdminRequestsRef.current = false
      return
    }

    const knownIds = knownRequestIdsRef.current
    const currentIds = new Set()
    const newOpenRequests = []

    for (const request of requests) {
      if (!request?.id) continue
      currentIds.add(request.id)
      if (!hasSeenInitialAdminRequestsRef.current) continue
      if (!knownIds.has(request.id) && !isRequestArchived(request)) {
        newOpenRequests.push(request)
      }
    }

    if (hasSeenInitialAdminRequestsRef.current && newOpenRequests.length > 0) {
      setMessage(
        newOpenRequests.length === 1
          ? t('requests.newRequestAlertOne')
          : t('requests.newRequestAlertMany', { count: newOpenRequests.length }),
      )
    }

    knownRequestIdsRef.current = currentIds
    hasSeenInitialAdminRequestsRef.current = true
  }, [isAdmin, requests, t])

  useEffect(() => {
    if (!customerProfile) return
    setAddressDraft({
      street: customerProfile.street || '',
      postalCode: customerProfile.postalCode || '',
      city: customerProfile.city || '',
      country: customerProfile.country || 'Nederland',
    })
  }, [customerProfile])

  async function handleSaveAddress(event) {
    event.preventDefault()
    if (!customerProfile) {
      setMessage(t('account.noProfileToUpdate'))
      return
    }

    const merged = normalizeCustomerProfile({ ...customerProfile, ...addressDraft })
    const addressError = validateCustomerAddress(merged, t)
    if (addressError) {
      setMessage(addressError)
      return
    }
    const profileError = validateCustomerProfile(merged, t)
    if (profileError) {
      setMessage(profileError)
      return
    }

    setSavingAddress(true)
    setMessage('')
    try {
      await saveCustomerProfile(user.uid, merged)
      onCustomerProfileUpdate?.(merged)
      setMessage(t('account.addressSaved'))
    } catch (error) {
      setMessage(t('account.addressSaveFailed', { error: error.message }))
    } finally {
      setSavingAddress(false)
    }
  }

  const applyMaterialResult = useCallback((result) => {
    setMaterials(Array.isArray(result?.materials) ? result.materials : [])
    setMaterialsSource(result?.source || '')
    setMaterialsHint(result?.message || '')
  }, [])

  const applySiteContentResult = useCallback((result) => {
    if (result?.content) setSiteContentBundle(result.content)
    setSiteContentSource(result?.source || '')
  }, [])

  const siteContent = siteContentBundle[siteContentEditLocale] ?? siteContentBundle[SITE_CONTENT_LOCALE_NL]

  const applyPricingResult = useCallback((result) => {
    if (result?.pricing) setPricing(result.pricing)
    setPricingSource(result?.source || '')
  }, [])

  function updateSiteContentField(section, key, value) {
    const locale = siteContentEditLocale
    setSiteContentBundle((prev) => {
      const defaults = createDefaultContentBundle()
      const current = prev[locale] ?? defaults[locale]
      return {
        [SITE_CONTENT_LOCALE_NL]:
          prev[SITE_CONTENT_LOCALE_NL] ?? defaults[SITE_CONTENT_LOCALE_NL],
        [SITE_CONTENT_LOCALE_EN]:
          prev[SITE_CONTENT_LOCALE_EN] ?? defaults[SITE_CONTENT_LOCALE_EN],
        [locale]: {
          ...current,
          [section]: { ...current[section], [key]: value },
        },
      }
    })
  }

  function switchSiteContentEditLocale(locale) {
    setSiteContentEditLocale(locale)
    setSiteContentBundle((prev) => {
      const defaults = createDefaultContentBundle()
      return {
        [SITE_CONTENT_LOCALE_NL]:
          prev[SITE_CONTENT_LOCALE_NL] ?? defaults[SITE_CONTENT_LOCALE_NL],
        [SITE_CONTENT_LOCALE_EN]:
          prev[SITE_CONTENT_LOCALE_EN] ?? defaults[SITE_CONTENT_LOCALE_EN],
      }
    })
  }

  function updatePricingField(key, value) {
    setPricing((prev) => ({ ...prev, [key]: value }))
  }

  const applyCustomersResult = useCallback((result) => {
    setCustomers(Array.isArray(result?.customers) ? result.customers : [])
    setCustomersSource(result?.source ?? '')
    if (result?.source === 'error' && result?.message) {
      setMessage(result.message)
    }
  }, [])

  async function refreshBackofficeData() {
    setMessage('')
    try {
      const requestResult = isAdmin
        ? await loadRequests()
        : await loadRequestsForUser(user.uid)
      setRequests(Array.isArray(requestResult) ? requestResult : [])

      if (isAdmin) {
        const customerResult = await loadCustomers()
        applyCustomersResult(customerResult)
      } else {
        const materialResult = await loadMaterials()
        applyMaterialResult(materialResult)
      }
    } catch (error) {
      setMessage(error?.message || 'Gegevens verversen mislukt.')
    }
  }

  useEffect(() => {
    const unsubscribeRequests = isAdmin
      ? subscribeRequests(setRequests)
      : subscribeRequestsForUser(user.uid, setRequests)

    if (isAdmin) {
      const unsubscribeMaterials = subscribeMaterials(applyMaterialResult, { seedIfEmpty: false })
      const unsubscribeContent = subscribeSiteContent(applySiteContentResult, { seedIfEmpty: false })
      const unsubscribePricing = subscribePricing(applyPricingResult, { seedIfEmpty: false })
      const unsubscribeCustomers = subscribeCustomers(applyCustomersResult)

      return () => {
        unsubscribeRequests()
        unsubscribeMaterials()
        unsubscribeContent()
        unsubscribePricing()
        unsubscribeCustomers()
      }
    }

    loadMaterials()
      .then(applyMaterialResult)
      .catch((error) => setMessage(error.message))

    return unsubscribeRequests
  }, [
    isAdmin,
    user.uid,
    applyMaterialResult,
    applySiteContentResult,
    applyPricingResult,
    applyCustomersResult,
  ])

  function editMaterial(material) {
    if (!isAdmin) return
    setEditing(material)
    setActiveTab('materials')
  }

  function updateEditing(key, value) {
    setEditing((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSaveMaterial(event) {
    event.preventDefault()
    if (!isAdmin) return
    setMessage('')
    try {
      const id = editing.id || createMaterialId(editing.materiaal)
      await saveMaterial({
        ...editing,
        id,
        prijsPerMTR: parseNumber(editing.prijsPerMTR),
        klemLengte: parseNumber(editing.klemLengte),
        radius: parseNumber(editing.radius),
        diameterMm: parseNumber(editing.diameterMm),
        sortOrder: parseNumber(editing.sortOrder),
      })
      setEditing(emptyMaterial)
      setMessage('Materiaal opgeslagen.')
      await refreshBackofficeData()
    } catch (error) {
      setMessage(`Materiaal opslaan mislukt: ${error.message}`)
    }
  }

  async function handleSaveSiteContent(event) {
    event.preventDefault()
    if (!isAdmin) return
    setMessage('')
    try {
      const defaults = createDefaultContentBundle()
      await saveSiteContent({
        [SITE_CONTENT_LOCALE_NL]:
          siteContentBundle[SITE_CONTENT_LOCALE_NL] ?? defaults[SITE_CONTENT_LOCALE_NL],
        [SITE_CONTENT_LOCALE_EN]:
          siteContentBundle[SITE_CONTENT_LOCALE_EN] ?? defaults[SITE_CONTENT_LOCALE_EN],
      })
      setMessage('Teksten (NL + English) opgeslagen in Firebase.')
    } catch (error) {
      setMessage(`Teksten opslaan mislukt: ${error.message}`)
    }
  }

  function handleLoadNlDefaults() {
    const nl = getDefaultNlSiteContent()
    setSiteContentBundle((prev) => {
      const defaults = createDefaultContentBundle()
      return {
        [SITE_CONTENT_LOCALE_NL]: nl,
        [SITE_CONTENT_LOCALE_EN]:
          prev[SITE_CONTENT_LOCALE_EN] ?? defaults[SITE_CONTENT_LOCALE_EN],
      }
    })
    setSiteContentEditLocale(SITE_CONTENT_LOCALE_NL)
    setMessage('Nederlandse standaardteksten geladen. Controleer en klik op Teksten opslaan.')
  }

  async function handleRestoreNlAndSave() {
    if (!isAdmin) return
    setMessage('')
    try {
      const defaults = createDefaultContentBundle()
      const toSave = {
        [SITE_CONTENT_LOCALE_NL]: getDefaultNlSiteContent(),
        [SITE_CONTENT_LOCALE_EN]:
          siteContentBundle[SITE_CONTENT_LOCALE_EN] ?? defaults[SITE_CONTENT_LOCALE_EN],
      }
      const saved = await saveSiteContent(toSave)
      setSiteContentBundle(saved)
      setSiteContentEditLocale(SITE_CONTENT_LOCALE_NL)
      setMessage(
        'Nederlandse standaardteksten zijn hersteld en opgeslagen. English (UK) is ongewijzigd.',
      )
    } catch (error) {
      setMessage(`Nederlands herstellen mislukt: ${error.message}`)
    }
  }

  async function handleSavePricing(event) {
    event.preventDefault()
    if (!isAdmin) return
    setMessage('')
    try {
      await savePricing({
        prijsPerLijn: parseNumber(pricing.prijsPerLijn),
        buisMeterFactor: parseNumber(pricing.buisMeterFactor),
        buisLengteMm: parseNumber(pricing.buisLengteMm),
        vasteKosten: parseNumber(pricing.vasteKosten),
        maxGestrekteLengteMm: parseNumber(pricing.maxGestrekteLengteMm),
      })
      setMessage('Berekeningsprijzen opgeslagen in Firebase.')
    } catch (error) {
      setMessage(`Prijzen opslaan mislukt: ${error.message}`)
    }
  }

  async function handleDeleteMaterial(materialId) {
    if (!isAdmin) return
    if (!window.confirm('Materiaal verwijderen?')) return
    setMessage('')
    try {
      await deleteMaterial(materialId)
      setMessage('Materiaal verwijderd.')
      await refreshBackofficeData()
    } catch (error) {
      setMessage(`Materiaal verwijderen mislukt: ${error.message}`)
    }
  }

  async function handleStatusChange(requestId, status) {
    if (!isAdmin) return
    setMessage('')
    try {
      await updateRequestStatus(requestId, status)
    } catch (error) {
      setMessage(`Status aanpassen mislukt: ${error.message}`)
    }
  }

  async function handleDeleteRequest(request) {
    if (!isAdmin) return
    if (!window.confirm('Aanvraag definitief verwijderen?')) return
    setMessage('')
    try {
      await deleteRequest(request.id, request.customerUid)
      setMessage('Aanvraag verwijderd.')
      await refreshBackofficeData()
    } catch (error) {
      setMessage(`Aanvraag verwijderen mislukt: ${error.message}`)
    }
  }

  async function handleArchiveRequest(request) {
    if (!isAdmin) return
    if (isRequestArchived(request)) return
    if (normalizeRequestStatus(request.status) !== 'gereed') {
      setMessage('Alleen orders met status Gereed kunnen naar de historie.')
      return
    }
    if (!window.confirm('Deze order naar de historie plaatsen?')) return
    setMessage('')
    try {
      await archiveRequest(request.id, { status: request.status })
      setRequestListFilter('history')
      setMessage('Order staat in de historie.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function handleRestoreRequest(request) {
    if (!isAdmin) return
    if (!isRequestArchived(request)) return
    setMessage('')
    try {
      await restoreRequestFromHistory(request.id)
      setMessage('Order staat weer bij open orders.')
      setRequestListFilter('open')
    } catch (error) {
      setMessage(`Order terugzetten mislukt: ${error.message}`)
    }
  }

  const openRequests = useMemo(
    () => requests.filter((request) => !isRequestArchived(request)),
    [requests],
  )
  const historyRequests = useMemo(
    () => requests.filter((request) => isRequestArchived(request)),
    [requests],
  )

  const visibleRequests = useMemo(() => {
    if (isAdmin) {
      return requestListFilter === 'history' ? historyRequests : openRequests
    }
    return requests.filter((request) => request.customerUid === user.uid)
  }, [isAdmin, requestListFilter, historyRequests, openRequests, requests, user.uid])

  const visibleRequestCountLabel = useMemo(() => {
    if (isAdmin) {
      const count = visibleRequests.length
      const scope = requestListFilter === 'history' ? 'in historie' : 'open'
      return `${count} ${count === 1 ? 'order' : 'orders'} ${scope}`
    }
    return `${visibleRequests.length} ${
      visibleRequests.length === 1 ? t('account.requestsOne') : t('account.requestsMany')
    }`
  }, [isAdmin, requestListFilter, visibleRequests.length, t])

  const requestsByCustomerUid = useMemo(() => {
    const map = new Map()
    for (const request of requests) {
      const uid = request.customerUid
      if (!uid) continue
      if (!map.has(uid)) map.set(uid, [])
      map.get(uid).push(request)
    }
    for (const list of map.values()) {
      list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    }
    return map
  }, [requests])

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.company,
        customer.email,
        customer.street,
        customer.postalCode,
        customer.city,
        customer.country,
        customer.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (haystack.includes(query)) return true
      const customerRequests = requestsByCustomerUid.get(customer.uid) || []
      return customerRequests.some((request) => {
        const requestHaystack = [
          request.requestNumber,
          formatRequestStatus(request.status),
          request.material?.materiaal,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return requestHaystack.includes(query)
      })
    })
  }, [customerSearch, customers, requestsByCustomerUid])

  function toggleCustomerExpanded(uid) {
    setExpandedCustomerUid((current) => (current === uid ? null : uid))
  }

  function handleRequestCardActivate(request) {
    if (typeof onOpenRequestInCalculator !== 'function') return
    onOpenRequestInCalculator(request)
  }

  function handleRequestCardKeyDown(event, request) {
    if (typeof onOpenRequestInCalculator !== 'function') return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpenRequestInCalculator(request)
    }
  }

  return (
    <div className="backoffice stack">
      <div className="backoffice-header">
        <div>
          <h2>{isAdmin ? 'Backoffice' : t('account.title')}</h2>
          <p className="status-text">
            {isAdmin
              ? `Ingelogd als ${user.email} (admin)`
              : t('account.loggedInAs', { email: user.email, role: t('account.roleCustomer') })}
          </p>
        </div>
      </div>

      <div className="row-btns">
        <button
          type="button"
          className={activeTab === 'requests' ? 'view-active' : ''}
          onClick={() => setActiveTab('requests')}
        >
          Aanvragen (
          {isAdmin ? `${openRequests.length} open` : visibleRequests.length})
        </button>
        {isAdmin ? (
          <button
            type="button"
            className={activeTab === 'customers' ? 'view-active' : ''}
            onClick={() => setActiveTab('customers')}
          >
            Klantenbestand ({customers.length})
          </button>
        ) : null}
        {isAdmin ? (
          <button
            type="button"
            className={activeTab === 'materials' ? 'view-active' : ''}
            onClick={() => setActiveTab('materials')}
          >
            Materialen ({materials.length})
          </button>
        ) : null}
        {isAdmin ? (
          <button
            type="button"
            className={activeTab === 'pricing' ? 'view-active' : ''}
            onClick={() => setActiveTab('pricing')}
          >
            Berekeningsprijzen
          </button>
        ) : null}
        {isAdmin ? (
          <button
            type="button"
            className={activeTab === 'content' ? 'view-active' : ''}
            onClick={() => setActiveTab('content')}
          >
            Teksten &amp; footer
          </button>
        ) : null}
        <button type="button" onClick={refreshBackofficeData}>
          {isAdmin ? 'Verversen' : t('common.refresh')}
        </button>
      </div>

      {message ? <p className="status-text">{message}</p> : null}

      {!isAdmin ? (
        <section className="panel stack account-section">
          <h3>{t('account.detailsTitle')}</h3>
          <div className="data-card account-details">
            <p>
              <strong>{t('common.email')}:</strong> {user.email}
            </p>
            {customerProfile ? (
              <>
                {customerProfile.company ? (
                  <p>
                    <strong>{t('common.company')}:</strong> {customerProfile.company}
                  </p>
                ) : null}
                <p>
                  <strong>{t('common.name')}:</strong> {customerProfile.name}
                </p>
                <p>
                  <strong>{t('common.phone')}:</strong> {customerProfile.phone}
                </p>
              </>
            ) : (
              <p className="hint">{t('account.noProfile')}</p>
            )}
          </div>

          {customerProfile ? (
            <form className="account-address-form stack" onSubmit={handleSaveAddress}>
              <h4>{t('account.addressTitle')}</h4>
              <p className="hint">{t('account.addressHint')}</p>
              <div className="customer-profile-fields account-address-fields">
                <label>
                  {t('login.street')}
                  <input
                    type="text"
                    value={addressDraft.street}
                    onChange={(event) =>
                      setAddressDraft((prev) => ({ ...prev, street: event.target.value }))
                    }
                    required
                    autoComplete="street-address"
                  />
                </label>
                <label>
                  {t('login.postalCode')}
                  <input
                    type="text"
                    value={addressDraft.postalCode}
                    onChange={(event) =>
                      setAddressDraft((prev) => ({ ...prev, postalCode: event.target.value }))
                    }
                    required
                    autoComplete="postal-code"
                  />
                </label>
                <label>
                  {t('login.city')}
                  <input
                    type="text"
                    value={addressDraft.city}
                    onChange={(event) =>
                      setAddressDraft((prev) => ({ ...prev, city: event.target.value }))
                    }
                    required
                    autoComplete="address-level2"
                  />
                </label>
                <label>
                  {t('login.country')}
                  <input
                    type="text"
                    value={addressDraft.country}
                    onChange={(event) =>
                      setAddressDraft((prev) => ({ ...prev, country: event.target.value }))
                    }
                    required
                    autoComplete="country-name"
                  />
                </label>
              </div>
              <div className="row-btns">
                <button type="submit" className="primary" disabled={savingAddress}>
                  {savingAddress ? t('common.saving') : t('account.saveAddress')}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      {(!isAdmin || activeTab === 'requests') && (
        <section className="panel stack">
          <h3>{visibleRequestCountLabel}</h3>
          {isAdmin ? (
            <div className="row-btns request-list-filter">
              <button
                type="button"
                className={requestListFilter === 'open' ? 'view-active' : ''}
                onClick={() => setRequestListFilter('open')}
              >
                Open orders ({openRequests.length})
              </button>
              <button
                type="button"
                className={requestListFilter === 'history' ? 'view-active' : ''}
                onClick={() => setRequestListFilter('history')}
              >
                Afgehandelde orders ({historyRequests.length})
              </button>
            </div>
          ) : null}
          {visibleRequests.length === 0 ? (
            <p className="hint">
              {isAdmin && requestListFilter === 'history'
                ? 'Geen orders in de historie.'
                : t('requests.noneYet')}
            </p>
          ) : null}
          <div className="card-list">
            {visibleRequests.map((request) => (
              <article
                className={`data-card${onOpenRequestInCalculator ? ' data-card--request-open' : ''}`}
                key={request.id}
                role={onOpenRequestInCalculator ? 'button' : undefined}
                tabIndex={onOpenRequestInCalculator ? 0 : undefined}
                onClick={
                  onOpenRequestInCalculator ? () => handleRequestCardActivate(request) : undefined
                }
                onKeyDown={
                  onOpenRequestInCalculator
                    ? (e) => handleRequestCardKeyDown(e, request)
                    : undefined
                }
                aria-label={
                  onOpenRequestInCalculator && !isAdmin
                    ? t('requests.openHint')
                    : onOpenRequestInCalculator
                      ? 'Aanvraag openen in calculator'
                      : undefined
                }
              >
                <div className="data-card__head">
                  <div className="data-card__head-main">
                    {request.requestNumber ? (
                      <span className="request-number">{request.requestNumber}</span>
                    ) : null}
                    <strong>{request.material?.materiaal || 'Onbekend materiaal'}</strong>
                  </div>
                  <div className="data-card__head-actions">
                    <span>{formatDate(request.createdAt)}</span>
                    {isAdmin ? (
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        aria-label="Aanvraag verwijderen"
                        title="Aanvraag verwijderen"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeleteRequest(request)
                        }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path
                            d="M4 7h16M9 7V5h6v2m-9 3v9h12v-9M10 11v6m4-6v6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </div>
                {isAdmin && request.customerEmail ? <p>Account: {request.customerEmail}</p> : null}
                {isAdmin && request.customerProfile ? (
                  <p className="hint">
                    {request.customerProfile.company ? `${request.customerProfile.company} | ` : ''}
                    {request.customerProfile.name} | {request.customerProfile.street},{' '}
                    {request.customerProfile.postalCode} {request.customerProfile.city} |{' '}
                    {request.customerProfile.phone}
                  </p>
                ) : null}
                <p>
                  {isAdmin ? (
                    <>
                      Lengte: {request.totalLength.toFixed(2)} mm | Aantal: {request.aantalStuks} | Totaal:{' '}
                      {request.totaalPrijs.toFixed(2)} EUR
                    </>
                  ) : (
                    <>
                      {t('requests.length')}: {request.totalLength.toFixed(2)} mm | {t('requests.quantity')}:{' '}
                      {request.aantalStuks} | {t('requests.total')}: {request.totaalPrijs.toFixed(2)} EUR
                    </>
                  )}
                </p>
                <p className="hint">
                  Regels: {request.lines.map((line) => `X${line.x} Y${line.y} Z${line.z}`).join(' | ')}
                </p>
                {isAdmin ? (
                  <div
                    className="data-card__admin-actions"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    {isRequestArchived(request) ? (
                      <p className="request-status-line">
                        <span
                          className={`request-status request-status--${normalizeRequestStatus(request.status)}`}
                        >
                          {formatRequestStatus(request.status)}
                        </span>
                        {request.archivedAt ? (
                          <span className="hint">
                            In historie sinds {formatDate(request.archivedAt)}
                          </span>
                        ) : null}
                      </p>
                    ) : (
                      <label>
                        Status
                        <select
                          value={normalizeRequestStatus(request.status)}
                          onChange={(event) =>
                            handleStatusChange(request.id, event.target.value)
                          }
                        >
                          {REQUEST_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="row-btns data-card__admin-btns">
                      {canArchiveRequest(request) ? (
                        <button type="button" onClick={() => handleArchiveRequest(request)}>
                          Naar historie
                        </button>
                      ) : null}
                      {isRequestArchived(request) ? (
                        <button type="button" onClick={() => handleRestoreRequest(request)}>
                          Terug naar open
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="request-status-line">
                    {request.requestNumber ? (
                      <span className="request-number">{request.requestNumber}</span>
                    ) : null}
                    <span
                      className={`request-status request-status--${normalizeRequestStatus(request.status)}`}
                    >
                      {formatRequestStatus(request.status, isAdmin ? undefined : t)}
                    </span>
                  </p>
                )}
                {onOpenRequestInCalculator ? (
                  <p className="data-card__open-hint">
                    {isAdmin ? 'Klik om te openen in de calculator' : t('requests.openHint')}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      )}

      {isAdmin && activeTab === 'customers' && (
        <section className="panel stack customer-directory">
          <div className="data-card__head">
            <h3>Klantenbestand</h3>
            <span className="hint">
              {customersSource === 'firebase'
                ? `${filteredCustomers.length} van ${customers.length} klanten`
                : 'Klanten laden…'}
            </span>
          </div>
          <label className="customer-directory__search">
            Zoeken
            <input
              type="search"
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              placeholder="Naam, e-mail, plaats, telefoon…"
              autoComplete="off"
            />
          </label>
          {filteredCustomers.length === 0 ? (
            <p className="hint">
              {customers.length === 0
                ? 'Nog geen geregistreerde klanten in Firebase.'
                : 'Geen klanten gevonden voor deze zoekopdracht.'}
            </p>
          ) : (
            <div className="customer-directory__table-wrap">
              <table className="customer-directory__table">
                <thead>
                  <tr>
                    <th className="customer-directory__col-expand" aria-label="Aanvragen tonen" />
                    <th>Naam</th>
                    <th>Bedrijf</th>
                    <th>E-mail</th>
                    <th>Adres</th>
                    <th>Telefoon</th>
                    <th>Aanvragen</th>
                    <th>Geregistreerd</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => {
                    const customerRequests = requestsByCustomerUid.get(customer.uid) || []
                    const expanded = expandedCustomerUid === customer.uid
                    return (
                      <Fragment key={customer.uid}>
                        <tr
                          className={
                            expanded ? 'customer-directory__row customer-directory__row--expanded' : 'customer-directory__row'
                          }
                        >
                          <td className="customer-directory__col-expand" data-label="Aanvragen">
                            <button
                              type="button"
                              className="customer-directory__expand"
                              onClick={() => toggleCustomerExpanded(customer.uid)}
                              aria-expanded={expanded}
                              aria-label={
                                expanded
                                  ? `Aanvragen verbergen voor ${customer.name || 'klant'}`
                                  : `${customerRequests.length} aanvragen tonen voor ${customer.name || 'klant'}`
                              }
                            >
                              {expanded ? '▼' : '▶'}
                            </button>
                          </td>
                          <td data-label="Naam">{customer.name || '—'}</td>
                          <td data-label="Bedrijf">{customer.company || '—'}</td>
                          <td data-label="E-mail">
                            {customer.email ? (
                              <a
                                href={`mailto:${customer.email}`}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {customer.email}
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td data-label="Adres">
                            {[customer.street, customer.postalCode, customer.city, customer.country]
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </td>
                          <td data-label="Telefoon">{customer.phone || '—'}</td>
                          <td data-label="Aanvragen">{customerRequests.length}</td>
                          <td data-label="Geregistreerd">{formatDate(customer.createdAt)}</td>
                        </tr>
                        {expanded ? (
                          <tr className="customer-directory__requests-row">
                            <td colSpan={8}>
                              <div className="customer-directory__requests">
                                {customerRequests.length === 0 ? (
                                  <p className="hint">Deze klant heeft nog geen aanvragen.</p>
                                ) : (
                                  customerRequests.map((request) => (
                                    <button
                                      key={request.id}
                                      type="button"
                                      className="customer-directory__request"
                                      disabled={!onOpenRequestInCalculator}
                                      onClick={() => handleRequestCardActivate(request)}
                                    >
                                      <span className="customer-directory__request-main">
                                        {request.requestNumber ? (
                                          <span className="request-number">{request.requestNumber}</span>
                                        ) : null}
                                        <strong>{request.material?.materiaal || 'Onbekend materiaal'}</strong>
                                        <span
                                          className={`request-status request-status--${normalizeRequestStatus(request.status)}`}
                                        >
                                          {formatRequestStatus(request.status)}
                                        </span>
                                      </span>
                                      <span className="customer-directory__request-meta">
                                        {formatDate(request.createdAt)} · {request.aantalStuks} st ·{' '}
                                        {request.totaalPrijs.toFixed(2)} EUR
                                        {isRequestArchived(request) ? ' · Historie' : ''}
                                      </span>
                                      {onOpenRequestInCalculator ? (
                                        <span className="data-card__open-hint">
                                          Openen in calculator
                                        </span>
                                      ) : null}
                                    </button>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {isAdmin && activeTab === 'materials' && (
        <section className="panel stack">
          <h3>Materialen bewerken</h3>
          <p className="hint">
            {materialsSource === 'firebase' || materialsSource === 'firebase-seeded'
              ? `Materialen uit Firebase (${materials.length})`
              : materialsHint || 'Materialen laden…'}
          </p>
          <form className="material-form" onSubmit={handleSaveMaterial}>
            <label>
              Materiaal
              <input
                type="text"
                value={editing.materiaalSoort}
                onChange={(event) => updateEditing('materiaalSoort', event.target.value)}
              />
            </label>
            <label>
              Naam / omschrijving
              <input
                type="text"
                value={editing.materiaal}
                onChange={(event) => updateEditing('materiaal', event.target.value)}
                required
              />
            </label>
            <label>
              Prijs per meter
              <input
                type="number"
                step="0.01"
                value={editing.prijsPerMTR}
                onChange={(event) => updateEditing('prijsPerMTR', event.target.value)}
              />
            </label>
            <label>
              Klemlengte
              <input
                type="number"
                step="0.1"
                value={editing.klemLengte}
                onChange={(event) => updateEditing('klemLengte', event.target.value)}
              />
            </label>
            <label>
              Radius
              <input
                type="number"
                step="0.1"
                value={editing.radius}
                onChange={(event) => updateEditing('radius', event.target.value)}
              />
            </label>
            <label>
              Diameter
              <input
                type="number"
                step="0.1"
                value={editing.diameterMm}
                onChange={(event) => updateEditing('diameterMm', event.target.value)}
              />
            </label>
            <label>
              Volgorde
              <input
                type="number"
                value={editing.sortOrder}
                onChange={(event) => updateEditing('sortOrder', event.target.value)}
              />
            </label>
            <div className="row-btns">
              <button type="submit" className="primary">
                Materiaal opslaan
              </button>
              <button type="button" onClick={() => setEditing(emptyMaterial)}>
                Nieuw/leeg
              </button>
            </div>
          </form>

          <div className="table-wrap">
            <table className="coord-table admin-table">
              <thead>
                <tr>
                  <th>Materiaal</th>
                  <th>Naam</th>
                  <th>Prijs/m</th>
                  <th>Klem</th>
                  <th>Radius</th>
                  <th>Diameter</th>
                  <th>Acties</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="hint">
                      Geen materialen gevonden in Firebase.
                    </td>
                  </tr>
                ) : null}
                {materials.map((material) => (
                  <tr key={material.id}>
                    <td>{material.materiaalSoort || DEFAULT_MATERIAAL_SOORT}</td>
                    <td>{material.materiaal}</td>
                    <td>{material.prijsPerMTR}</td>
                    <td>{material.klemLengte}</td>
                    <td>{material.radius}</td>
                    <td>{material.diameterMm}</td>
                    <td>
                      <div className="row-btns">
                        <button type="button" onClick={() => editMaterial(material)}>
                          Bewerk
                        </button>
                        <button type="button" onClick={() => handleDeleteMaterial(material.id)}>
                          Verwijder
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isAdmin && activeTab === 'pricing' && (
        <section className="panel stack">
          <h3>Berekeningsprijzen</h3>
          <p className="hint">
            {pricingSource === 'firebase' || pricingSource === 'firebase-seeded'
              ? 'Deze waarden worden gebruikt in de calculator. Prijs per meter staat per materiaal.'
              : 'Prijzen laden…'}
          </p>
          <form className="material-form pricing-form" onSubmit={handleSavePricing}>
            <label>
              Prijs per lijn (€)
              <input
                type="number"
                step="0.01"
                min={0}
                value={pricing.prijsPerLijn}
                onChange={(event) => updatePricingField('prijsPerLijn', event.target.value)}
              />
              <span className="hint">Extra kosten per bocht/regel na de eerste.</span>
            </label>
            <label>
              Buis-meterfactor
              <input
                type="number"
                step="0.01"
                min={0}
                value={pricing.buisMeterFactor}
                onChange={(event) => updatePricingField('buisMeterFactor', event.target.value)}
              />
              <span className="hint">
                Buiskosten = factor × prijs per meter (materiaal).
              </span>
            </label>
            <label>
              Buislengte (mm)
              <input
                type="number"
                step="1"
                min={1}
                value={pricing.buisLengteMm}
                onChange={(event) => updatePricingField('buisLengteMm', event.target.value)}
              />
              <span className="hint">Beschikbare lengte om stuks per buis te berekenen.</span>
            </label>
            <label>
              Vaste kosten (€)
              <input
                type="number"
                step="0.01"
                min={0}
                value={pricing.vasteKosten}
                onChange={(event) => updatePricingField('vasteKosten', event.target.value)}
              />
              <span className="hint">Wordt verdeeld over het aantal stuks.</span>
            </label>
            <label>
              Max. gestrekte lengte (mm)
              <input
                type="number"
                step="1"
                min={1}
                value={pricing.maxGestrekteLengteMm}
                onChange={(event) =>
                  updatePricingField('maxGestrekteLengteMm', event.target.value)
                }
              />
              <span className="hint">Boven deze lengte geeft de calculator een foutmelding.</span>
            </label>
            <div className="row-btns">
              <button type="submit" className="primary">
                Prijzen opslaan
              </button>
            </div>
          </form>
        </section>
      )}

      {isAdmin && activeTab === 'content' && (
        <section className="panel stack">
          <h3>Teksten &amp; footer</h3>
          <p className="hint">
            {siteContentSource === 'firebase' || siteContentSource === 'firebase-seeded'
              ? 'Teksten uit Firebase (NL en English UK). Klanten zien de taal die ze kiezen in de header.'
              : 'Teksten laden…'}
          </p>
          <div className="row-btns site-content-locale-switch" role="group" aria-label="Taal voor teksten">
            <button
              type="button"
              className={siteContentEditLocale === SITE_CONTENT_LOCALE_NL ? 'view-active' : ''}
              onClick={() => switchSiteContentEditLocale(SITE_CONTENT_LOCALE_NL)}
            >
              Nederlands
            </button>
            <button
              type="button"
              className={siteContentEditLocale === SITE_CONTENT_LOCALE_EN ? 'view-active' : ''}
              onClick={() => switchSiteContentEditLocale(SITE_CONTENT_LOCALE_EN)}
            >
              English (UK)
            </button>
          </div>
          <div className="row-btns">
            <button type="button" onClick={handleLoadNlDefaults}>
              NL-standaardteksten laden
            </button>
            <button type="button" className="primary" onClick={handleRestoreNlAndSave}>
              NL herstellen en opslaan
            </button>
          </div>
          <p className="hint">
            Gebruik &quot;NL herstellen en opslaan&quot; om alle Nederlandse teksten (inclusief
            startpagina) terug te zetten. English (UK) blijft zoals het nu in Firebase staat.
          </p>
          <form className="site-content-form" onSubmit={handleSaveSiteContent}>
            <fieldset className="site-content-form__group">
              <legend>Info-popup (header)</legend>
              <p className="hint">
                Teksten in de popup achter de info-knop in de header (op alle pagina&apos;s).
              </p>
              <label>
                Titel
                <input
                  type="text"
                  value={siteContent.info.title}
                  onChange={(event) =>
                    updateSiteContentField('info', 'title', event.target.value)
                  }
                  required
                />
              </label>
              <label className="site-content-form__full">
                Introductie
                <textarea
                  rows={3}
                  value={siteContent.info.intro}
                  onChange={(event) =>
                    updateSiteContentField('info', 'intro', event.target.value)
                  }
                  required
                />
              </label>
              <label className="site-content-form__full">
                Uitleg
                <textarea
                  rows={4}
                  value={siteContent.info.body}
                  onChange={(event) =>
                    updateSiteContentField('info', 'body', event.target.value)
                  }
                  required
                />
              </label>
            </fieldset>

            <fieldset className="site-content-form__group">
              <legend>Welkomsttekst calculator</legend>
              <label>
                Titel
                <input
                  type="text"
                  value={siteContent.welcome.title}
                  onChange={(event) =>
                    updateSiteContentField('welcome', 'title', event.target.value)
                  }
                  required
                />
              </label>
              <label className="site-content-form__full">
                Tekst (na eventuele persoonlijke begroeting)
                <textarea
                  rows={3}
                  value={siteContent.welcome.body}
                  onChange={(event) =>
                    updateSiteContentField('welcome', 'body', event.target.value)
                  }
                  required
                />
              </label>
              <p className="hint">
                De persoonlijke begroeting stel je hieronder in (met {'{name}'}).
              </p>
            </fieldset>

            <fieldset className="site-content-form__group">
              <legend>Calculator — meldingen &amp; knoppen</legend>
              <label>
                Persoonlijke begroeting
                <input
                  type="text"
                  value={siteContent.calculator.greeting}
                  onChange={(event) =>
                    updateSiteContentField('calculator', 'greeting', event.target.value)
                  }
                />
                <span className="hint">Alleen zichtbaar als de klant is ingelogd. Gebruik {'{name}'}.</span>
              </label>
              <label className="site-content-form__full">
                Aanvraag geopend in calculator
                <textarea
                  rows={2}
                  value={siteContent.calculator.requestOpened}
                  onChange={(event) =>
                    updateSiteContentField('calculator', 'requestOpened', event.target.value)
                  }
                />
              </label>
              <label className="site-content-form__full">
                Aanvraag geladen (alternatieve melding)
                <textarea
                  rows={2}
                  value={siteContent.calculator.requestLoaded}
                  onChange={(event) =>
                    updateSiteContentField('calculator', 'requestLoaded', event.target.value)
                  }
                />
              </label>
              <label className="site-content-form__full">
                Inloggen verplicht
                <textarea
                  rows={2}
                  value={siteContent.calculator.loginRequired}
                  onChange={(event) =>
                    updateSiteContentField('calculator', 'loginRequired', event.target.value)
                  }
                />
              </label>
              <label className="site-content-form__full">
                Accountgegevens ontbreken
                <textarea
                  rows={2}
                  value={siteContent.calculator.profileRequired}
                  onChange={(event) =>
                    updateSiteContentField('calculator', 'profileRequired', event.target.value)
                  }
                />
              </label>
              <label className="site-content-form__full">
                Aanvraag verzonden (met nummer)
                <textarea
                  rows={2}
                  value={siteContent.calculator.requestSuccessWithNumber}
                  onChange={(event) =>
                    updateSiteContentField(
                      'calculator',
                      'requestSuccessWithNumber',
                      event.target.value,
                    )
                  }
                />
                <span className="hint">Gebruik {'{requestNumber}'} voor het aanvraagnummer.</span>
              </label>
              <label className="site-content-form__full">
                Aanvraag verzonden (zonder nummer)
                <textarea
                  rows={2}
                  value={siteContent.calculator.requestSuccess}
                  onChange={(event) =>
                    updateSiteContentField('calculator', 'requestSuccess', event.target.value)
                  }
                />
              </label>
              <label className="site-content-form__full">
                Aanvraag opslaan mislukt
                <textarea
                  rows={2}
                  value={siteContent.calculator.requestSaveFailed}
                  onChange={(event) =>
                    updateSiteContentField('calculator', 'requestSaveFailed', event.target.value)
                  }
                />
                <span className="hint">Gebruik {'{error}'} voor de foutmelding.</span>
              </label>
              <label className="site-content-form__full">
                Hint — ingelogde klant
                <textarea
                  rows={2}
                  value={siteContent.calculator.hintCustomer}
                  onChange={(event) =>
                    updateSiteContentField('calculator', 'hintCustomer', event.target.value)
                  }
                />
              </label>
              <label className="site-content-form__full">
                Hint — niet ingelogd
                <textarea
                  rows={2}
                  value={siteContent.calculator.hintGuest}
                  onChange={(event) =>
                    updateSiteContentField('calculator', 'hintGuest', event.target.value)
                  }
                />
              </label>
              <label>
                Knoptekst — aanvraag aanmaken
                <input
                  type="text"
                  value={siteContent.calculator.submitButtonCustomer}
                  onChange={(event) =>
                    updateSiteContentField('calculator', 'submitButtonCustomer', event.target.value)
                  }
                />
              </label>
              <label>
                Knoptekst — inloggen om te versturen
                <input
                  type="text"
                  value={siteContent.calculator.submitButtonGuest}
                  onChange={(event) =>
                    updateSiteContentField('calculator', 'submitButtonGuest', event.target.value)
                  }
                />
              </label>
            </fieldset>

            <fieldset className="site-content-form__group">
              <legend>Footer — adres &amp; contact</legend>
              <label>
                Bedrijfsnaam
                <input
                  type="text"
                  value={siteContent.footer.companyTitle}
                  onChange={(event) =>
                    updateSiteContentField('footer', 'companyTitle', event.target.value)
                  }
                />
              </label>
              <label>
                Adres regel 1
                <input
                  type="text"
                  value={siteContent.footer.addressLine1}
                  onChange={(event) =>
                    updateSiteContentField('footer', 'addressLine1', event.target.value)
                  }
                />
              </label>
              <label>
                Adres regel 2
                <input
                  type="text"
                  value={siteContent.footer.addressLine2}
                  onChange={(event) =>
                    updateSiteContentField('footer', 'addressLine2', event.target.value)
                  }
                />
              </label>
              <label>
                Adres regel 3
                <input
                  type="text"
                  value={siteContent.footer.addressLine3}
                  onChange={(event) =>
                    updateSiteContentField('footer', 'addressLine3', event.target.value)
                  }
                />
              </label>
              <label>
                Telefoon
                <input
                  type="text"
                  value={siteContent.footer.phone}
                  onChange={(event) =>
                    updateSiteContentField('footer', 'phone', event.target.value)
                  }
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  value={siteContent.footer.email}
                  onChange={(event) =>
                    updateSiteContentField('footer', 'email', event.target.value)
                  }
                />
              </label>
              <label>
                Website-URL
                <input
                  type="url"
                  value={siteContent.footer.websiteUrl}
                  onChange={(event) =>
                    updateSiteContentField('footer', 'websiteUrl', event.target.value)
                  }
                />
              </label>
              <label>
                Website-label
                <input
                  type="text"
                  value={siteContent.footer.websiteLabel}
                  onChange={(event) =>
                    updateSiteContentField('footer', 'websiteLabel', event.target.value)
                  }
                />
              </label>
            </fieldset>

            <fieldset className="site-content-form__group">
              <legend>Footer — bedrijfsgegevens</legend>
              <label>
                KvK
                <input
                  type="text"
                  value={siteContent.footer.kvk}
                  onChange={(event) => updateSiteContentField('footer', 'kvk', event.target.value)}
                />
              </label>
              <label>
                BTW
                <input
                  type="text"
                  value={siteContent.footer.btw}
                  onChange={(event) => updateSiteContentField('footer', 'btw', event.target.value)}
                />
              </label>
              <label className="site-content-form__full">
                Prijs-/BTW-opmerking
                <input
                  type="text"
                  value={siteContent.footer.priceNote}
                  onChange={(event) =>
                    updateSiteContentField('footer', 'priceNote', event.target.value)
                  }
                />
              </label>
              <label className="site-content-form__full">
                Copyrightregel (na © jaar)
                <input
                  type="text"
                  value={siteContent.footer.copyrightLine}
                  onChange={(event) =>
                    updateSiteContentField('footer', 'copyrightLine', event.target.value)
                  }
                />
              </label>
            </fieldset>

            <div className="row-btns">
              <button type="submit" className="primary">
                Teksten opslaan
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
