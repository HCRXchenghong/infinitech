import config from './config'
import createSocket from '../utils/socket-io.js'
import { createRealtimeNotifyBridge } from '../../shared/mobile-common/realtime-notify'

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
    role: 'user',
    authToken: token,
  }
}

export const {
  connectCurrentRealtimeChannel,
  disconnectRealtimeChannel,
  clearRealtimeState,
} = createRealtimeNotifyBridge({
  loggerTag: 'UserRealtimeNotify',
  storageKey: 'user_realtime_notify_state',
  resolveAuthIdentity: resolveUserIdentity,
  getSocketURL: () => config.SOCKET_URL,
  createSocket,
})
