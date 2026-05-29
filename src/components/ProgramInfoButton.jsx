import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'

function InfoIcon() {
  return (
    <svg
      className="program-info-btn__icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
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

export default function ProgramInfoButton({ infoTitle = '', infoIntro = '', infoBody = '' }) {
  const { t } = useI18n()
  const [infoOpen, setInfoOpen] = useState(false)
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

  if (!hasInfoContent) return null

  const introParagraphs = String(infoIntro)
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  const bodyParagraphs = String(infoBody)
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  return (
    <>
      <button
        type="button"
        className="program-info-btn"
        onClick={() => setInfoOpen(true)}
        aria-haspopup="dialog"
      >
        <InfoIcon />
        <span>{t('calculator.programExplanation')}</span>
      </button>
      {infoOpen ? (
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
    </>
  )
}
