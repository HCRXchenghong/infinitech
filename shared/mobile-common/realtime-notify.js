function trimValue(value) {
  return String(value || '').trim()
}

function readStorage(key) {
  try {
    return uni.getStorageSync(key)
  } catch (_err) {
    return ''
  }
}

function writeStorage(key, value) {
  try {
    uni.setStorageSync(key, value)
  } catch (_err) {
    // ignore storage failure
  }
}

function removeStorage(key) {
  try {
    uni.removeStorageSync(key)
  } catch (_err) {
    // ignore storage failure
  }
}

function normalizeRoute(route) {
  const raw = trimValue(route)
  if (!raw) return ''
  if (/^(https?:)?\/\//i.test(raw)) return raw
  return raw.startsWith('/') ? raw : `/${raw}`
}

function normalizeEnvelope(payload) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const refreshTargets = Array.isArray(source.refreshTargets)
    ? source.refreshTargets.map((item) => trimValue(item).toLowerCase()).filter(Boolean)
    : []
  return {
    eventType: trimValue(source.eventType),
    title: trimValue(source.title),
    content: trimValue(source.content || source.body),
    route: normalizeRoute(source.route || source.path || source.url),
    messageId: trimValue(source.messageId || source.message_id),
    refreshTargets,
    payload: source,
  }
}

function shortenToastText(title, content) {
  const text = trimValue(title) || trimValue(content)
  if (!text) return ''
  return text.length > 24 ? `${text.slice(0, 24)}...` : text
}

