import config from './config'
import { registerPushDevice, unregisterPushDevice, ackPushMessage } from './api'
import { createPushRegistrationManager } from '../../shared/mobile-common/push-registration'

declare const uni: any

function resolveRiderIdentity() {
  const authMode = String(uni.getStorageSync('authMode') || '').trim()
  if (authMode !== 'rider') {
    return null
  }

  const token = String(uni.getStorageSync('token') || uni.getStorageSync('access_token') || '').trim()
  if (!token) {
    return null
  }

  const profile = uni.getStorageSync('riderProfile') || {}
  const userId = String(
    uni.getStorageSync('riderId') ||
    profile.id ||
    profile.userId ||
    profile.user_id ||
    ''
  ).trim()

  if (!userId) {
    return null
  }

  return {
    userId,
    userType: 'rider',
  }
}

export const {
  registerCurrentPushDevice,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  getCachedRegistrationState,
  ackPushMessage,
} = createPushRegistrationManager({
  storageKey: 'rider_push_registration',
  resolveAuthIdentity: resolveRiderIdentity,
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage,
  getAppEnv: () => (config.isDev ? 'dev' : 'prod'),
})
