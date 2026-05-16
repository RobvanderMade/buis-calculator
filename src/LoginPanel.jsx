import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { formatAuthError } from './authErrors.js'
import { auth } from './firebase'
import {
  emptyCustomerProfile,
  normalizeCustomerProfile,
  saveCustomerProfile,
  validateCustomerProfile,
} from './customerRepository'
import { useI18n } from './i18n/I18nContext.jsx'

export default function LoginPanel({
  fixedRole = 'customer',
  embedded = false,
  initialMode = 'login',
  title,
  onLogin,
  onClose,
}) {
  const { t } = useI18n()
  const isCustomerUi = fixedRole === 'customer'
  const [role, setRole] = useState(fixedRole)
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [profile, setProfile] = useState(emptyCustomerProfile)
  const [message, setMessage] = useState('')

  const panelTitle = title ?? (fixedRole === 'admin' ? t('login.adminTitle') : t('login.title'))

  useEffect(() => {
    if (embedded) return undefined

    const scrollY = window.scrollY
    document.body.classList.add('modal-open')
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'

    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [embedded])

  function selectRole(nextRole) {
    if (fixedRole) return
    setRole(nextRole)
    setMode('login')
    setMessage('')
  }

  function actionLabel() {
    if (mode === 'register') return t('login.actionRegister')
    if (mode === 'reset') return t('login.actionReset')
    return t('login.actionLogin')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (!auth) {
      setMessage(t('login.firebaseNotConfigured'))
      return
    }

    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email)
        setMessage(t('login.resetSent'))
        return
      }

      if (mode === 'register' && role === 'customer') {
        const profileError = validateCustomerProfile(profile, isCustomerUi ? t : undefined)
        if (profileError) {
          setMessage(profileError)
          return
        }
      }

      const result =
        mode === 'register'
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password)
      let customerProfile = null
      if (mode === 'register' && role === 'customer') {
        const normalizedProfile = normalizeCustomerProfile(profile)
        customerProfile = await saveCustomerProfile(result.user.uid, {
          uid: result.user.uid,
          ...normalizedProfile,
          email,
          createdAt: new Date().toISOString(),
        })
      }
      await onLogin({ user: result.user, role, customerProfile })
      setPassword('')
    } catch (error) {
      setMessage(t('login.failed', { action: actionLabel(), error: formatAuthError(error, t) }))
    }
  }

  const loginCard = (
    <div className="login-card">
      <div className="backoffice-header">
        <h2>{panelTitle}</h2>
        {!embedded ? (
          <button type="button" onClick={onClose} aria-label={t('login.close')}>
            X
          </button>
        ) : null}
      </div>

      {!fixedRole ? (
        <div className="login-role-switch row-btns">
          <button
            type="button"
            className={role === 'customer' ? 'view-active' : ''}
            onClick={() => selectRole('customer')}
          >
            {t('login.title')}
          </button>
          <button
            type="button"
            className={role === 'admin' ? 'view-active' : ''}
            onClick={() => selectRole('admin')}
          >
            {t('login.admin')}
          </button>
        </div>
      ) : null}

      {role === 'customer' ? (
        <div className="login-mode-switch row-btns">
          <button
            type="button"
            className={mode === 'login' ? 'view-active' : ''}
            onClick={() => setMode('login')}
          >
            {t('login.loginTab')}
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'view-active' : ''}
            onClick={() => setMode('register')}
          >
            {t('login.registerTab')}
          </button>
          <button
            type="button"
            className={mode === 'reset' ? 'view-active' : ''}
            onClick={() => setMode('reset')}
          >
            {t('login.resetTab')}
          </button>
        </div>
      ) : null}

      <form className="stack" onSubmit={handleSubmit}>
        <label>
          {t('login.emailLabel')}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>
        {mode !== 'reset' ? (
          <label>
            {t('login.passwordLabel')}
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={mode === 'register' ? 6 : undefined}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path
                      d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10 10 0 0112 5c5 0 9 4 10 7-.4 1-1.1 2.2-2.1 3.3M6.1 6.1C4 7.7 2.6 9.8 2 12c1 3 5 7 10 7 1.6 0 3.1-.3 4.4-.9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path
                      d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>
                )}
              </button>
            </span>
          </label>
        ) : null}
        {role === 'customer' && mode === 'register' ? (
          <div className="customer-profile-fields">
            <label>
              {t('login.companyName')} <span className="hint">{t('common.optional')}</span>
              <input
                type="text"
                value={profile.company}
                onChange={(event) => setProfile((prev) => ({ ...prev, company: event.target.value }))}
                autoComplete="organization"
              />
            </label>
            <label>
              {t('common.name')}
              <input
                type="text"
                value={profile.name}
                onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                required
                autoComplete="name"
              />
            </label>
            <label>
              {t('login.street')}
              <input
                type="text"
                value={profile.street}
                onChange={(event) => setProfile((prev) => ({ ...prev, street: event.target.value }))}
                required
                autoComplete="street-address"
              />
            </label>
            <label>
              {t('login.postalCode')}
              <input
                type="text"
                value={profile.postalCode}
                onChange={(event) => setProfile((prev) => ({ ...prev, postalCode: event.target.value }))}
                required
                autoComplete="postal-code"
              />
            </label>
            <label>
              {t('login.city')}
              <input
                type="text"
                value={profile.city}
                onChange={(event) => setProfile((prev) => ({ ...prev, city: event.target.value }))}
                required
                autoComplete="address-level2"
              />
            </label>
            <label>
              {t('login.country')}
              <input
                type="text"
                value={profile.country}
                onChange={(event) => setProfile((prev) => ({ ...prev, country: event.target.value }))}
                required
                autoComplete="country-name"
              />
            </label>
            <label>
              {t('common.phone')}
              <input
                type="tel"
                value={profile.phone}
                onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
                required
                autoComplete="tel"
              />
            </label>
          </div>
        ) : null}
        <button type="submit" className="primary">
          {mode === 'register'
            ? t('login.submitRegister')
            : mode === 'reset'
              ? t('login.submitReset')
              : role === 'admin'
                ? t('login.submitLogin')
                : t('login.submitLogin')}
        </button>
      </form>
      {message ? <p className="status-text">{message}</p> : null}
    </div>
  )

  if (embedded) return loginCard

  return (
    <div className="login-overlay" role="dialog" aria-modal="true" aria-label={t('login.title')}>
      {loginCard}
    </div>
  )
}
