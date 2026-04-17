import crypto from 'node:crypto'

export function normalizeText(value) {
  return String(value == null ? '' : value).trim()
}

export function boolFromEnv(value, fallback = false) {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized) return fallback
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
  return fallback
}

function safeEqualText(left, right) {
  const normalizedLeft = normalizeText(left)
  const normalizedRight = normalizeText(right)
  if (!normalizedLeft || !normalizedRight) return false

  const leftBuffer = Buffer.from(normalizedLeft, 'utf8')
  const rightBuffer = Buffer.from(normalizedRight, 'utf8')
  if (leftBuffer.length !== rightBuffer.length) return false
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export function currentEnv(env = process.env) {
  return normalizeText(env.ENV || env.NODE_ENV || 'development').toLowerCase()
}

export function productionLikeEnv(env = process.env) {
  return ['production', 'prod', 'staging'].includes(currentEnv(env))
}

export function sidecarHeaderSecret(headers = {}) {
  if (!headers || typeof headers !== 'object') return ''

  const candidates = [
    headers['x-sidecar-secret'],
    headers['X-Sidecar-Secret'],
    headers['x-sidecar-auth'],
    headers['X-Sidecar-Auth'],
  ]
  for (const candidate of candidates) {
    const normalized = normalizeText(Array.isArray(candidate) ? candidate[0] : candidate)
    if (normalized) {
      return normalized
    }
  }
  return ''
}

export function createAlipayRuntime(env = process.env) {
  const sharedSecret = normalizeText(env.ALIPAY_SIDECAR_API_SECRET)
  if (!sharedSecret) {
    throw new Error('ALIPAY_SIDECAR_API_SECRET is required')
  }

  const allowStubRequested = boolFromEnv(env.ALIPAY_SIDECAR_ALLOW_STUB, false)
  const allowStub = !productionLikeEnv(env) && allowStubRequested

  const config = {
    appIdConfigured: Boolean(normalizeText(env.ALIPAY_APP_ID)),
    privateKeyConfigured: Boolean(normalizeText(env.ALIPAY_PRIVATE_KEY)),
    publicKeyConfigured: Boolean(normalizeText(env.ALIPAY_PUBLIC_KEY)),
    notifyUrlConfigured: Boolean(normalizeText(env.ALIPAY_NOTIFY_URL)),
    sandbox: normalizeText(env.ALIPAY_SANDBOX || 'true').toLowerCase() !== 'false',
    allowStubRequested,
    allowStub,
    allowStubBlocked: allowStubRequested && !allowStub,
    sidecarAuthConfigured: true,
  }

  return {
    ...config,
    isReady() {
      return (
        config.appIdConfigured &&
        config.privateKeyConfigured &&
        config.publicKeyConfigured &&
        config.notifyUrlConfigured
      )
    },
    currentMode() {
      if (this.isReady()) return 'official-sdk'
      if (allowStub) return 'stub'
      return 'unconfigured'
    },
    configSummary() {
      return {
        ...config,
        mode: this.currentMode(),
      }
    },
    verifySidecarRequest(headers = {}) {
      return safeEqualText(sidecarHeaderSecret(headers), sharedSecret)
    },
  }
}
