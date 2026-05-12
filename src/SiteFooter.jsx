export default function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__col">
          <span className="site-footer__title">BendR — Vandema Products</span>
          <span>Voorbeeldstraat 1</span>
          <span>1234 AB Voorbeeldstad</span>
          <span>Nederland</span>
        </div>
        <div className="site-footer__col">
          <span className="site-footer__title">Contact</span>
          <span>Tel: +31 (0)00 000 00 00</span>
          <span>
            E-mail: <a href="mailto:info@bendr.nl">info@bendr.nl</a>
          </span>
          <span>
            Web: <a href="https://www.bendr.nl">www.bendr.nl</a>
          </span>
        </div>
        <div className="site-footer__col">
          <span className="site-footer__title">Bedrijfsgegevens</span>
          <span>KvK: 00000000</span>
          <span>BTW: NL000000000B01</span>
          <span>IBAN: NL00 BANK 0000 0000 00</span>
        </div>
      </div>
      <div className="site-footer__bottom">
        <span>Alle prijzen zijn exclusief 21% BTW.</span>
        <span>© {year} BendR · Vandema Products</span>
      </div>
    </footer>
  )
}
