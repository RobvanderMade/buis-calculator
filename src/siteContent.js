/** Vervangt {naam} placeholders in beheerde teksten. */
export function formatSiteText(template, vars = {}) {
  if (!template) return ''
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key]
    return value == null ? '' : String(value)
  })
}

/** Standaardteksten voor calculator-welkom en site-footer */
export const DEFAULT_SITE_CONTENT = {
  welcome: {
    title: 'Welkom bij de BendR buis-calculator',
    body:
      'kies je materiaal en vul de regels in met de gewenste afmetingen (X, Y en Z in mm). De tekening en gestrekte lengte worden direct berekend.',
  },
  calculator: {
    greeting: 'Hoi {name},',
    requestLoaded:
      'Aanvraag geladen in de calculator. Je kunt gegevens aanpassen en opnieuw versturen.',
    requestOpened:
      'Order {requestNumber} — alleen bekijken. De gegevens kunnen niet meer worden gewijzigd.',
    newCalculation: 'Nieuwe berekening',
    loginRequired:
      'Maak eerst een My BendR account aan of log in om een aanvraag te versturen.',
    profileRequired:
      'Vul eerst je accountgegevens aan voordat je een aanvraag verstuurt.',
    requestSuccessWithNumber:
      'Aanvraag {requestNumber} is aangemaakt, bedankt. Na controle door onze engineer sturen wij je een orderbevestiging.',
    requestSuccess:
      'Aanvraag aangemaakt, bedankt. Na controle door onze engineer sturen wij je een orderbevestiging.',
    requestSaveFailed: 'Aanvraag opslaan mislukt: {error}',
    hintCustomer: 'Klaar met invoeren? Verstuur je aanvraag hieronder.',
    hintGuest:
      'Inloggen met een My BendR account is verplicht om een aanvraag te versturen.',
    submitButtonCustomer: 'Aanvraag aanmaken',
    submitButtonGuest: 'Inloggen om aanvraag te versturen',
  },
  footer: {
    companyTitle: 'BendR — Vandema Products',
    addressLine1: 'Voorbeeldstraat 1',
    addressLine2: '1234 AB Voorbeeldstad',
    addressLine3: 'Nederland',
    phone: 'Tel: +31 (0)00 000 00 00',
    email: 'info@bendr.nl',
    websiteUrl: 'https://www.bendr.nl',
    websiteLabel: 'www.bendr.nl',
    kvk: 'KvK: 00000000',
    btw: 'BTW: NL000000000B01',
    priceNote: 'Alle prijzen zijn exclusief 21% BTW.',
    copyrightLine: 'BendR · Vandema Products',
  },
}
