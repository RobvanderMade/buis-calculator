import { useEffect, useState } from 'react'
import LanguageSwitcher from './components/LanguageSwitcher.jsx'
import { useI18n } from './i18n/I18nContext.jsx'

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

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 11v5M12 8h.01"
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
  onHomeClick,
  onLogoutClick,
  showCalculatorInMenu = false,
  infoTitle = '',
  infoIntro = '',
  infoBody = '',
}) {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const resolvedAccountLabel = accountLabel ?? t('header.accountMyBendR')
  const hasInfoContent = Boolean(infoTitle || infoIntro || infoBody)

  useEffect(() => {
    if (!infoOpen) return undefined

    const scrollY = window.scrollY
    document.body.classList.add('modal-open')
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'

    function onKeyDown(event) {
      if (event.key === 'Escape') setInfoOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [infoOpen])

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

  const introParagraphs = String(infoIntro)
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  const bodyParagraphs = String(infoBody)
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean)

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
          {hasInfoContent ? (
            <button
              type="button"
              className="site-header__login site-header__info"
              onClick={() => setInfoOpen(true)}
              aria-label={t('header.info')}
              title={t('header.info')}
            >
              <InfoIcon />
              <span className="site-header__info-label">{t('header.info')}</span>
            </button>
          ) : null}
          {isLoggedIn && userLabel ? (
            <span className="site-header__user" title={userLabel}>
              {isAdmin ? t('header.adminPrefix') : ''}
              {userLabel}
            </span>
          ) : null}
          {showBackButton ? (
            <button type="button" className="site-header__login" onClick={onHomeClick}>
              <span>{t('common.back')}</span>
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
      {infoOpen && hasInfoContent ? (
        <div
          className="login-overlay info-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-info-title"
          onClick={() => setInfoOpen(false)}
        >
          <div className="login-card info-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="info-modal__close canvas-close-btn"
              onClick={() => setInfoOpen(false)}
              aria-label={t('common.close')}
            >
              ×
            </button>
            <h2 id="site-info-title" className="info-modal__title">
              {infoTitle}
            </h2>
            {introParagraphs.length
              ? introParagraphs.map((paragraph, index) => (
                  <p
                    key={`intro-${index}`}
                    className={`info-modal__paragraph${index === 0 ? ' info-modal__intro' : ''}`}
                  >
                    {paragraph}
                  </p>
                ))
              : null}
            {bodyParagraphs.length
              ? bodyParagraphs.map((paragraph, index) => (
                  <p
                    key={`body-${index}`}
                    className={`info-modal__paragraph${index === 0 ? ' info-modal__body' : ''}`}
                  >
                    {paragraph}
                  </p>
                ))
              : null}
          </div>
        </div>
      ) : null}
    </header>
  )
}
