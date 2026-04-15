import config from './config'
import {
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage as ackPushMessageApi,
} from './api'
import { createPushRegistrationManager } from '../../shared/mobile-common/push-registration'

declare const uni: any

function resolveMerchantIdentity() {
  const authMode = String(uni.getStorageSync('authMode') || '').trim()
  if (authMode !== 'merchant') {
    return null
  }

  const token = String(uni.getStorageSync('token') || '').trim()
  if (!token) {
    return null
  }

  const profile = uni.getStorageSync('merchantProfile') || {}
  const userId = String(
    profile.id ||
    profile.role_id ||
    profile.userId ||
    profile.user_id ||
    uni.getStorageSync('merchantId') ||
    uni.getStorageSync('merchant_id') ||
    ''
  ).trim()

  if (!userId) {
    return null
  }

  return {
    userId,
    userType: 'merchant',
  }
}

export const {
  registerCurrentPushDevice,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  getCachedRegistrationState,
  ackPushMessage,
} = createPushRegistrationManager({
  storageKey: 'merchant_push_registration',
  resolveAuthIdentity: resolveMerchantIdentity,
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage: ackPushMessageApi,
  getAppEnv: () => (config.isDev ? 'dev' : 'prod'),
})
