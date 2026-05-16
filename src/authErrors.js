/** Nederlandse uitleg bij Firebase Auth-foutcodes. */
export function formatAuthError(error) {
  const code = error?.code || ''

  switch (code) {
    case 'auth/network-request-failed':
      return (
        'Geen verbinding met Firebase Auth. Controleer je internet en firewall/adblocker. ' +
        'In Firebase Console → Authentication → Settings → Authorized domains: voeg localhost toe. ' +
        'Bij een beperkte Google API-sleutel: sta http://localhost:* toe.'
      )
    case 'auth/invalid-email':
      return 'Ongeldig e-mailadres.'
    case 'auth/user-disabled':
      return 'Dit account is geblokkeerd.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Onjuist e-mailadres of wachtwoord.'
    case 'auth/email-already-in-use':
      return 'Dit e-mailadres is al in gebruik.'
    case 'auth/weak-password':
      return 'Wachtwoord is te zwak (minimaal 6 tekens).'
    case 'auth/too-many-requests':
      return 'Te veel pogingen. Wacht even en probeer opnieuw.'
    case 'auth/operation-not-allowed':
      return 'Deze inlogmethode is niet ingeschakeld in Firebase.'
    default:
      return error?.message || 'Onbekende fout.'
  }
}
