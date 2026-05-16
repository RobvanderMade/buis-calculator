import { useState } from 'react'

const logoSrc = `${import.meta.env.BASE_URL}logo_header.png`

function LogoMark() {
  return (
    <img
      className="site-header__logo-img"
      src={logoSrc}
      alt="IAM BendR"
      height={84}
      decoding="async"
    />
  )
}

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
  userLabel = '',
  showBackButton = false,
  onAccountClick,
  onCalculatorClick,
  onHomeClick,
  onLogoutClick,
  showCalculatorInMenu = false,
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

  function handleMenuCalculatorClick() {
    setMenuOpen(false)
    onCalculatorClick?.()
  }

  function handleMenuLogoutClick() {
    setMenuOpen(false)
    onLogoutClick()
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <button
          type="button"
          className="site-header__brand site-header__brand-btn"
          onClick={onHomeClick}
          aria-label="Naar startpagina"
        >
          <LogoMark />
          <span className="site-header__tagline">Buis buigen · online calculator</span>
        </button>
        <div className="site-header__actions">
          {isLoggedIn && userLabel ? (
            <span className="site-header__user" title={userLabel}>
              {isAdmin ? 'Admin: ' : ''}
              {userLabel}
            </span>
          ) : null}
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
                {showCalculatorInMenu ? (
                  <button type="button" onClick={handleMenuCalculatorClick}>
                    Calculator
                  </button>
                ) : null}
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
