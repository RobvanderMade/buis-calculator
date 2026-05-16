import { useEffect, useState } from 'react'
import { formatSiteText } from './siteContent'
import { useI18n } from './i18n/I18nContext.jsx'

const logoSrc = `${import.meta.env.BASE_URL}logo_header.png`

function homePhotoSrc(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const encoded = path
    .replace(/^\//, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${import.meta.env.BASE_URL}${encoded}`
}

export default function HomePage({ content, userName = '', onOpenCalculator }) {
  const { t } = useI18n()
  const home = content?.home ?? {}
  const greeting = userName ? formatSiteText(home.greetingLoggedIn, { name: userName }) : ''
  const [lightbox, setLightbox] = useState(null)

  const photos = [1, 2, 3].map((index) => ({
    src: homePhotoSrc(home[`photo${index}Src`]),
    alt: home[`photo${index}Alt`] || '',
  }))

  const processSteps = [1, 2, 3, 4, 5]
    .map((index) => ({
      label: home[`process${index}Label`],
      text: home[`process${index}Text`],
    }))
    .filter((step) => step.label)

  useEffect(() => {
    if (!lightbox) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') setLightbox(null)
    }

    document.body.classList.add('modal-open')
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [lightbox])

  return (
    <div className="home-page">
      <img className="home-page__logo" src={logoSrc} alt="IAM BendR" decoding="async" />

      {greeting ? <p className="home-page__greeting">{greeting}</p> : null}
      <h1 className="home-page__title">{home.welcomeTitle}</h1>
      <p className="home-page__intro">{home.welcomeText}</p>

      <div className="home-page__gallery" aria-label="Impressie">
        {photos.map((photo, index) => (
          <figure key={index} className="home-page__photo">
            <button
              type="button"
              className="home-page__photo-btn"
              onClick={() => setLightbox(photo)}
              aria-label={
                photo.alt ? `${t('common.enlarge')}: ${photo.alt}` : t('common.enlarge')
              }
            >
              <div className="home-page__photo-frame">
                <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
              </div>
              <span className="home-page__photo-zoom" aria-hidden="true">
                {t('common.enlarge')}
              </span>
            </button>
          </figure>
        ))}
      </div>

      {lightbox ? (
        <div
          className="home-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.alt || t('home.enlargePhoto')}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="home-lightbox__close canvas-close-btn"
            onClick={() => setLightbox(null)}
            aria-label={t('common.close')}
          >
            ×
          </button>
          <figure className="home-lightbox__figure" onClick={(event) => event.stopPropagation()}>
            <img className="home-lightbox__img" src={lightbox.src} alt={lightbox.alt} />
            {lightbox.alt ? <figcaption className="home-lightbox__caption">{lightbox.alt}</figcaption> : null}
          </figure>
        </div>
      ) : null}

      {processSteps.length > 0 ? (
        <section className="home-process-banner" aria-labelledby="home-process-title">
          <div className="home-process-banner__inner">
            <h2 id="home-process-title" className="home-process-banner__title">
              {home.processTitle}
            </h2>
            {home.processIntro ? (
              <p className="home-process-banner__intro">{home.processIntro}</p>
            ) : null}
            <ol className="home-process-banner__steps">
              {processSteps.map((step, index) => (
                <li key={step.label} className="home-process-banner__step">
                  <span className="home-process-banner__num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="home-process-banner__label">{step.label}</span>
                  <span className="home-process-banner__text">{step.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      <div className="home-page__footer">
        <p className="home-page__outro">{home.bottomText}</p>
        <button type="button" className="primary home-page__cta" onClick={onOpenCalculator}>
          {home.ctaTry}
        </button>
      </div>
    </div>
  )
}
