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

function normalizeCallId(value) {
  if (!value) return ''
  if (typeof value === 'object') {
    return trimValue(value.uid || value.callId || value.call_id_raw || value.call_id)
  }
  return trimValue(value)
}

function getCurrentPageInfo() {
  try {
    const pages = getCurrentPages()
    if (!Array.isArray(pages) || pages.length === 0) return null
    return pages[pages.length - 1] || null
  } catch (_err) {
    return null
  }
}

function buildIncomingCallUrl(payload) {
  const call = payload?.call || payload || {}
  const callId = normalizeCallId(call) || trimValue(payload?.callId)
  const callerRole = trimValue(call.callerRole || call.caller_role || payload?.fromRole)
  const callerId = trimValue(call.callerId || call.caller_id || payload?.fromId)
  const orderId = trimValue(call.orderId || call.order_id)
  const conversationId = trimValue(call.conversationId || call.conversation_id)
  const targetName =
    callerRole === 'rider' ? 'Rider' : callerRole === 'merchant' ? 'Merchant' : 'Contact'

  return (
    `/pages/rtc/call/index?mode=incoming` +
    `&callId=${encodeURIComponent(callId)}` +
    `&orderId=${encodeURIComponent(orderId)}` +
    `&conversationId=${encodeURIComponent(conversationId)}` +
    `&targetRole=${encodeURIComponent(callerRole)}` +
    `&targetId=${encodeURIComponent(callerId)}` +
    `&targetName=${encodeURIComponent(targetName)}`
  )
}

let inviteBridgeSocket = null

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
      clientKind: 'uni-user',
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

export async function ensureUserRTCInviteBridge() {
  const token = trimValue(uni.getStorageSync('token'))
  const authMode = trimValue(uni.getStorageSync('authMode'))
  if (!token || authMode !== 'user') {
    disconnectUserRTCInviteBridge()
    return null
  }

  if (inviteBridgeSocket) {
    return inviteBridgeSocket
  }

  const socketToken = await ensureSocketToken()
  const socket = createSocket(config.SOCKET_URL, '/rtc', socketToken).connect()

  socket.on('auth_error', () => {
    disconnectUserRTCInviteBridge()
  })

  socket.on('rtc_invite', (payload = {}) => {
    const callId = normalizeCallId(payload?.call || payload) || trimValue(payload?.callId)
    if (!callId) return

    const currentPage = getCurrentPageInfo()
    const currentRoute = currentPage && currentPage.route ? `/${currentPage.route}` : ''
    const currentCallId = trimValue(currentPage?.options?.callId)
    if (currentRoute === '/pages/rtc/call/index' && currentCallId === callId) {
      return
    }

    uni.navigateTo({
      url: buildIncomingCallUrl(payload),
      fail: () => {},
    })
  })

  inviteBridgeSocket = socket
  return socket
}

export function disconnectUserRTCInviteBridge() {
  if (!inviteBridgeSocket) return
  inviteBridgeSocket.disconnect()
  inviteBridgeSocket = null
}
