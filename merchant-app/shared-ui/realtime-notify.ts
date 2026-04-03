import config from './config'
import createSocket from '../utils/socket-io'
import { createRealtimeNotifyBridge } from '../../shared/mobile-common/realtime-notify'

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
    role: 'merchant',
    authToken: token,
  }
}

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createRealtimeNotifyBridge({
  loggerTag: 'MerchantRealtimeNotify',
  storageKey: 'merchant_realtime_notify_state',
  resolveAuthIdentity: resolveMerchantIdentity,
  getSocketURL: () => config.SOCKET_URL,
  createSocket,
})
