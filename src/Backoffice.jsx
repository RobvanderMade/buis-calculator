import { useEffect, useMemo, useState } from 'react'
import { createMaterialId, deleteMaterial, loadMaterials, saveMaterial } from './materialRepository'
import { loadRequests, updateRequestStatus } from './requestRepository'

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

export default function Backoffice({ user, role, customerProfile, onLogout }) {
  const [message, setMessage] = useState('')
  const [materials, setMaterials] = useState([])
  const [requests, setRequests] = useState([])
  const [editing, setEditing] = useState(emptyMaterial)
  const [activeTab, setActiveTab] = useState('requests')

  const isAdmin = role === 'admin'

  async function refreshBackofficeData() {
    try {
      const [materialResult, requestResult] = await Promise.all([loadMaterials(), loadRequests()])
      setMaterials(materialResult.materials)
      setRequests(requestResult)
    } catch (error) {
      setMessage(error.message)
    }
  }

  useEffect(() => {
    refreshBackofficeData()
  }, [])

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

  return (
    <div className="backoffice stack">
      <div className="backoffice-header">
        <div>
          <h2>{isAdmin ? 'Backoffice' : 'My BendR account'}</h2>
          <p className="status-text">
            Ingelogd als {user.email} ({isAdmin ? 'admin' : 'klant'})
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
          Aanvragen ({requests.length})
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

      {activeTab === 'requests' || !isAdmin ? (
        <section className="panel stack">
          <h3>{isAdmin ? requestCountLabel : visibleRequestCountLabel}</h3>
          {visibleRequests.length === 0 ? <p className="hint">Nog geen aanvragen.</p> : null}
          <div className="card-list">
            {visibleRequests.map((request) => (
              <article className="data-card" key={request.id}>
                <div className="data-card__head">
                  <strong>{request.material?.materiaal || 'Onbekend materiaal'}</strong>
                  <span>{formatDate(request.createdAt)}</span>
                </div>
                {isAdmin && request.customerEmail ? <p>Klant: {request.customerEmail}</p> : null}
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
                ) : (
                  <p>Status: {request.status}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel stack">
          <h3>Materialen bewerken</h3>
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
    </div>
  )
}
