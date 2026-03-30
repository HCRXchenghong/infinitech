import config from '@/shared-ui/config'
import createSocket from '@/utils/socket-io'
import {
  createRTCCall,
  getRTCCall,
  listRTCCallHistory,
  updateRTCCallStatus,
} from '@/shared-ui/api.js'
import {
  canUseRTCContact as canUseSharedRTCContact,
  createRTCContactHelper,
} from '../../shared/mobile-common/rtc-contact.js'

function trimValue(value) {
  return String(value || '').trim()
}

function buildSocketAuthHeader() {
  const token = trimValue(uni.getStorageSync('token'))
  if (!token) return {}
  return {
    Authorization: /^bearer\s+/i.test(token) ? token : `Bearer ${token}`,
  }
}

function resolveCurrentUserId() {
  const profile = uni.getStorageSync('userProfile') || {}
  return trimValue(profile.phone || profile.id || profile.userId)
}

async function ensureSocketToken() {
  const cached = trimValue(uni.getStorageSync('socket_token'))
  if (cached) return cached

  const userId = resolveCurrentUserId()
  if (!userId) {
    throw new Error('missing current user id')
  }

  const res = await new Promise((resolve, reject) => {
    uni.request({
      url: `${config.SOCKET_URL}/api/generate-token`,
      method: 'POST',
      header: Object.assign({ 'Content-Type': 'application/json' }, buildSocketAuthHeader()),
      data: { userId, role: 'user' },
      success: resolve,
      fail: reject,
    })
  })

  const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  const token = trimValue(data && data.token)
  if (!token) {
    throw new Error('failed to generate socket token')
  }
  uni.setStorageSync('socket_token', token)
  return token
}

const rtcHelper = createRTCContactHelper({
  createRTCCall,
  updateRTCCallStatus,
  createSocket,
  getSocketUrl: () => config.SOCKET_URL,
  getSocketToken: ensureSocketToken,
})

export function canUseUserRTCContact() {
  return canUseSharedRTCContact()
}

export async function startUserRTCCall(payload, handlers = {}) {
  return rtcHelper.startCall(
    {
      clientKind: 'uni-app-mobile',
      clientPlatform: trimValue(payload && payload.clientPlatform),
      ...payload,
    },
    handlers
  )
}

export async function connectUserRTCSignalSession(callId, handlers = {}) {
  return rtcHelper.connectSignalSession(callId, handlers)
}

export async function updateUserRTCCall(callId, payload = {}) {
  return rtcHelper.updateStatus(callId, payload)
}

export async function fetchUserRTCCall(callId) {
  return getRTCCall(callId)
}

export async function fetchUserRTCCallHistory(params = {}) {
  return listRTCCallHistory(params)
}
