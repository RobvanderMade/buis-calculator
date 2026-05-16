import { loadAdminStatus } from './adminRepository.js'
import { loadCustomerProfile } from './customerRepository.js'

/** Bouwt app-sessie op basis van Firebase Auth-gebruiker (blijft ingelogd tot uitloggen). */
export async function buildSessionForUser(user, initialCustomerProfile = null) {
  if (!user) return null

  const hasAdminRights = await loadAdminStatus(user.uid)
  const role = hasAdminRights ? 'admin' : 'customer'

  let customerProfile = initialCustomerProfile ?? null
  if (role === 'customer' && !customerProfile) {
    try {
      customerProfile = await loadCustomerProfile(user.uid)
    } catch {
      customerProfile = null
    }
  }

  return { user, role, customerProfile }
}