export function createRealtimeNotifyBridge(options = {}) {
  const loggerTag = trimValue(options.loggerTag) || 'RealtimeNotify'
  const storageKey = trimValue(options.storageKey) || 'realtime_notify_state'
  const tokenStorageKey = trimValue(options.tokenStorageKey) || 'socket_token'
  const tokenAccountKeyStorageKey = trimValue(options.tokenAccountKeyStorageKey) || 'socket_token_account_key'
  const eventName = trimValue(options.eventName) || 'business_notification'
  const reconnectDelayMs = Number(options.reconnectDelayMs || 3000)
  const seenMessageTTL = Number(options.seenMessageTTL || 120000)

  let socket = null
  let isConnected = false
  let isConnecting = false
  let reconnectTimer = null
  const seenMessages = new Map()

  function clearSeenMessages() {
    const cutoff = Date.now() - seenMessageTTL
    for (const [messageId, timestamp] of seenMessages.entries()) {
      if (timestamp < cutoff) {
        seenMessages.delete(messageId)
      }
    }
  }

  function rememberMessage(messageId) {
    if (!messageId) return false
    clearSeenMessages()
    if (seenMessages.has(messageId)) {
      return true
    }
    seenMessages.set(messageId, Date.now())
    return false
  }

  function resolveIdentityAccountKey(identity) {
    if (typeof options.resolveTokenAccountKey === 'function') {
      return trimValue(options.resolveTokenAccountKey(identity))
    }
    const role = trimValue(identity && identity.role)
    const userId = trimValue(identity && identity.userId)
    if (!role || !userId) return ''
    return `${role}:${userId}`
  }

  function clearTokenCache() {
    removeStorage(tokenStorageKey)
    removeStorage(tokenAccountKeyStorageKey)
  }

  async function fetchSocketToken(identity, forceRefresh = false) {
    const accountKey = resolveIdentityAccountKey(identity)
    if (!accountKey) {
      throw new Error('missing realtime socket account key')
    }

    if (!forceRefresh) {
      const cached = trimValue(readStorage(tokenStorageKey))
      const cachedAccountKey = trimValue(readStorage(tokenAccountKeyStorageKey))
      if (cached && cachedAccountKey === accountKey) {
        return cached
      }
      if (cached || cachedAccountKey) {
        clearTokenCache()
      }
    }

    const socketUrl = trimValue(typeof options.getSocketURL === 'function' ? options.getSocketURL() : '')
    if (!socketUrl) {
      throw new Error('socket url is not configured')
    }
    const authToken = trimValue(identity && identity.authToken)
    if (!authToken) {
      throw new Error('missing auth token for realtime socket')
    }

    const response = await new Promise((resolve, reject) => {
      uni.request({
        url: `${socketUrl}/api/generate-token`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          Authorization: /^Bearer\s+/i.test(authToken) ? authToken : `Bearer ${authToken}`,
        },
        data: {
          userId: trimValue(identity.userId),
          role: trimValue(identity.role),
        },
        success: resolve,
        fail: reject,
      })
    })

    let data = response && response.data
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch (_err) {
        // ignore invalid json fallback
      }
    }
    const token = trimValue(data && data.token)
    if (!token) {
      throw new Error('missing socket token from response')
    }
    writeStorage(tokenStorageKey, token)
    writeStorage(tokenAccountKeyStorageKey, accountKey)
    return token
  }

  function emitEnvelope(envelope) {
    uni.$emit('realtime:notification', envelope)
    if (envelope.eventType) {
      uni.$emit(`realtime:event:${envelope.eventType}`, envelope)
    }
    for (const target of envelope.refreshTargets || []) {
      uni.$emit(`realtime:refresh:${target}`, envelope)
    }
    if (typeof options.onReceive === 'function') {
      options.onReceive(envelope)
    }
    const toastText = shortenToastText(envelope.title, envelope.content)
    if (toastText) {
      uni.showToast({ title: toastText, icon: 'none' })
    }
  }

  function handleEvent(payload) {
    const envelope = normalizeEnvelope(payload)
    if (rememberMessage(envelope.messageId)) {
      return
    }
    emitEnvelope(envelope)
  }

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function disconnectRealtimeChannel() {
    clearReconnectTimer()
    if (socket) {
      try {
        socket.disconnect()
      } catch (_err) {
        // ignore disconnect failure
      }
      socket = null
    }
    isConnected = false
    isConnecting = false
    uni.$emit('realtime:disconnected', { namespace: 'notify' })
  }

  function clearRealtimeState() {
    disconnectRealtimeChannel()
    clearTokenCache()
    removeStorage(storageKey)
  }

  function scheduleReconnect(forceTokenRefresh = false) {
    clearReconnectTimer()
    reconnectTimer = setTimeout(() => {
      void connectCurrentRealtimeChannel({ forceTokenRefresh })
    }, reconnectDelayMs)
  }

  async function connectCurrentRealtimeChannel({ forceTokenRefresh = false } = {}) {
    if (socket && isConnected && !forceTokenRefresh) {
      return
    }
    if (isConnecting) return
    const identity = typeof options.resolveAuthIdentity === 'function'
      ? options.resolveAuthIdentity()
      : null
    if (!identity || !trimValue(identity.userId) || !trimValue(identity.role) || !trimValue(identity.authToken)) {
      clearRealtimeState()
      return
    }

    const socketUrl = trimValue(typeof options.getSocketURL === 'function' ? options.getSocketURL() : '')
    if (!socketUrl) return

    isConnecting = true
    try {
      const token = await fetchSocketToken(identity, forceTokenRefresh)
      if (socket) {
        try {
          socket.disconnect()
        } catch (_err) {
          // ignore stale socket cleanup errors
        }
        socket = null
      }

      socket = options.createSocket(socketUrl, '/notify', token).connect()
      socket.on('connect', () => {
        isConnected = true
        isConnecting = false
        clearReconnectTimer()
        writeStorage(storageKey, JSON.stringify({
          userId: trimValue(identity.userId),
          role: trimValue(identity.role),
          connectedAt: Date.now(),
        }))
        uni.$emit('realtime:connected', { namespace: 'notify' })
      })

      socket.on(eventName, handleEvent)
      socket.on('disconnect', () => {
        isConnected = false
        isConnecting = false
        uni.$emit('realtime:disconnected', { namespace: 'notify' })
        scheduleReconnect(false)
      })

      socket.on('connect_error', (err) => {
        console.error(`[${loggerTag}] realtime connect error:`, err)
        isConnected = false
        isConnecting = false
        scheduleReconnect(false)
      })

      socket.on('auth_error', (err) => {
        console.error(`[${loggerTag}] realtime auth error:`, err)
        isConnected = false
        isConnecting = false
        clearTokenCache()
        scheduleReconnect(true)
      })
    } catch (err) {
      console.error(`[${loggerTag}] realtime connect failed:`, err)
      isConnected = false
      isConnecting = false
      scheduleReconnect(forceTokenRefresh)
    }
  }

  return {
    connectCurrentRealtimeChannel,
    disconnectRealtimeChannel,
    clearRealtimeState,
  }
}
