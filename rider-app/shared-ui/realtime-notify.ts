import config from './config'
import createSocket from '../utils/socket-io'
import { createRealtimeNotifyBridge } from '../../shared/mobile-common/realtime-notify'

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
    role: 'rider',
    authToken: token,
  }
}

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createRealtimeNotifyBridge({
  loggerTag: 'RiderRealtimeNotify',
  storageKey: 'rider_realtime_notify_state',
  resolveAuthIdentity: resolveRiderIdentity,
  getSocketURL: () => config.SOCKET_URL,
  createSocket,
})
