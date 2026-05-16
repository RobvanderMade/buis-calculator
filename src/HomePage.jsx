import { formatSiteText } from './siteContent'

const logoSrc = `${import.meta.env.BASE_URL}logo_header.png`

function homePhotoSrc(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

export default function HomePage({ content, userName = '', onOpenCalculator }) {
  const home = content?.home ?? {}
  const greeting = userName ? formatSiteText(home.greetingLoggedIn, { name: userName }) : ''

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

  return (
    <div className="home-page">
      <img className="home-page__logo" src={logoSrc} alt="IAM BendR" decoding="async" />

      {greeting ? <p className="home-page__greeting">{greeting}</p> : null}
      <h1 className="home-page__title">{home.welcomeTitle}</h1>
      <p className="home-page__intro">{home.welcomeText}</p>

      <div className="home-page__gallery" aria-label="Impressie">
        {photos.map((photo, index) => (
          <figure key={index} className="home-page__photo">
            <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
          </figure>
        ))}
      </div>

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

