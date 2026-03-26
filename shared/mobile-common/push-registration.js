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
    // ignore storage failures
  }
}

function removeStorage(key) {
  try {
    uni.removeStorageSync(key)
  } catch (_err) {
    // ignore storage failures
  }
}

function trimValue(value) {
  return String(value || '').trim()
}

function resolveTimezone() {
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (timezone) {
        return timezone
      }
    }
  } catch (_err) {
    // ignore timezone detection failure
  }

  const minutes = -new Date().getTimezoneOffset()
  const sign = minutes >= 0 ? '+' : '-'
  const hours = String(Math.floor(Math.abs(minutes) / 60)).padStart(2, '0')
  const remainder = String(Math.abs(minutes) % 60).padStart(2, '0')
  return `UTC${sign}${hours}:${remainder}`
}

function getSystemInfo() {
  try {
    return uni.getSystemInfoSync() || {}
  } catch (_err) {
    return {}
  }
}

function getPushClientInfo() {
  try {
    if (typeof plus === 'undefined' || !plus.push || typeof plus.push.getClientInfo !== 'function') {
      return null
    }
    return plus.push.getClientInfo() || {}
  } catch (_err) {
    return null
  }
}

function resolveDeviceToken(pushInfo) {
  if (!pushInfo || typeof pushInfo !== 'object') {
    return ''
  }
  const candidates = [
    pushInfo.clientid,
    pushInfo.clientId,
    pushInfo.token,
    pushInfo.deviceToken,
  ]
  for (const candidate of candidates) {
    const token = trimValue(candidate)
    if (token) {
      return token
    }
  }
  return ''
}

function readState(storageKey) {
  const raw = readStorage(storageKey)
  if (!raw) {
    return null
  }
  try {
    if (typeof raw === 'string') {
      return JSON.parse(raw)
    }
    return raw
  } catch (_err) {
    return null
  }
}

function buildFingerprint(payload) {
  return [
    trimValue(payload.userId),
    trimValue(payload.userType),
    trimValue(payload.deviceToken),
    trimValue(payload.appVersion),
    trimValue(payload.locale),
    trimValue(payload.timezone),
    trimValue(payload.appEnv),
  ].join('|')
}

export function createPushRegistrationManager(options = {}) {
  const storageKey = trimValue(options.storageKey) || 'push_registration'
  const minRegisterIntervalMs = Number(options.minRegisterIntervalMs || 10 * 60 * 1000)

  const clearPushRegistrationState = () => {
    removeStorage(storageKey)
  }

  const getCachedRegistrationState = () => readState(storageKey)

  const resolveRegistrationPayload = () => {
    const identity = typeof options.resolveAuthIdentity === 'function'
      ? options.resolveAuthIdentity()
      : null
    if (!identity || !trimValue(identity.userId) || !trimValue(identity.userType)) {
      return null
    }

    const pushInfo = getPushClientInfo()
    const deviceToken = resolveDeviceToken(pushInfo)
    if (!deviceToken) {
      return null
    }

    const systemInfo = getSystemInfo()
    const appVersion = trimValue(
      typeof options.getAppVersion === 'function'
        ? options.getAppVersion(systemInfo)
        : systemInfo.appWgtVersion || systemInfo.appVersion || systemInfo.version
    )
    const locale = trimValue(systemInfo.language || systemInfo.locale || 'zh-Hans')
    const timezone = trimValue(systemInfo.timezone || resolveTimezone())
    const appEnv = trimValue(
      typeof options.getAppEnv === 'function'
        ? options.getAppEnv(systemInfo)
        : 'prod'
    ) || 'prod'

    return {
      userId: trimValue(identity.userId),
      userType: trimValue(identity.userType),
      deviceToken,
      appVersion,
      locale,
      timezone,
      appEnv,
    }
  }

  const registerCurrentPushDevice = async ({ force = false } = {}) => {
    const payload = resolveRegistrationPayload()
    if (!payload) {
      clearPushRegistrationState()
      return { success: false, skipped: true, reason: 'missing-context' }
    }

    const fingerprint = buildFingerprint(payload)
    const currentState = getCachedRegistrationState()
    const lastRegisteredAt = Number(currentState && currentState.lastRegisteredAt)
    const shouldSkip =
      !force &&
      currentState &&
      currentState.fingerprint === fingerprint &&
      Number.isFinite(lastRegisteredAt) &&
      Date.now() - lastRegisteredAt < minRegisterIntervalMs

    if (shouldSkip) {
      return {
        success: true,
        skipped: true,
        reason: 'recently-registered',
        payload,
      }
    }

    if (typeof options.registerPushDevice !== 'function') {
      return { success: false, skipped: true, reason: 'missing-api', payload }
    }

    const result = await options.registerPushDevice(payload)
    writeStorage(
      storageKey,
      JSON.stringify({
        ...payload,
        fingerprint,
        lastRegisteredAt: Date.now(),
      })
    )

    return {
      success: true,
      payload,
      data: result,
    }
  }

  const unregisterCurrentPushDevice = async () => {
    const currentState = getCachedRegistrationState() || {}
    const payload = resolveRegistrationPayload() || {}

    const userId = trimValue(payload.userId || currentState.userId)
    const userType = trimValue(payload.userType || currentState.userType)
    const deviceToken = trimValue(payload.deviceToken || currentState.deviceToken)

    if (!userId || !userType || !deviceToken) {
      clearPushRegistrationState()
      return { success: false, skipped: true, reason: 'missing-context' }
    }

    if (typeof options.unregisterPushDevice !== 'function') {
      clearPushRegistrationState()
      return { success: false, skipped: true, reason: 'missing-api' }
    }

    try {
      const result = await options.unregisterPushDevice({
        userId,
        userType,
        deviceToken,
      })
      clearPushRegistrationState()
      return { success: true, data: result }
    } catch (error) {
      clearPushRegistrationState()
      throw error
    }
  }

  const ackPushMessage = async (payload) => {
    if (typeof options.ackPushMessage !== 'function') {
      return { success: false, skipped: true, reason: 'missing-api' }
    }
    return options.ackPushMessage(payload)
  }

  return {
    registerCurrentPushDevice,
    unregisterCurrentPushDevice,
    clearPushRegistrationState,
    getCachedRegistrationState,
    ackPushMessage,
  }
}
