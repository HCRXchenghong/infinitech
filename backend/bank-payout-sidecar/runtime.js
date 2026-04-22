import crypto from 'node:crypto'

export function normalizeText(value) {
  return String(value == null ? '' : value).trim()
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

export function bankPayoutConfiguredAdapter(body = {}) {
  return Boolean(
    normalizeText(body.providerUrl) &&
      normalizeText(body.merchantId) &&
      normalizeText(body.apiKey) &&
      normalizeText(body.notifyUrl),
  )
}

export function verifyConfiguredAdapterSignature(signature, body = {}) {
  return safeEqualText(signature, body.apiKey)
}

export function createBankPayoutRuntime(env = process.env) {
  const sharedSecret = normalizeText(env.BANK_PAYOUT_SIDECAR_API_SECRET)
  if (!sharedSecret) {
    throw new Error('BANK_PAYOUT_SIDECAR_API_SECRET is required')
  }

  return {
    sharedSecretConfigured: true,
    currentMode(body = {}) {
      if (bankPayoutConfiguredAdapter(body)) return 'configured-adapter'
      return 'unconfigured'
    },
    configSummary(body = {}) {
      return {
        sidecarMode: this.currentMode(body),
        sidecarAuthConfigured: true,
        providerUrlConfigured: Boolean(normalizeText(body.providerUrl)),
        merchantIdConfigured: Boolean(normalizeText(body.merchantId)),
        apiKeyConfigured: Boolean(normalizeText(body.apiKey)),
        notifyUrlConfigured: Boolean(normalizeText(body.notifyUrl)),
      }
    },
    verifySidecarRequest(headers = {}) {
      return safeEqualText(sidecarHeaderSecret(headers), sharedSecret)
    },
  }
}
