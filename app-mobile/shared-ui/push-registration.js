import config from './config'
import { registerPushDevice, unregisterPushDevice, ackPushMessage as ackPushMessageApi } from './api'
import { createPushRegistrationManager } from '../../shared/mobile-common/push-registration'

function resolveUserIdentity() {
  const authMode = String(uni.getStorageSync('authMode') || '').trim()
  if (authMode && authMode !== 'user') {
    return null
  }

  const token = String(uni.getStorageSync('token') || '').trim()
  if (!token) {
    return null
  }

  const profile = uni.getStorageSync('userProfile') || {}
  const userId = String(
    profile.id ||
    profile.userId ||
    profile.user_id ||
    uni.getStorageSync('userId') ||
    uni.getStorageSync('user_id') ||
    profile.phone ||
    ''
  ).trim()

  if (!userId) {
    return null
  }

  return {
    userId,
    userType: 'customer',
  }
}

export const {
  registerCurrentPushDevice,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  getCachedRegistrationState,
  ackPushMessage,
} = createPushRegistrationManager({
  storageKey: 'app_mobile_push_registration',
  resolveAuthIdentity: resolveUserIdentity,
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
  getAppEnv: () => (config.isDev ? 'dev' : 'prod'),
})
