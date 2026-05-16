import { useEffect, useMemo, useState } from 'react'
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
import { saveSiteContent, subscribeSiteContent } from './siteContentRepository'

const emptyMaterial = {
  id: '',
  materiaal: '',
  prijsPerMTR: 0,
  klemLengte: 0,
  radius: 0,
  diameterMm: 0,
  sortOrder: 0,
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('nl-NL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function parseNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export default function Backoffice({ user, role, customerProfile, onLogout, onOpenRequestInCalculator }) {
  const [message, setMessage] = useState('')
  const [materials, setMaterials] = useState([])
  const [materialsSource, setMaterialsSource] = useState('')
  const [materialsHint, setMaterialsHint] = useState('')
  const [requests, setRequests] = useState([])
  const [editing, setEditing] = useState(emptyMaterial)
  const [siteContent, setSiteContent] = useState(DEFAULT_SITE_CONTENT)
  const [siteContentSource, setSiteContentSource] = useState('')
  const [pricing, setPricing] = useState(DEFAULT_PRICING)
  const [pricingSource, setPricingSource] = useState('')
  const [activeTab, setActiveTab] = useState('requests')
  const [requestListFilter, setRequestListFilter] = useState('open')

  const isAdmin = role === 'admin'

  function applyMaterialResult(result) {
    setMaterials(result.materials)
    setMaterialsSource(result.source || '')
    setMaterialsHint(result.message || '')
  }

  function applySiteContentResult(result) {
    setSiteContent(result.content)
    setSiteContentSource(result.source || '')
  }

  function applyPricingResult(result) {
    setPricing(result.pricing)
    setPricingSource(result.source || '')
  }

  function updateSiteContentField(section, key, value) {
    setSiteContent((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }))
  }

  function updatePricingField(key, value) {
    setPricing((prev) => ({ ...prev, [key]: value }))
  }

  async function refreshBackofficeData() {
    try {
      const requestResult = isAdmin
        ? await loadRequests()
        : await loadRequestsForUser(user.uid)
      setRequests(requestResult)

      if (!isAdmin) {
        const materialResult = await loadMaterials()
        applyMaterialResult(materialResult)
      }
    } catch (error) {
      setMessage(error.message)
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

      return () => {
        unsubscribeRequests()
        unsubscribeMaterials()
        unsubscribeContent()
        unsubscribePricing()
      }
    }

    loadMaterials()
      .then(applyMaterialResult)
      .catch((error) => setMessage(error.message))

    return unsubscribeRequests
  }, [isAdmin, user.uid])

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
      await saveSiteContent(siteContent)
      setMessage('Teksten en footer opgeslagen in Firebase.')
    } catch (error) {
      setMessage(`Teksten opslaan mislukt: ${error.message}`)
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
      visibleRequests.length === 1 ? 'aanvraag' : 'aanvragen'
    }`
  }, [isAdmin, requestListFilter, visibleRequests.length])

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
          <h2>{isAdmin ? 'Backoffice' : 'My BendR account'}</h2>
          <p className="status-text">
            Ingelogd als {user.email} ({isAdmin ? 'admin' : 'My BendR'})
          </p>
        </div>
        <button type="button" onClick={onLogout}>
          Uitloggen
        </button>
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
          Verversen
        </button>
      </div>

      {message ? <p className="status-text">{message}</p> : null}

      {!isAdmin ? (
        <section className="panel stack">
          <h3>Accountgegevens</h3>
          <div className="data-card account-details">
            <p>
              <strong>E-mail:</strong> {user.email}
            </p>
            {customerProfile ? (
              <>
                {customerProfile.company ? (
                  <p>
                    <strong>Bedrijf:</strong> {customerProfile.company}
                  </p>
                ) : null}
                <p>
                  <strong>Naam:</strong> {customerProfile.name}
                </p>
                <p>
                  <strong>Adres:</strong> {customerProfile.street}, {customerProfile.postalCode}{' '}
                  {customerProfile.city}
                </p>
                <p>
                  <strong>Land:</strong> {customerProfile.country}
                </p>
                <p>
                  <strong>Telefoon:</strong> {customerProfile.phone}
                </p>
              </>
            ) : (
              <p className="hint">Geen accountgegevens gevonden.</p>
            )}
          </div>
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
                : 'Nog geen aanvragen.'}
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
                  onOpenRequestInCalculator
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
                  Lengte: {request.totalLength.toFixed(2)} mm | Aantal: {request.aantalStuks} | Totaal:{' '}
                  {request.totaalPrijs.toFixed(2)} EUR
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
                      {formatRequestStatus(request.status)}
                    </span>
                  </p>
                )}
                {onOpenRequestInCalculator ? (
                  <p className="data-card__open-hint">Klik om te openen in de calculator</p>
                ) : null}
              </article>
            ))}
          </div>
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
              Naam
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
                    <td colSpan={6} className="hint">
                      Geen materialen gevonden in Firebase.
                    </td>
                  </tr>
                ) : null}
                {materials.map((material) => (
                  <tr key={material.id}>
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
              ? 'Teksten uit Firebase (zichtbaar op calculator en in de footer).'
              : 'Teksten laden…'}
          </p>
          <form className="site-content-form" onSubmit={handleSaveSiteContent}>
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
