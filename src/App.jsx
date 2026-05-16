import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import Backoffice from './Backoffice.jsx'
import { buildSessionForUser } from './authSession.js'
import { auth } from './firebase.js'
import LoginPanel from './LoginPanel.jsx'
import HomePage from './HomePage.jsx'
import SiteHeader from './SiteHeader.jsx'
import SiteFooter from './SiteFooter.jsx'
import PipeCanvas from './PipeCanvas.jsx'
import { I18nProvider, useI18n } from './i18n/I18nContext.jsx'
import { pickSiteContentForLocale } from './siteContentRepository.js'
import { getPipeMessages } from './i18n/pipeMessages.js'
import { DEFAULT_MATERIALS } from './materials.js'
import { subscribeMaterials } from './materialRepository.js'
import { DEFAULT_PRICING } from './pricing.js'
import { normalizePricing, subscribePricing } from './pricingRepository.js'
import { DEFAULT_SITE_CONTENT, formatSiteText } from './siteContent.js'
import { subscribeSiteContent } from './siteContentRepository.js'
import {
  createRequest,
  formatRequestStatus,
  normalizeRequestStatus,
} from './requestRepository.js'
import {
  calculatePricePerStuk,
  calculateTotalLength,
  rowSegmentLengths,
  rowSegmentStatuses,
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

function isCoordZero(value) {
  return value === 0 || value === '0'
}

/** Voorkomt "05" bij eerste cijfer na een standaard-0 (o.a. bij kolom invullen met Tab). */
function normalizeCoordInput(prev, raw) {
  const next = String(raw)
  if (next === '' || next === '-') return next
  if (isCoordZero(prev) && /^-?0\d/.test(next)) {
    return String(Number.parseInt(next, 10))
  }
  return raw
}

function rowsFromRequestLines(lines) {
  const raw = Array.isArray(lines) ? lines : []
  if (raw.length === 0) return initialRows()
  return raw.map((line) => ({
    x: line.x ?? 0,
    y: line.y ?? 0,
    z: line.z ?? 0,
  }))
}

function resolvePage(pathname) {
  if (pathname === '/admin') return 'admin'
  if (pathname === '/account') return 'account'
  if (pathname === '/calculator') return 'calculator'
  return 'home'
}

function resolveMaterialIndex(requestMaterial, materialsList) {
  if (!requestMaterial || !materialsList?.length) return 0
  const byId = requestMaterial.id
    ? materialsList.findIndex((m) => m.id === requestMaterial.id)
    : -1
  if (byId >= 0) return byId
  const name = requestMaterial.materiaal
  if (name != null && String(name).length > 0) {
    const byName = materialsList.findIndex((m) => m.materiaal === name)
    if (byName >= 0) return byName
  }
  return 0
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  const page = resolvePage(path)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return (
    <I18nProvider forceLocale={page === 'admin' ? 'nl' : null}>
      <AppContent path={path} setPath={setPath} page={page} />
    </I18nProvider>
  )
}

function AppContent({ path, setPath, page }) {
  const { locale, t } = useI18n()
  const [rows, setRows] = useState(initialRows)
  const [materialIndex, setMaterialIndex] = useState(0)
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS)
  const [materialError, setMaterialError] = useState('')
  const [pricingError, setPricingError] = useState('')
  const [aantalStuks, setAantalStuks] = useState(1)
  const [view, setView] = useState('XY')
  const [isGridFullscreen, setIsGridFullscreen] = useState(false)
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)
  const [loginInitialMode, setLoginInitialMode] = useState('login')
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!auth)
  const [requestStatus, setRequestStatus] = useState('')
  const [rawSiteContent, setRawSiteContent] = useState(DEFAULT_SITE_CONTENT)
  const [pricing, setPricing] = useState(DEFAULT_PRICING)
  const [viewingRequest, setViewingRequest] = useState(null)
  const siteContent = useMemo(
    () => pickSiteContentForLocale(rawSiteContent, locale),
    [rawSiteContent, locale],
  )
  const pipeMessages = useMemo(() => getPipeMessages(t), [t])
  const isAdminPage = page === 'admin'
  const isHomePage = page === 'home'
  const isCalculatorPage = page === 'calculator'
  const isAccountPage = page === 'account'
  const isCalculatorReadOnly = Boolean(viewingRequest)

  const lines = useMemo(
    () => rows.map((r) => ({ x: parseCoord(r.x), y: parseCoord(r.y), z: parseCoord(r.z) })),
    [rows],
  )

  const material = materials[materialIndex] ?? materials[0]
  const segmentLens = useMemo(() => rowSegmentLengths(lines), [lines])
  const totalLength = useMemo(
    () => calculateTotalLength(lines, material?.radius ?? 0),
    [lines, material],
  )
  const segmentStatuses = useMemo(
    () => rowSegmentStatuses(lines, material, pipeMessages),
    [lines, material, pipeMessages],
  )

  const computed = useMemo(() => {
    const prijsPerMTR = material?.prijsPerMTR ?? 0
    const stuks = Math.max(1, parseInt(String(aantalStuks), 10) || 1)
    return calculatePricePerStuk(totalLength, prijsPerMTR, stuks, lines, pricing)
  }, [totalLength, material, aantalStuks, lines, pricing])

  const displayPrijsPerStuk = computed.error ? 0 : computed.value
  const displayTotaal = displayPrijsPerStuk * Math.max(1, parseInt(String(aantalStuks), 10) || 1)

  useEffect(() => {
    const unsubscribeMaterials = subscribeMaterials((result) => {
      if (result.materials?.length) {
        setMaterials(result.materials)
      }
      setMaterialError(
        result.source === 'local' || result.source === 'error' ? result.message || '' : '',
      )
    }, { seedIfEmpty: true })

    const unsubscribePricing = subscribePricing((result) => {
      setPricing(normalizePricing(result.pricing))
      setPricingError(
        result.source === 'local' || result.source === 'error' ? result.message || '' : '',
      )
    }, { seedIfEmpty: true })

    return () => {
      unsubscribeMaterials()
      unsubscribePricing()
    }
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeSiteContent(
      (result) => setRawSiteContent(result.content),
      { seedIfEmpty: true },
    )
    return unsubscribe
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
    if (!auth) {
      setAuthReady(true)
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSession(null)
        setAuthReady(true)
        return
      }

      try {
        const restored = await buildSessionForUser(user)
        setSession(restored)
      } catch {
        setSession({ user, role: 'customer', customerProfile: null })
      }
      setAuthReady(true)
    })

    return unsubscribe
  }, [])

  function startNewCalculation({ clearStatus = true } = {}) {
    setViewingRequest(null)
    setRows(initialRows())
    setAantalStuks(1)
    setMaterialIndex(0)
    if (clearStatus) setRequestStatus('')
  }

  function updateCell(rowIndex, key, raw) {
    if (isCalculatorReadOnly) return
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row
        return { ...row, [key]: normalizeCoordInput(row[key], raw) }
      }),
    )
  }

  function handleCoordKeyDown(event, rowIndex, key) {
    if (isCalculatorReadOnly) return
    const current = rows[rowIndex][key]
    if (!isCoordZero(current)) return

    if (event.key === '-' || event.key === 'Minus') {
      event.preventDefault()
      updateCell(rowIndex, key, '-')
      return
    }

    if (event.key.length === 1 && event.key >= '0' && event.key <= '9') {
      event.preventDefault()
      updateCell(rowIndex, key, event.key)
    }
  }

  function addRow() {
    if (isCalculatorReadOnly) return
    setRows((prev) => [...prev, { x: 0, y: 0, z: 0 }])
  }

  function resetFields() {
    if (isCalculatorReadOnly) {
      startNewCalculation()
      return
    }
    setRows(initialRows())
    setAantalStuks(1)
  }

  async function handleLogin(nextSession) {
    const built = await buildSessionForUser(nextSession.user, nextSession.customerProfile)
    setSession(built)
    setLoginPanelOpen(false)
    if (built?.role === 'admin') {
      navigate('/admin')
    } else {
      navigate('/calculator')
    }
  }

  async function handleLogout() {
    if (auth) await signOut(auth)
    setSession(null)
    setViewingRequest(null)
    navigate('/')
  }

  function navigate(nextPath) {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  /** Laadt een opgeslagen aanvraag in de calculator (klant of admin). */
  function openRequestInCalculator(request) {
    if (!request) return
    const rawLines =
      Array.isArray(request.lines) && request.lines.length > 0
        ? request.lines
        : [{ x: 0, y: 0, z: 0 }]
    setRows(
      rawLines.map((line) => ({
        x: Number(line.x) || 0,
        y: Number(line.y) || 0,
        z: Number(line.z) || 0,
      })),
    )
    const mat = request.material
    if (mat) {
      const idx = materials.findIndex(
        (m) =>
          (mat.id && m.id === mat.id) ||
          (mat.materiaal && m.materiaal === mat.materiaal),
      )
      if (idx >= 0) setMaterialIndex(idx)
    }
    setAantalStuks(Math.max(1, parseInt(String(request.aantalStuks), 10) || 1))
    setViewingRequest({
      id: request.id,
      requestNumber: request.requestNumber || '',
      status: normalizeRequestStatus(request.status),
    })
    setRequestStatus(
      formatSiteText(siteContent.calculator.requestOpened, {
        requestNumber: request.requestNumber || request.id || '—',
      }),
    )
    navigate('/calculator')
    setView('XY')
    setLoginPanelOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submitRequest() {
    setRequestStatus('')

    if (session?.role !== 'customer') {
      setRequestStatus(siteContent.calculator.loginRequired)
      setLoginInitialMode('register')
      setLoginPanelOpen(true)
      return
    }

    if (!session.customerProfile) {
      setRequestStatus(siteContent.calculator.profileRequired)
      setLoginPanelOpen(true)
      return
    }

    const validation = validateLines(lines, material, pipeMessages)
    if (!validation.ok) {
      setRequestStatus(validation.message)
      return
    }

    try {
      const stuks = Math.max(1, parseInt(String(aantalStuks), 10) || 1)
      const created = await createRequest({
        customerUid: session?.role === 'customer' ? session.user.uid : '',
        customerEmail: session?.role === 'customer' ? session.user.email : '',
        customerProfile: session.customerProfile,
        material,
        lines,
        totalLength,
        aantalStuks: stuks,
        prijsPerStuk: displayPrijsPerStuk,
        totaalPrijs: displayPrijsPerStuk * stuks,
        pricing,
      })
      setRequestStatus(
        created.requestNumber
          ? formatSiteText(siteContent.calculator.requestSuccessWithNumber, {
              requestNumber: created.requestNumber,
            })
          : siteContent.calculator.requestSuccess,
      )
      startNewCalculation({ clearStatus: false })
    } catch (error) {
      setRequestStatus(
        formatSiteText(siteContent.calculator.requestSaveFailed, { error: error.message }),
      )
    }
  }

  if (!authReady) {
    return (
      <div className="app app--auth-loading">
        <p className="status-text">{t('common.loadingSession')}</p>
      </div>
    )
  }

  return (
    <div className="app">
      <SiteHeader
        accountLabel={t('header.accountMyBendR')}
        isLoggedIn={Boolean(session)}
        isAdmin={session?.role === 'admin'}
        userLabel={
          session
            ? session.customerProfile?.name ||
              session.customerProfile?.company ||
              session.user?.email ||
              ''
            : ''
        }
        showBackButton={page !== 'home'}
        onAccountClick={() => {
          if (session?.role === 'customer') {
            navigate('/account')
          } else if (session?.role === 'admin') {
            navigate('/admin')
          } else {
            setLoginInitialMode('login')
            setLoginPanelOpen(true)
          }
        }}
        onHomeClick={() => {
          navigate('/')
          setViewingRequest(null)
        }}
        showCalculatorInMenu={Boolean(session) && page !== 'calculator'}
        onCalculatorClick={() => {
          navigate('/calculator')
          setViewingRequest(null)
        }}
        onLogoutClick={handleLogout}
      />
      <div className="site-main">
        {isCalculatorPage && computed.error ? (
          <div className="error-banner">{computed.error}</div>
        ) : null}

        {isAdminPage && session?.role === 'admin' ? (
          <Backoffice
            user={session.user}
            role={session.role}
            onOpenRequestInCalculator={openRequestInCalculator}
          />
        ) : isAdminPage ? (
          <div className="admin-login-page">
            <LoginPanel
              fixedRole="admin"
              embedded
              title={t('login.adminTitle')}
              onLogin={handleLogin}
            />
          </div>
        ) : isAccountPage && session?.role === 'customer' ? (
          <Backoffice
            user={session.user}
            role={session.role}
            customerProfile={session.customerProfile}
            onOpenRequestInCalculator={openRequestInCalculator}
            onCustomerProfileUpdate={(profile) =>
              setSession((current) =>
                current ? { ...current, customerProfile: profile } : current,
              )
            }
          />
        ) : isAccountPage ? (
          <div className="panel stack home-page home-page--gate">
            <h2>{t('gate.title')}</h2>
            <p className="status-text">{t('gate.hint')}</p>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setLoginInitialMode('login')
                setLoginPanelOpen(true)
              }}
            >
              {t('common.login')}
            </button>
          </div>
        ) : isHomePage ? (
          <HomePage
            content={siteContent}
            userName={session?.customerProfile?.name || ''}
            onOpenCalculator={() => navigate('/calculator')}
          />
        ) : isCalculatorPage ? (
        <div className="container">
        <div className={`panel stack${isCalculatorReadOnly ? ' panel--readonly' : ''}`}>
          <div className="calculator-welcome">
            <h2>{siteContent.welcome.title}</h2>
            <p>
              {session?.customerProfile?.name
                ? formatSiteText(siteContent.calculator.greeting, {
                    name: session.customerProfile.name,
                  })
                : ''}
              {session?.customerProfile?.name ? ' ' : ''}
              {siteContent.welcome.body}
            </p>
          </div>
          <div>
            <label htmlFor="materiaal">
              <strong>Kies materiaal &amp; radius:</strong>
            </label>
            <select
              id="materiaal"
              value={materialIndex}
              disabled={materials.length === 0 || isCalculatorReadOnly}
              onChange={(e) => setMaterialIndex(Number(e.target.value))}
            >
              {materials.map((m, i) => (
                <option key={m.id || m.materiaal} value={i}>
                  {m.materiaal}
                </option>
              ))}
            </select>
            {materialError ? <p className="status-text">{materialError}</p> : null}
            {pricingError ? <p className="status-text">{pricingError}</p> : null}
          </div>

          <table className="coord-table">
            <thead>
              <tr>
                <th>{t('calculator.rowHeader')}</th>
                <th>{t('calculator.coordX')}</th>
                <th>{t('calculator.coordY')}</th>
                <th>{t('calculator.coordZ')}</th>
                <th>{t('calculator.lengthMm')}</th>
                <th>{t('calculator.okColumn')}</th>
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
                        readOnly={isCalculatorReadOnly}
                        disabled={isCalculatorReadOnly}
                        className={isCalculatorReadOnly ? 'readonly-field' : undefined}
                        onFocus={isCalculatorReadOnly ? undefined : (e) => e.target.select()}
                        onKeyDown={
                          isCalculatorReadOnly ? undefined : (e) => handleCoordKeyDown(e, i, k)
                        }
                        onChange={
                          isCalculatorReadOnly
                            ? undefined
                            : (e) => updateCell(i, k, e.target.value)
                        }
                      />
                    </td>
                  ))}
                  <td>{segmentLens[i].toFixed(2)}</td>
                  <td>
                    <span
                      className={`line-status ${segmentStatuses[i].ok ? 'line-status--ok' : 'line-status--warn'}`}
                      title={segmentStatuses[i].message}
                      aria-label={segmentStatuses[i].message}
                    >
                      {segmentStatuses[i].ok ? '✓' : '⚠'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row-btns">
            {isCalculatorReadOnly ? (
              <>
                {viewingRequest?.status ? (
                  <span
                    className={`request-status request-status--${viewingRequest.status}`}
                  >
                    {formatRequestStatus(viewingRequest.status, t)}
                  </span>
                ) : null}
                <button type="button" className="primary" onClick={startNewCalculation}>
                  {siteContent.calculator.newCalculation || 'Nieuwe berekening'}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={addRow}>
                  {t('calculator.addRow')}
                </button>
                <button type="button" onClick={resetFields}>
                  {t('common.reset')}
                </button>
              </>
            )}
          </div>

          <div>
            <label htmlFor="totalLength">
              {t('calculator.totalLengthLabel', { max: pricing.maxGestrekteLengteMm })}
            </label>
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
              readOnly={isCalculatorReadOnly}
              disabled={isCalculatorReadOnly}
              className={isCalculatorReadOnly ? 'readonly-field' : undefined}
              onChange={
                isCalculatorReadOnly ? undefined : (e) => setAantalStuks(e.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="prijsPerStuk">{t('calculator.pricePerPiece')}</label>
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

          {!isCalculatorReadOnly ? (
            <p className="hint">
              {session?.role === 'customer'
                ? siteContent.calculator.hintCustomer
                : siteContent.calculator.hintGuest}
            </p>
          ) : null}

          {!isCalculatorReadOnly ? (
            <div className="row-btns">
              <button type="button" className="primary" onClick={submitRequest}>
                {session?.role === 'customer'
                  ? siteContent.calculator.submitButtonCustomer
                  : siteContent.calculator.submitButtonGuest}
              </button>
            </div>
          ) : null}
          {requestStatus ? <p className="status-text">{requestStatus}</p> : null}
        </div>

        <div className="panel panel--viz stack">
          <div className="row-btns">
            {[
              { id: 'XY', label: t('calculator.viewXY') },
              { id: 'XZ', label: t('calculator.viewXZ') },
              { id: 'YZ', label: t('calculator.viewYZ') },
              { id: '3D', label: t('calculator.view3D') },
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
              aria-label={t('calculator.expandGrid')}
              title={t('calculator.enlargeGrid')}
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
            <div
              className="canvas-fullscreen"
              role="dialog"
              aria-modal="true"
              aria-label={t('calculator.fullscreenGrid')}
            >
              <button
                type="button"
                className="canvas-close-btn"
                onClick={() => setIsGridFullscreen(false)}
                aria-label={t('calculator.closeFullscreen')}
                title={t('common.close')}
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
        ) : null}
      </div>
      <SiteFooter footer={siteContent.footer} />
      {loginPanelOpen ? (
        <LoginPanel
          fixedRole="customer"
          initialMode={loginInitialMode}
          title={t('login.title')}
          onLogin={handleLogin}
          onClose={() => setLoginPanelOpen(false)}
        />
      ) : null}
    </div>
  )
}
