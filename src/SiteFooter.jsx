import { DEFAULT_SITE_CONTENT } from './siteContent'

export default function SiteFooter({ footer = DEFAULT_SITE_CONTENT.footer }) {
  const year = new Date().getFullYear()
  const f = footer ?? DEFAULT_SITE_CONTENT.footer
  const email = f.email || ''
  const websiteUrl = f.websiteUrl || ''
  const websiteLabel = f.websiteLabel || websiteUrl

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__col">
          <span className="site-footer__title">{f.companyTitle}</span>
          {f.addressLine1 ? <span>{f.addressLine1}</span> : null}
          {f.addressLine2 ? <span>{f.addressLine2}</span> : null}
          {f.addressLine3 ? <span>{f.addressLine3}</span> : null}
        </div>
        <div className="site-footer__col">
          <span className="site-footer__title">Contact</span>
          {f.phone ? <span>{f.phone}</span> : null}
          {email ? (
            <span>
              E-mail: <a href={`mailto:${email}`}>{email}</a>
            </span>
          ) : null}
          {websiteUrl ? (
            <span>
              Web:{' '}
              <a href={websiteUrl} target="_blank" rel="noreferrer">
                {websiteLabel}
              </a>
            </span>
          ) : null}
        </div>
        <div className="site-footer__col">
          <span className="site-footer__title">Bedrijfsgegevens</span>
          {f.kvk ? <span>{f.kvk}</span> : null}
          {f.btw ? <span>{f.btw}</span> : null}
        </div>
      </div>
      <div className="site-footer__bottom">
        {f.priceNote ? <span>{f.priceNote}</span> : null}
        <span>
          © {year} {f.copyrightLine}
        </span>
      </div>
    </footer>
  )
}
