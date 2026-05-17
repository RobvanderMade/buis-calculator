/** Vervangt {naam} placeholders in beheerde teksten. */
export function formatSiteText(template, vars = {}) {
  if (!template) return ''
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key]
    return value == null ? '' : String(value)
  })
}

/** Standaardteksten Nederlands — uitgangspunt voor siteContent/nl in Firebase. */
export const DEFAULT_SITE_CONTENT = {
  home: {
    greetingLoggedIn: 'Welkom terug, {name}',
    welcomeTitle: 'Welkom bij BendR',
    welcomeText:
      'De online buisbuigen-calculator voor stalen buis. Snelle berekeningen, visuele controle en eenvoudig aanvragen bij onze engineers.',
    photo1Src: 'home/buigen-1.png',
    photo1Alt: 'Buis buigen in de werkplaats',
    photo2Src: 'home/buigen-2.png',
    photo2Alt: 'Gebogen buis met vakmanschap',
    photo3Src: 'home/buigen-3.png',
    photo3Alt: 'Professioneel buigen van metalen buizen',
    processTitle: 'Het proces',
    processIntro: 'Van eerste berekening tot gebogen buis — zo werkt het bij BendR.',
    process1Label: 'Berekenen',
    process1Text: 'Kies materiaal, vul X/Y/Z in en controleer in 2D en 3D.',
    process2Label: 'Aanvraag',
    process2Text: 'Verstuur je berekening via My BendR naar onze engineers.',
    process3Label: 'In behandeling',
    process3Text: 'Wij controleren je order en sturen een orderbevestiging.',
    process4Label: 'In productie',
    process4Text: 'Je buis wordt gebogen volgens de goedgekeurde specificatie.',
    process5Label: 'Gereed',
    process5Text:
      'Je ontvangt bericht zodra je order klaar is voor afhalen of levering.',
    bottomText: 'Probeer de calculator vrijblijvend.',
    ctaTry: 'Probeer',
  },
  welcome: {
    title: 'Welkom bij de BendR buis-calculator',
    body:
      'Kies je materiaal en vul de regels in met de gewenste afmetingen (X, Y en Z in mm). De tekening en gestrekte lengte worden direct berekend.',
  },
  calculator: {
    greeting: 'Hoi {name},',
    requestLoaded:
      'Aanvraag geladen in de calculator. Je kunt de gegevens aanpassen en opnieuw versturen.',
    requestOpened:
      'Order {requestNumber} — alleen bekijken. De gegevens kunnen niet meer worden gewijzigd.',
    newCalculation: 'Nieuwe berekening',
    loginRequired:
      'Maak eerst een My BendR-account aan of log in om een aanvraag te versturen.',
    profileRequired:
      'Vul eerst je accountgegevens aan voordat je een aanvraag verstuurt.',
    requestSuccessWithNumber:
      'Aanvraag {requestNumber} is aangemaakt, bedankt. Na controle door onze engineer sturen wij je een orderbevestiging.',
    requestSuccess:
      'Aanvraag aangemaakt, bedankt. Na controle door onze engineer sturen wij je een orderbevestiging.',
    requestSaveFailed: 'Aanvraag opslaan mislukt: {error}',
    hintCustomer: 'Klaar met invoeren? Verstuur je aanvraag hieronder.',
    hintGuest:
      'Inloggen met een My BendR-account is verplicht om een aanvraag te versturen.',
    submitButtonCustomer: 'Aanvraag aanmaken',
    submitButtonGuest: 'Inloggen om aanvraag te versturen',
  },
  footer: {
    companyTitle: 'BendR — Vandema Products',
    addressLine1: 'Grote Waard 27-B',
    addressLine2: '2675 BX  Honselersdijk',
    addressLine3: 'Nederland',
    phone: 'Tel: 0174 670 730',
    email: 'info@vandemaproducts.nl',
    websiteUrl: 'https://www.vandemaproducts.nl',
    websiteLabel: 'www.bendrtube.nl',
    kvk: 'KvK: 27237945',
    btw: 'BTW: NL808084926B01',
    priceNote: 'Alle prijzen zijn exclusief 21% BTW.',
    copyrightLine: 'BendR · Vandema Products',
  },
}
