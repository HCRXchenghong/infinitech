function trimValue(value) {
  return String(value || '').trim()
}

function normalizeParticipantRole(raw) {
  switch (trimValue(raw).toLowerCase()) {
    case 'shop':
    case 'merchant':
      return 'merchant'
    case 'customer':
    case 'user':
      return 'user'
    case 'rider':
      return 'rider'
    case 'support':
    case 'admin':
      return 'admin'
    default:
      return ''
  }
}

function resolveCurrentPlatform() {
  try {
    const info = uni.getSystemInfoSync() || {}
    return trimValue(info.uniPlatform || info.platform || '')
  } catch (_err) {
    return ''
  }
}

export function canUseRTCContact(options = {}) {
  const platform = trimValue(options.platform || resolveCurrentPlatform()).toLowerCase()
  if (!platform) return false
  if (platform === 'app-plus' || platform === 'h5' || platform === 'web') {
    return true
  }
  return !platform.startsWith('mp-')
}

function normalizeCallId(value) {
  if (!value) return ''
  if (typeof value === 'string' || typeof value === 'number') {
    return trimValue(value)
  }
  if (typeof value === 'object') {
    return trimValue(value.uid || value.callId || value.call_id_raw || value.call_id)
  }
  return ''
}

function normalizeCallPayload(payload = {}) {
  return {
    callId: normalizeCallId(payload.callId),
    calleeRole: normalizeParticipantRole(payload.calleeRole || payload.targetRole),
    calleeId: trimValue(payload.calleeId || payload.targetId),
    calleePhone: trimValue(payload.calleePhone || payload.targetPhone),
    conversationId: trimValue(payload.conversationId),
    orderId: trimValue(payload.orderId),
    entryPoint: trimValue(payload.entryPoint),
    scene: trimValue(payload.scene),
    clientPlatform: trimValue(payload.clientPlatform || resolveCurrentPlatform()),
    clientKind: trimValue(payload.clientKind || 'uni-app'),
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : undefined,
  }
}

function createNoopSession(callId) {
  return {
    callId,
    connected: false,
    emit() {},
    join() {},
    accept() {},
    reject() {},
    cancel() {},
    end() {},
    signal() {},
    disconnect() {},
  }
}

export function createRTCContactHelper(options = {}) {
  const createRTCCall =
    typeof options.createRTCCall === 'function' ? options.createRTCCall : null
  const updateRTCCallStatus =
    typeof options.updateRTCCallStatus === 'function' ? options.updateRTCCallStatus : null
  const createSocket =
    typeof options.createSocket === 'function' ? options.createSocket : null
  const getSocketToken =
    typeof options.getSocketToken === 'function' ? options.getSocketToken : null

  async function connectSignalSession(callId, handlers = {}) {
    const socketUrl = trimValue(
      typeof options.getSocketUrl === 'function' ? options.getSocketUrl() : options.socketUrl
    )
    if (!createSocket || !socketUrl || !getSocketToken) {
      return createNoopSession(callId)
    }

    const token = trimValue(await getSocketToken())
    if (!token) {
      throw new Error('socket token is required for rtc signaling')
    }

    const socket = createSocket(socketUrl, '/rtc', token).connect()
    const eventNames = [
      'connect',
      'disconnect',
      'connect_error',
      'auth_error',
      'rtc_ready',
      'rtc_error',
      'rtc_call_created',
      'rtc_invite',
      'rtc_status',
      'rtc_signal',
      'rtc_joined',
      'rtc_left',
    ]

    eventNames.forEach((eventName) => {
      if (typeof handlers[eventName] === 'function') {
        socket.on(eventName, handlers[eventName])
      }
    })

    const normalizedCallId = normalizeCallId(callId)

    return {
      callId: normalizedCallId,
      connected: true,
      emit(eventName, payload = {}) {
        socket.emit(eventName, payload)
      },
      join() {
        socket.emit('rtc_join_call', { callId: normalizedCallId })
      },
      accept(extra = {}) {
        socket.emit('rtc_accept_call', { callId: normalizedCallId, ...extra })
      },
      reject(extra = {}) {
        socket.emit('rtc_reject_call', { callId: normalizedCallId, ...extra })
      },
      cancel(extra = {}) {
        socket.emit('rtc_cancel_call', { callId: normalizedCallId, ...extra })
      },
      timeout(extra = {}) {
        socket.emit('rtc_timeout_call', { callId: normalizedCallId, ...extra })
      },
      end(extra = {}) {
        socket.emit('rtc_end_call', { callId: normalizedCallId, ...extra })
      },
      signal(signalType, signal, extra = {}) {
        socket.emit('rtc_signal', {
          callId: normalizedCallId,
          signalType,
          signal,
          ...extra,
        })
      },
      disconnect() {
        socket.disconnect()
      },
    }
  }

  async function startCall(payload = {}, handlers = {}) {
    if (!createRTCCall) {
      throw new Error('createRTCCall is required')
    }
    if (!canUseRTCContact(payload)) {
      throw new Error('rtc_not_supported_on_current_platform')
    }

    const normalizedPayload = normalizeCallPayload(payload)
    if (!normalizedPayload.calleeRole || !normalizedPayload.calleeId) {
      throw new Error('calleeRole and calleeId are required')
    }

    const callRecord = await createRTCCall(normalizedPayload)
    const callId = normalizeCallId(callRecord)
    if (!callId) {
      throw new Error('rtc_call_id_missing')
    }

    const session = await connectSignalSession(callId, handlers)
    if (session.connected) {
      session.emit('rtc_start_call', {
        ...normalizedPayload,
        callId,
      })
    }

    return {
      call: callRecord,
      callId,
      session,
    }
  }

  async function updateStatus(callId, payload = {}) {
    if (!updateRTCCallStatus) {
      throw new Error('updateRTCCallStatus is required')
    }
    const normalizedCallId = normalizeCallId(callId)
    if (!normalizedCallId) {
      throw new Error('callId is required')
    }
    return updateRTCCallStatus(normalizedCallId, payload)
  }

  return {
    canUseRTCContact,
    connectSignalSession,
    startCall,
    updateStatus,
  }
}
