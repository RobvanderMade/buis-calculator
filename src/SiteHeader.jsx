/** Eenvoudig buis-icoon als logo (vector, schaalbaar). Vervang door eigen bestand in /public indien gewenst. */
function LogoMark() {
  return (
    <svg
      className="site-header__logo-svg"
      viewBox="0 0 48 48"
      width="44"
      height="44"
      aria-hidden
    >
      <circle cx="24" cy="24" r="22" fill="rgba(255,255,255,0.14)" />
      <path
        d="M10 32 V18 Q10 12 16 12 H30 Q36 12 36 18 V26"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M36 26 L36 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <circle cx="36" cy="36" r="3.5" fill="currentColor" />
    </svg>
  )
}

import { useState } from 'react'

function LoginIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function SiteHeader({
  accountLabel = 'Inloggen',
  isLoggedIn = false,
  isAdmin = false,
  showBackButton = false,
  onAccountClick,
  onHomeClick,
  onLogoutClick,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  function handleAccountButtonClick() {
    if (isLoggedIn) {
      setMenuOpen((open) => !open)
      return
    }
    onAccountClick()
  }

  function handleMenuAccountClick() {
    setMenuOpen(false)
    onAccountClick()
  }

  function handleMenuLogoutClick() {
    setMenuOpen(false)
    onLogoutClick()
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__brand">
          <LogoMark />
          <div className="site-header__titles">
            <span className="site-header__name">BendR</span>
            <span className="site-header__tagline">Buis buigen · online calculator</span>
          </div>
        </div>
        <div className="site-header__actions">
          {showBackButton ? (
            <button type="button" className="site-header__login" onClick={onHomeClick}>
              <span>Terug</span>
            </button>
          ) : null}
          <div className="site-header__account">
            <button type="button" className="site-header__login" onClick={handleAccountButtonClick}>
              <LoginIcon />
              <span>{accountLabel}</span>
            </button>
            {isLoggedIn && menuOpen ? (
              <div className="site-header__menu" onMouseLeave={() => setMenuOpen(false)}>
                <button type="button" onClick={handleMenuAccountClick}>
                  {isAdmin ? 'Backoffice' : 'Account'}
                </button>
                <button type="button" onClick={handleMenuLogoutClick}>
                  Uitloggen
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
