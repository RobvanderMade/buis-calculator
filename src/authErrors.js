const AUTH_CODE_KEYS = {
  'auth/network-request-failed': 'auth.network',
  'auth/invalid-email': 'auth.invalidEmail',
  'auth/user-disabled': 'auth.userDisabled',
  'auth/user-not-found': 'auth.wrongCredentials',
  'auth/wrong-password': 'auth.wrongCredentials',
  'auth/invalid-credential': 'auth.wrongCredentials',
  'auth/invalid-login-credentials': 'auth.wrongCredentials',
  'auth/email-already-in-use': 'auth.emailInUse',
  'auth/weak-password': 'auth.weakPassword',
  'auth/too-many-requests': 'auth.tooManyRequests',
  'auth/operation-not-allowed': 'auth.operationNotAllowed',
}

/** Firebase Auth error message (optional translator t from useI18n). */
export function formatAuthError(error, t) {
  const code = error?.code || ''
  const key = AUTH_CODE_KEYS[code]
  if (key && t) return t(key)
  if (key && !t) {
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
        break
    }
  }
  return error?.message || (t ? t('auth.unknown') : 'Onbekende fout.')
}
