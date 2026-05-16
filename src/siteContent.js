/** Vervangt {naam} placeholders in beheerde teksten. */
export function formatSiteText(template, vars = {}) {
  if (!template) return ''
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key]
    return value == null ? '' : String(value)
  })
}

/** Standaardteksten voor openingspagina, calculator-welkom en site-footer */
export const DEFAULT_SITE_CONTENT = {
  home: {
    greetingLoggedIn: 'Welkom terug, {name}',
    welcomeTitle: 'Welkom bij BendR',
    welcomeText:
      'De online buisbuigen-calculator voor snelle berekeningen, visuele controle en eenvoudig aanvragen bij onze engineers.',
    photo1Src: 'home/photo1.svg',
    photo1Alt: 'Buis berekenen met afmetingen',
    photo2Src: 'home/photo2.svg',
    photo2Alt: '2D- en 3D-weergave van je buis',
    photo3Src: 'home/photo3.svg',
    photo3Alt: 'Aanvraag versturen via My BendR',
    processTitle: 'Het proces',
    processIntro: 'Van eerste berekening tot gebogen buis — zo werkt het bij BendR.',
    process1Label: 'Berekenen',
    process1Text: 'Kies materiaal, vul X/Y/Z in en controleer in 2D en 3D.',
    process2Label: 'Aanvraag',
    process2Text: 'Verstuur je berekening met My BendR naar onze engineers.',
    process3Label: 'In behandeling',
    process3Text: 'Wij controleren je order en sturen een orderbevestiging.',
    process4Label: 'In productie',
    process4Text: 'Je buis wordt gebogen volgens de goedgekeurde specificaties.',
    process5Label: 'Gereed',
    process5Text: 'Je ontvangt bericht zodra je order klaar is voor afhalen of levering.',
    bottomText:
      'Probeer de calculator vrijblijvend.',
    ctaTry: 'Probeer',
  },
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
