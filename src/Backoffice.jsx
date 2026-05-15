import { useEffect, useMemo, useState } from 'react'
import {
  createMaterialId,
  deleteMaterial,
  loadMaterials,
  saveMaterial,
  subscribeMaterials,
} from './materialRepository'
import {
  deleteRequest,
  loadRequests,
  loadRequestsForUser,
  updateRequestStatus,
} from './requestRepository'
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
  const [activeTab, setActiveTab] = useState('requests')

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

  function updateSiteContentField(section, key, value) {
    setSiteContent((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }))
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
    if (!isAdmin) {
      refreshBackofficeData()
      return undefined
    }

    const unsubscribeMaterials = subscribeMaterials(applyMaterialResult, { seedIfEmpty: false })
    const unsubscribeContent = subscribeSiteContent(applySiteContentResult, { seedIfEmpty: false })

    loadRequests()
      .then(setRequests)
      .catch((error) => setMessage(error.message))

    return () => {
      unsubscribeMaterials()
      unsubscribeContent()
    }
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
      await refreshBackofficeData()
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

  const requestCountLabel = useMemo(
    () => `${requests.length} ${requests.length === 1 ? 'aanvraag' : 'aanvragen'}`,
    [requests.length],
  )
  const visibleRequests = useMemo(
    () => (isAdmin ? requests : requests.filter((request) => request.customerUid === user.uid)),
    [isAdmin, requests, user.uid],
  )
  const visibleRequestCountLabel = `${visibleRequests.length} ${
    visibleRequests.length === 1 ? 'aanvraag' : 'aanvragen'
  }`

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
          Aanvragen ({isAdmin ? requests.length : visibleRequests.length})
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
          <h3>{isAdmin ? requestCountLabel : visibleRequestCountLabel}</h3>
          {visibleRequests.length === 0 ? <p className="hint">Nog geen aanvragen.</p> : null}
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
                    <label>
                      Status
                      <select
                        value={request.status}
                        onChange={(event) => handleStatusChange(request.id, event.target.value)}
                      >
                        <option value="nieuw">Nieuw</option>
                        <option value="in_behandeling">In behandeling</option>
                        <option value="afgerond">Afgerond</option>
                      </select>
                    </label>
                  </div>
                ) : (
                  <p>
                    {request.requestNumber ? `${request.requestNumber} · ` : ''}
                    Status: {request.status}
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
                Ingelogde klanten zien automatisch &quot;Hoi [naam],&quot; vóór deze tekst.
              </p>
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
