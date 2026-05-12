import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from './firebase'
import { emptyCustomerProfile, saveCustomerProfile } from './customerRepository'

export default function LoginPanel({
  fixedRole = 'customer',
  embedded = false,
  initialMode = 'login',
  title = 'Inloggen',
  onLogin,
  onClose,
}) {
  const [role, setRole] = useState(fixedRole)
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [profile, setProfile] = useState(emptyCustomerProfile)
  const [message, setMessage] = useState('')

  function selectRole(nextRole) {
    if (fixedRole) return
    setRole(nextRole)
    setMode('login')
    setMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (!auth) {
      setMessage('Firebase is nog niet geconfigureerd.')
      return
    }

    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email)
        setMessage('Wachtwoord reset e-mail is verzonden.')
        return
      }

      const result =
        mode === 'register'
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password)
      let customerProfile = null
      if (mode === 'register' && role === 'customer') {
        customerProfile = await saveCustomerProfile(result.user.uid, {
          uid: result.user.uid,
          ...profile,
          email,
          createdAt: new Date().toISOString(),
        })
      }
      await onLogin({ user: result.user, role, customerProfile })
      setPassword('')
    } catch (error) {
      setMessage(`${mode === 'register' ? 'Account aanmaken' : mode === 'reset' ? 'Reset' : 'Inloggen'} mislukt: ${error.message}`)
    }
  }

  const loginCard = (
      <div className="login-card">
        <div className="backoffice-header">
          <h2>{title}</h2>
          {!embedded ? (
            <button type="button" onClick={onClose} aria-label="Login sluiten">
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
            My BendR
          </button>
          <button
            type="button"
            className={role === 'admin' ? 'view-active' : ''}
            onClick={() => selectRole('admin')}
          >
            Admin
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
              Inloggen
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'view-active' : ''}
              onClick={() => setMode('register')}
            >
              Nieuw account
            </button>
            <button
              type="button"
              className={mode === 'reset' ? 'view-active' : ''}
              onClick={() => setMode('reset')}
            >
              Wachtwoord vergeten
            </button>
          </div>
        ) : null}

        <form className="stack" onSubmit={handleSubmit}>
          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {mode !== 'reset' ? (
            <label>
              Wachtwoord
              <span className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
                  title={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
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
                Bedrijfsnaam
                <input
                  type="text"
                  value={profile.company}
                  onChange={(event) => setProfile((prev) => ({ ...prev, company: event.target.value }))}
                />
              </label>
              <label>
                Naam
                <input
                  type="text"
                  value={profile.name}
                  onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                Straat en huisnummer
                <input
                  type="text"
                  value={profile.street}
                  onChange={(event) => setProfile((prev) => ({ ...prev, street: event.target.value }))}
                  required
                />
              </label>
              <label>
                Postcode
                <input
                  type="text"
                  value={profile.postalCode}
                  onChange={(event) => setProfile((prev) => ({ ...prev, postalCode: event.target.value }))}
                  required
                />
              </label>
              <label>
                Plaats
                <input
                  type="text"
                  value={profile.city}
                  onChange={(event) => setProfile((prev) => ({ ...prev, city: event.target.value }))}
                  required
                />
              </label>
              <label>
                Land
                <input
                  type="text"
                  value={profile.country}
                  onChange={(event) => setProfile((prev) => ({ ...prev, country: event.target.value }))}
                  required
                />
              </label>
              <label>
                Telefoon
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
                  required
                />
              </label>
            </div>
          ) : null}
          <button type="submit" className="primary">
            {mode === 'register'
              ? 'Account aanmaken'
              : mode === 'reset'
                ? 'Reset e-mail versturen'
                : role === 'admin'
                  ? 'Inloggen als admin'
                  : 'Inloggen'}
          </button>
        </form>
        {message ? <p className="status-text">{message}</p> : null}
      </div>
  )

  if (embedded) return loginCard

  return (
    <div className="login-overlay" role="dialog" aria-modal="true" aria-label="Inloggen">
      {loginCard}
    </div>
  )
}
