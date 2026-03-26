let bridgeStarted = false

function trimValue(value) {
  return String(value || '').trim()
}

function parseJSON(value) {
  if (typeof value !== 'string') {
    return value
  }
  const raw = value.trim()
  if (!raw) {
    return value
  }
  try {
    return JSON.parse(raw)
  } catch (_err) {
    return value
  }
}

function normalizeRoute(route) {
  const raw = trimValue(route)
  if (!raw) {
    return ''
  }
  if (/^(https?:)?\/\//i.test(raw)) {
    return raw
  }
  return raw.startsWith('/') ? raw : `/${raw}`
}

function extractEnvelope(rawMessage) {
  const message = parseJSON(rawMessage) || {}
  const payload = parseJSON(message.payload !== undefined ? message.payload : message) || {}
  const details = typeof payload === 'object' && payload !== null ? payload : {}

  const messageId = trimValue(
    message.messageId ||
    message.message_id ||
    details.messageId ||
    details.message_id
  )
  const notificationId = trimValue(
    details.notificationId ||
    details.notification_id ||
    details.id
  )
  const route = normalizeRoute(details.route || details.path || details.url)

  return {
    rawMessage: message,
    payload: details,
    messageId,
    notificationId,
    route,
    title: trimValue(message.title || details.title),
    content: trimValue(message.content || details.content || details.body),
  }
}

function waitForPlusReady() {
  return new Promise((resolve) => {
    if (typeof plus !== 'undefined' && plus.push) {
      resolve()
      return
    }

    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('plusready', () => resolve(), false)
      return
    }

    resolve()
  })
}

function navigateByEnvelope(envelope, resolveClickUrl) {
  let targetUrl = ''
  try {
    targetUrl = normalizeRoute(typeof resolveClickUrl === 'function' ? resolveClickUrl(envelope) : envelope.route)
  } catch (_err) {
    targetUrl = envelope.route
  }

  if (!targetUrl || /^https?:\/\//i.test(targetUrl)) {
    return
  }

  uni.navigateTo({
    url: targetUrl,
    fail() {
      uni.reLaunch({
        url: targetUrl,
      })
    },
  })
}

async function sendAck(ackPushMessage, action, envelope, loggerTag) {
  if (typeof ackPushMessage !== 'function' || !envelope.messageId) {
    return
  }

  try {
    await ackPushMessage({
      messageId: envelope.messageId,
      action,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error(`[${loggerTag}] 推送回执失败:`, err)
  }
}

export async function startPushEventBridge(options = {}) {
  if (bridgeStarted) {
    return
  }

  const loggerTag = trimValue(options.loggerTag) || 'PushBridge'
  await waitForPlusReady()

  if (typeof plus === 'undefined' || !plus.push || typeof plus.push.addEventListener !== 'function') {
    return
  }

  const handleReceive = async (rawMessage) => {
    const envelope = extractEnvelope(rawMessage)
    await sendAck(options.ackPushMessage, 'received', envelope, loggerTag)
    if (typeof options.onReceive === 'function') {
      options.onReceive(envelope)
    }
    uni.$emit('push:received', envelope)
  }

  const handleClick = async (rawMessage) => {
    const envelope = extractEnvelope(rawMessage)
    await sendAck(options.ackPushMessage, 'opened', envelope, loggerTag)
    if (typeof options.onClick === 'function') {
      options.onClick(envelope)
    }
    navigateByEnvelope(envelope, options.resolveClickUrl)
    uni.$emit('push:clicked', envelope)
  }

  plus.push.addEventListener('receive', handleReceive)
  plus.push.addEventListener('click', handleClick)
  bridgeStarted = true
}
