import config from '@/shared-ui/config'
import createSocket from '@/utils/socket-io'
import {
  createRTCCall,
  getRTCCall,
  listRTCCallHistory,
  readAuthorizationHeader,
  updateRTCCallStatus,
} from '@/shared-ui/api.js'
import { createUniRTCContactBridge } from '../../packages/client-sdk/src/rtc-contact.js'
import { getCachedRTCRuntimeSettings, loadRTCRuntimeSettings } from './rtc-runtime.js'

function trimValue(value) {
  return String(value || '').trim()
}

function resolveCurrentUserId() {
  const profile = uni.getStorageSync('userProfile') || {}
  return trimValue(profile.phone || profile.id || profile.userId)
}

const {
  canUseCurrentRTCContact,
  startRTCCall,
  connectRTCSignalSession,
  updateRTCCall,
  fetchRTCCall,
  fetchRTCCallHistory,
  ensureRTCInviteBridge,
  disconnectRTCInviteBridge,
} = createUniRTCContactBridge({
  uniApp: uni,
  role: 'user',
  authMode: 'user',
  clientKind: 'uni-user',
  resolveCurrentUserId,
  readAuthorizationHeader,
  createRTCCall,
  getRTCCall,
  listRTCCallHistory,
  updateRTCCallStatus,
  createSocket,
  getSocketUrl: () => config.SOCKET_URL,
  getCachedRTCRuntimeSettings,
  loadRTCRuntimeSettings,
})

export const canUseUserRTCContact = canUseCurrentRTCContact
export { getCachedRTCRuntimeSettings, loadRTCRuntimeSettings }
export const startUserRTCCall = startRTCCall
export const connectUserRTCSignalSession = connectRTCSignalSession
export const updateUserRTCCall = updateRTCCall
export const fetchUserRTCCall = fetchRTCCall
export const fetchUserRTCCallHistory = fetchRTCCallHistory
export const ensureUserRTCInviteBridge = ensureRTCInviteBridge
export const disconnectUserRTCInviteBridge = disconnectRTCInviteBridge
