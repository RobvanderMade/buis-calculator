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

      <div className="home-page__footer">
        <p className="home-page__outro">{home.bottomText}</p>
        <button type="button" className="primary home-page__cta" onClick={onOpenCalculator}>
          {home.ctaTry}
        </button>
      </div>
    </div>
  )
}
