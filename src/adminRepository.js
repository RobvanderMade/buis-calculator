import { get, ref } from 'firebase/database'
import { database } from './firebase'

const ADMINS_PATH = 'admins'

export async function loadAdminStatus(uid) {
  if (!database) throw new Error('Firebase is nog niet geconfigureerd.')
  try {
    const snapshot = await get(ref(database, `${ADMINS_PATH}/${uid}`))
    if (!snapshot.exists()) return false

    const value = snapshot.val()
    return value === true || value === 'true' || value?.enabled === true || value?.role === 'admin'
  } catch (error) {
    if (error?.code === 'PERMISSION_DENIED' || /permission/i.test(error?.message || '')) {
      return false
    }
    throw error
  }
}
