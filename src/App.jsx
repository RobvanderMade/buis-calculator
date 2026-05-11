import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import Backoffice from './Backoffice.jsx'
import { auth } from './firebase.js'
import { loadCustomerProfile } from './customerRepository.js'
import LoginPanel from './LoginPanel.jsx'
import SiteHeader from './SiteHeader.jsx'
import PipeCanvas from './PipeCanvas.jsx'
import { DEFAULT_MATERIALS } from './materials.js'
import { loadMaterials } from './materialRepository.js'
import { createRequest } from './requestRepository.js'
import {
  calculatePricePerStuk,
  calculateTotalLength,
  rowSegmentLengths,
  validateLines,
} from './pipeMath.js'

const initialRows = () =>
  Array.from({ length: 3 }, () => ({
    x: 0,
    y: 0,
    z: 0,
  }))

function parseCoord(v) {
  const n = Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? n : 0
}

export default function App() {
  const [rows, setRows] = useState(initialRows)
  const [materialIndex, setMaterialIndex] = useState(0)
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS)
  const [materialStatus, setMaterialStatus] = useState({
    loading: true,
    message: 'Materialen laden...',
  })
  const [aantalStuks, setAantalStuks] = useState(1)
  const [view, setView] = useState('XY')
  const [isGridFullscreen, setIsGridFullscreen] = useState(false)
  const [activePage, setActivePage] = useState('calculator')
  const [path, setPath] = useState(window.location.pathname)
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)
  const [loginInitialMode, setLoginInitialMode] = useState('login')
  const [session, setSession] = useState(null)
  const [requestStatus, setRequestStatus] = useState('')
  const isAdminPage = path === '/admin'

  const lines = useMemo(
    () => rows.map((r) => ({ x: parseCoord(r.x), y: parseCoord(r.y), z: parseCoord(r.z) })),
    [rows],
  )

  const segmentLens = useMemo(() => rowSegmentLengths(lines), [lines])
  const totalLength = useMemo(() => calculateTotalLength(lines), [lines])
  const material = materials[materialIndex] ?? materials[0]

  const computed = useMemo(() => {
    const prijsPerMTR = material?.prijsPerMTR ?? 0
    const stuks = Math.max(1, parseInt(String(aantalStuks), 10) || 1)
    return calculatePricePerStuk(totalLength, prijsPerMTR, stuks, lines)
  }, [totalLength, material, aantalStuks, lines])

  const displayPrijsPerStuk = computed.error ? 0 : computed.value
  const displayTotaal = displayPrijsPerStuk * Math.max(1, parseInt(String(aantalStuks), 10) || 1)

  useEffect(() => {
    let cancelled = false

    async function fetchMaterials() {
      const result = await loadMaterials()
      if (cancelled) return

      setMaterials(result.materials)
      setMaterialStatus({
        loading: false,
        message:
          result.message ||
          (result.source === 'firebase-seeded'
            ? 'Materialen zijn opgeslagen in Firebase en geladen.'
            : 'Materialen geladen uit Firebase.'),
      })
    }

    fetchMaterials()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (materialIndex >= materials.length) setMaterialIndex(0)
  }, [materialIndex, materials.length])

  useEffect(() => {
    if (!isGridFullscreen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsGridFullscreen(false)
    }

    document.body.classList.add('modal-open')
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isGridFullscreen])

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function updateCell(rowIndex, key, raw) {
    setRows((prev) =>
      prev.map((row, i) => (i === rowIndex ? { ...row, [key]: raw } : row)),
    )
  }

  function addRow() {
    setRows((prev) => [...prev, { x: 0, y: 0, z: 0 }])
  }

  function resetFields() {
    setRows(initialRows())
    setAantalStuks(1)
  }

  function runValidate() {
    const res = validateLines(lines, material)
    alert(res.message)
  }

  async function handleLogin(nextSession) {
    let customerProfile = nextSession.customerProfile ?? null
    if (nextSession.role === 'customer' && !customerProfile) {
      try {
        customerProfile = await loadCustomerProfile(nextSession.user.uid)
      } catch {
        customerProfile = null
      }
    }
    setSession({ ...nextSession, customerProfile })
    setLoginPanelOpen(false)
    if (nextSession.role === 'admin') {
      navigate('/admin')
    } else {
      navigate('/')
      setActivePage('calculator')
    }
  }

  async function handleLogout() {
    if (auth) await signOut(auth)
    setSession(null)
    setActivePage('calculator')
  }

  function navigate(nextPath) {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  async function submitRequest() {
    setRequestStatus('')

    if (session?.role !== 'customer') {
      setRequestStatus('Maak eerst een My BendR account aan of log in om een aanvraag te versturen.')
      setLoginInitialMode('register')
      setLoginPanelOpen(true)
      return
    }

    if (!session.customerProfile) {
      setRequestStatus('Vul eerst je accountgegevens aan voordat je een aanvraag verstuurt.')
      setLoginPanelOpen(true)
      return
    }

    const validation = validateLines(lines, material)
    if (!validation.ok) {
      setRequestStatus(validation.message)
      return
    }

    try {
      const stuks = Math.max(1, parseInt(String(aantalStuks), 10) || 1)
      await createRequest({
        customerUid: session?.role === 'customer' ? session.user.uid : '',
        customerEmail: session?.role === 'customer' ? session.user.email : '',
        customerProfile: session.customerProfile,
        material,
        lines,
        totalLength,
        aantalStuks: stuks,
        prijsPerStuk: displayPrijsPerStuk,
        totaalPrijs: displayPrijsPerStuk * stuks,
      })
      setRequestStatus('Aanvraag aangemaakt. Wij nemen deze in behandeling.')
    } catch (error) {
      setRequestStatus(`Aanvraag opslaan mislukt: ${error.message}`)
    }
  }

  return (
    <div className="app">
      <SiteHeader
        accountLabel="My BendR"
        isLoggedIn={Boolean(session)}
        showBackButton={Boolean(session) && (isAdminPage || activePage === 'customer')}
        onAccountClick={() => {
          if (session?.role === 'customer') {
            navigate('/')
            setActivePage('customer')
          } else if (session?.role === 'admin') {
            navigate('/admin')
          } else {
            setLoginInitialMode('login')
            setLoginPanelOpen(true)
          }
        }}
        onHomeClick={() => {
          navigate('/')
          setActivePage('calculator')
        }}
        onLogoutClick={handleLogout}
      />
      <div className="site-main">
        {computed.error ? <div className="error-banner">{computed.error}</div> : null}

        {isAdminPage && session?.role === 'admin' ? (
          <Backoffice user={session.user} role={session.role} onLogout={handleLogout} />
        ) : isAdminPage ? (
          <div className="admin-login-page">
            <LoginPanel
              fixedRole="admin"
              embedded
              title="Admin login"
              onLogin={handleLogin}
            />
          </div>
        ) : activePage === 'customer' && session ? (
          <Backoffice
            user={session.user}
            role={session.role}
            customerProfile={session.customerProfile}
            onLogout={handleLogout}
          />
        ) : (
        <div className="container">
        <div className="panel stack">
          <div>
            <label htmlFor="materiaal">
              <strong>Kies materiaal &amp; radius:</strong>
            </label>
            <select
              id="materiaal"
              value={materialIndex}
              disabled={materials.length === 0}
              onChange={(e) => setMaterialIndex(Number(e.target.value))}
            >
              {materials.map((m, i) => (
                <option key={m.id || m.materiaal} value={i}>
                  {m.materiaal}
                </option>
              ))}
            </select>
            <p className="status-text">{materialStatus.message}</p>
          </div>

          <table className="coord-table">
            <thead>
              <tr>
                <th>Regel</th>
                <th>X (mm)</th>
                <th>Y (mm)</th>
                <th>Z (mm)</th>
                <th>Lengte (mm)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>Regel {i + 1}</td>
                  {(['x', 'y', 'z']).map((k) => (
                    <td key={k}>
                      <input
                        type="number"
                        value={row[k]}
                        onChange={(e) => updateCell(i, k, e.target.value)}
                      />
                    </td>
                  ))}
                  <td>{segmentLens[i].toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row-btns">
            <button type="button" onClick={addRow}>
              Voeg een regel toe
            </button>
            <button type="button" onClick={resetFields}>
              Reset
            </button>
          </div>

          <button type="button" className="success" onClick={runValidate}>
            Invoer controleren
          </button>

          <div>
            <label htmlFor="totalLength">Gestrekte lengte (maximaal 6000 mm):</label>
            <br />
            <input
              id="totalLength"
              className="readonly-field"
              type="number"
              readOnly
              value={totalLength.toFixed(2)}
            />
          </div>

          <div>
            <label htmlFor="aantalStuks">Aantal stuks:</label>
            <br />
            <input
              id="aantalStuks"
              type="number"
              min={1}
              value={aantalStuks}
              onChange={(e) => setAantalStuks(e.target.value)}
            />
          </div>

          <p className="hint">
            Is de invoer gecontroleerd? Log in met My BendR of maak een account aan om de aanvraag te
            versturen.
          </p>

          <div className="row-btns">
            <button type="button" className="primary" onClick={submitRequest}>
              Aanvraag aanmaken
            </button>
          </div>
          {requestStatus ? <p className="status-text">{requestStatus}</p> : null}

          <div>
            <label htmlFor="prijsPerStuk">Prijs per stuk (in €):</label>
            <br />
            <input
              id="prijsPerStuk"
              className="readonly-field"
              type="text"
              readOnly
              value={`${displayPrijsPerStuk.toFixed(2)} €`}
            />
          </div>
          <div>
            <label htmlFor="totalePrijs">Totaal bedrag (in €):</label>
            <br />
            <input
              id="totalePrijs"
              className="readonly-field"
              type="text"
              readOnly
              value={`${displayTotaal.toFixed(2)} €`}
            />
          </div>
        </div>

        <div className="panel panel--viz stack">
          <div className="row-btns">
            {[
              { id: 'XY', label: 'Vooraanzicht (XY)' },
              { id: 'XZ', label: 'Bovenaanzicht (XZ)' },
              { id: 'YZ', label: 'Zijaanzicht (YZ)' },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                className={view === b.id ? 'view-active' : ''}
                onClick={() => setView(b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="canvas-shell">
            <button
              type="button"
              className="canvas-expand-btn"
              onClick={() => setIsGridFullscreen(true)}
              aria-label="Grid schermvullend openen"
              title="Vergroot grid"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 10V5h5M14 5h5v5M19 14v5h-5M10 19H5v-5" />
              </svg>
            </button>
            <PipeCanvas
              lines={lines}
              view={view}
              radiusMm={material?.radius ?? 0}
              diameterMm={material?.diameterMm ?? 0}
            />
          </div>
          {isGridFullscreen ? (
            <div className="canvas-fullscreen" role="dialog" aria-modal="true" aria-label="Schermvullend grid">
              <button
                type="button"
                className="canvas-close-btn"
                onClick={() => setIsGridFullscreen(false)}
                aria-label="Schermvullend grid sluiten"
                title="Sluiten"
              >
                X
              </button>
              <PipeCanvas
                lines={lines}
                view={view}
                radiusMm={material?.radius ?? 0}
                diameterMm={material?.diameterMm ?? 0}
              />
            </div>
          ) : null}
        </div>
        </div>
        )}
      </div>
      {loginPanelOpen ? (
        <LoginPanel
          fixedRole="customer"
          initialMode={loginInitialMode}
          title="My BendR"
          onLogin={handleLogin}
          onClose={() => setLoginPanelOpen(false)}
        />
      ) : null}
    </div>
  )
}
