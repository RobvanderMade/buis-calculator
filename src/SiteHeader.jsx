import { useState } from 'react'
import LanguageSwitcher from './components/LanguageSwitcher.jsx'
import { useI18n } from './i18n/I18nContext.jsx'

const logoSrc = `${import.meta.env.BASE_URL}logo_header.png`

function LogoMark() {
  return (
    <img className="site-header__logo-img" src={logoSrc} alt="IAM BendR" decoding="async" />
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
  accountLabel,
  isLoggedIn = false,
  isAdmin = false,
  userLabel = '',
  showBackButton = false,
  onAccountClick,
  onCalculatorClick,
  onBackClick,
  onHomeClick,
  onLogoutClick,
  showCalculatorInMenu = false,
}) {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const resolvedAccountLabel = accountLabel ?? t('header.accountMyBendR')

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
          aria-label={t('header.goHome')}
        >
          <LogoMark />
          <span className="site-header__tagline">{t('header.tagline')}</span>
        </button>
        <div className="site-header__actions">
          <LanguageSwitcher />
          {isLoggedIn && userLabel ? (
            <span className="site-header__user" title={userLabel}>
              {isAdmin ? t('header.adminPrefix') : ''}
              {userLabel}
            </span>
          ) : null}
          {showBackButton ? (
            <button
              type="button"
              className="site-header__login site-header__back"
              onClick={onBackClick ?? onHomeClick}
              aria-label={t('common.back')}
            >
              <span className="site-header__back-short" aria-hidden="true">
                ←
              </span>
              <span className="site-header__back-label">{t('common.back')}</span>
            </button>
          ) : null}
          <div className="site-header__account">
            <button type="button" className="site-header__login" onClick={handleAccountButtonClick}>
              <LoginIcon />
              <span>{resolvedAccountLabel}</span>
            </button>
            {isLoggedIn && menuOpen ? (
              <div className="site-header__menu" onMouseLeave={() => setMenuOpen(false)}>
                {showCalculatorInMenu ? (
                  <button type="button" onClick={handleMenuCalculatorClick}>
                    {t('header.calculator')}
                  </button>
                ) : null}
                <button type="button" onClick={handleMenuAccountClick}>
                  {isAdmin ? 'Backoffice' : t('header.account')}
                </button>
                <button type="button" onClick={handleMenuLogoutClick}>
                  {t('common.logout')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
