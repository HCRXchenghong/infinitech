import http from 'node:http'

const port = Number(process.env.BANK_PAYOUT_SIDECAR_PORT || 10302)
const payouts = new Map()

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 1024 * 1024) {
        reject(new Error('request body too large'))
      }
    })
    req.on('end', () => {
      if (!data) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(data))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function normalizeText(value) {
  return String(value == null ? '' : value).trim()
}

function boolFromValue(value, fallback = false) {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized) return fallback
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
  return fallback
}

function currentEnv() {
  return normalizeText(process.env.ENV || process.env.NODE_ENV || 'development').toLowerCase()
}

function productionLikeEnv() {
  return ['production', 'prod', 'staging'].includes(currentEnv())
}

function requireText(value, field) {
  const normalized = normalizeText(value)
  if (!normalized) {
    throw new Error(`${field} is required`)
  }
  return normalized
}

function requireAmount(value, field) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${field} must be greater than 0`)
  }
  return Math.round(amount)
}

function configSummary(body = {}) {
  return {
    sidecarMode: currentMode(body),
    providerUrlConfigured: Boolean(normalizeText(body.providerUrl)),
    merchantIdConfigured: Boolean(normalizeText(body.merchantId)),
    apiKeyConfigured: Boolean(normalizeText(body.apiKey)),
    notifyUrlConfigured: Boolean(normalizeText(body.notifyUrl)),
    allowStubRequested: allowStubRequested(body),
    allowStub: allowStub(body),
    allowStubBlocked: allowStubRequested(body) && !allowStub(body),
  }
}

function allowStubRequested(body = {}) {
  return boolFromValue(body.allowStub, boolFromValue(process.env.BANK_PAYOUT_ALLOW_STUB, false))
}

function allowStub(body = {}) {
  return !productionLikeEnv() && allowStubRequested(body)
}

function isConfigured(body = {}) {
  return Boolean(
    normalizeText(body.providerUrl) &&
      normalizeText(body.merchantId) &&
      normalizeText(body.apiKey) &&
      normalizeText(body.notifyUrl),
  )
}

function currentMode(body = {}) {
  if (isConfigured(body)) return 'configured-adapter'
  if (allowStub(body)) return 'stub'
  return 'unconfigured'
}

function normalizeLifecycleStatus(value) {
  const status = normalizeText(value).toLowerCase()
  if (!status) return 'transferring'
  if (status.includes('success') || status.includes('finish')) return 'success'
  if (status.includes('fail') || status.includes('close') || status.includes('cancel') || status.includes('reject')) return 'failed'
  return 'transferring'
}

function toEventTypeFromStatus(status) {
  if (status === 'success') return 'payout.success'
  if (status === 'failed') return 'payout.fail'
  return 'payout.processing'
}

function buildEnvelope(payload) {
  return {
    success: true,
    gateway: 'bank_card',
    integrationTarget: 'bank-payout-sidecar',
    ...payload,
  }
}

function ensureAvailable(body = {}) {
  const mode = currentMode(body)
  if (mode === 'unconfigured') {
    throw new Error('bank payout sidecar is not fully configured')
  }
  return mode
}

function getStoredPayout(body = {}) {
  const requestId = normalizeText(body.requestId)
  const thirdPartyOrderId = normalizeText(body.thirdPartyOrderId)
  if (requestId && payouts.has(requestId)) {
    return payouts.get(requestId)
  }
  if (thirdPartyOrderId) {
    for (const record of payouts.values()) {
      if (record.thirdPartyOrderId === thirdPartyOrderId) {
        return record
      }
    }
  }
  return null
}

function lowerCaseHeaders(rawHeaders = {}) {
  if (!rawHeaders || typeof rawHeaders !== 'object') return {}
  return Object.entries(rawHeaders).reduce((acc, [key, value]) => {
    const normalizedKey = normalizeText(key).toLowerCase()
    if (!normalizedKey) return acc
    acc[normalizedKey] = normalizeText(Array.isArray(value) ? value[0] : value)
    return acc
  }, {})
}

function parseRawBodyPayload(rawBody) {
  const source = normalizeText(rawBody)
  if (!source) return {}
  try {
    const parsed = JSON.parse(source)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {}
  try {
    const parsed = Object.fromEntries(new URLSearchParams(source).entries())
    return parsed && Object.keys(parsed).length > 0 ? parsed : {}
  } catch {
    return {}
  }
}

function mergeCallbackPayload(body = {}) {
  const rawPayload = parseRawBodyPayload(body.rawBody)
  const paramsPayload = body.params && typeof body.params === 'object' ? body.params : {}
  return {
    ...rawPayload,
    ...paramsPayload,
  }
}

function resolveCallbackSignature(headers = {}, payload = {}) {
  return normalizeText(
    headers['x-bank-signature'] ||
      headers['x-signature'] ||
      headers.signature ||
      payload.signature ||
      payload.sign,
  )
}

function resolveCallbackTransactionId(payload = {}, record = null) {
  return normalizeText(
    payload.transactionId ||
      payload.transaction_id ||
      payload.requestId ||
      payload.request_id ||
      record?.transactionId,
  )
}

function resolveCallbackThirdPartyOrderId(payload = {}, record = null) {
  return normalizeText(
    payload.thirdPartyOrderId ||
      payload.third_party_order_id ||
      payload.providerOrderId ||
      payload.provider_order_id ||
      payload.orderId ||
      payload.order_id ||
      record?.thirdPartyOrderId,
  )
}

function verifyConfiguredAdapterSignature(signature, body = {}) {
  const apiKey = normalizeText(body.apiKey)
  return Boolean(apiKey) && signature === apiKey
}

function buildCreateResponse(body = {}) {
  const mode = ensureAvailable(body)
  const requestId = requireText(body.requestId, 'requestId')
  const transactionId = requireText(body.transactionId, 'transactionId')
  const withdrawAccount = requireText(body.withdrawAccount, 'withdrawAccount')
  const amount = requireAmount(body.amount, 'amount')
  const actualAmount = requireAmount(body.actualAmount || amount, 'actualAmount')
  const fee = Math.max(0, Number(body.fee || 0))
  const thirdPartyOrderId = normalizeText(body.thirdPartyOrderId) || `BANKPAYOUT-${requestId}`
  const arrivalText = normalizeText(body.arrivalText) || '24小时-48小时'
  const transferResult = `银行卡提现请求已提交，预计 ${arrivalText} 到账`

  const record = {
    requestId,
    transactionId,
    withdrawAccount,
    amount,
    actualAmount,
    fee,
    thirdPartyOrderId,
    status: 'transferring',
    transferResult,
    providerMode: mode,
    providerUrl: normalizeText(body.providerUrl),
    merchantId: normalizeText(body.merchantId),
    notifyUrl: normalizeText(body.notifyUrl),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  payouts.set(requestId, record)

  return buildEnvelope({
    status: record.status,
    transactionId,
    thirdPartyOrderId,
    transferResult,
    responseData: {
      ...record,
      gatewayStatus: record.status,
      config: configSummary(body),
    },
    message: mode === 'stub' ? 'Bank payout sidecar accepted payout in stub mode.' : 'Bank payout sidecar accepted payout request.',
  })
}

function buildQueryResponse(body = {}) {
  const mode = ensureAvailable(body)
  const record = getStoredPayout(body)
  const requestId = requireText(body.requestId || record?.requestId, 'requestId')
  const transactionId = normalizeText(body.transactionId || record?.transactionId)
  const thirdPartyOrderId = normalizeText(body.thirdPartyOrderId || record?.thirdPartyOrderId) || `BANKPAYOUT-${requestId}`
  const forcedStatus = normalizeLifecycleStatus(
    body.gatewayStatus || body.mockStatus || process.env.BANK_PAYOUT_STUB_QUERY_STATUS || record?.status,
  )
  const transferResult =
    normalizeText(body.transferResult || record?.transferResult) ||
    (forcedStatus === 'success'
      ? '银行卡提现已到账'
      : forcedStatus === 'failed'
        ? '银行卡提现失败'
        : '银行卡提现处理中')

  if (record) {
    record.status = forcedStatus
    record.transferResult = transferResult
    record.updatedAt = new Date().toISOString()
  }

  return buildEnvelope({
    status: forcedStatus,
    eventType: toEventTypeFromStatus(forcedStatus),
    transactionId,
    thirdPartyOrderId,
    transferResult,
    responseData: {
      requestId,
      transactionId,
      thirdPartyOrderId,
      gatewayStatus: forcedStatus,
      transferResult,
      providerMode: mode,
      config: configSummary(body),
      record: record || null,
    },
    message: 'Bank payout sidecar queried payout status.',
  })
}

function buildVerifyResponse(body = {}) {
  const mode = ensureAvailable(body)
  const payload = mergeCallbackPayload(body)
  const headers = lowerCaseHeaders(body.headers)
  const record = getStoredPayout({
    requestId: payload.requestId || payload.request_id || body.requestId,
    thirdPartyOrderId:
      payload.thirdPartyOrderId || payload.third_party_order_id || payload.providerOrderId || payload.provider_order_id || body.thirdPartyOrderId,
  })

  const signature = resolveCallbackSignature(headers, payload)
  const verified = mode === 'configured-adapter' ? verifyConfiguredAdapterSignature(signature, body) : allowStub(body)
  if (!verified) {
    throw new Error('bank payout callback signature verification failed')
  }

  const normalizedStatus = normalizeLifecycleStatus(
    payload.status ||
      payload.eventType ||
      payload.gatewayStatus ||
      payload.transferStatus ||
      payload.resultCode ||
      payload.result_code ||
      record?.status,
  )
  const transactionId = resolveCallbackTransactionId(payload, record)
  const thirdPartyOrderId = resolveCallbackThirdPartyOrderId(payload, record)
  const transferResult =
    normalizeText(payload.transferResult || payload.message || record?.transferResult) ||
    (normalizedStatus === 'success'
      ? '银行卡提现已到账'
      : normalizedStatus === 'failed'
        ? '银行卡提现失败'
        : '银行卡提现处理中')

  if (record) {
    record.status = normalizedStatus
    record.transferResult = transferResult
    record.updatedAt = new Date().toISOString()
  }

  return buildEnvelope({
    verified: true,
    status: 'verified',
    eventType: toEventTypeFromStatus(normalizedStatus),
    transactionId,
    thirdPartyOrderId,
    transferResult,
    responseData: {
      gatewayStatus: normalizedStatus,
      transferResult,
      notifyPayload: payload,
      config: configSummary(body),
      record: record || null,
    },
    message:
      mode === 'configured-adapter'
        ? 'Bank payout sidecar verified provider callback.'
        : 'Bank payout sidecar accepted callback in stub mode.',
  })
}

async function handleJsonPost(req, res, builder) {
  try {
    const body = await readBody(req)
    const payload = builder(body)
    json(res, 200, payload)
  } catch (error) {
    const message = error?.message || 'invalid request body'
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    json(res, message.includes('not fully configured') ? 503 : 400, {
      success: false,
      error: message,
      config: configSummary(body),
    })
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`)

  if (req.method === 'GET' && url.pathname === '/health') {
    json(res, 200, {
      status: 'ok',
      service: 'bank-payout-sidecar',
      ready: boolFromValue(process.env.BANK_PAYOUT_ALLOW_STUB, false),
      mode: boolFromValue(process.env.BANK_PAYOUT_ALLOW_STUB, false) ? 'stub-enabled' : 'config-required',
      storedPayouts: payouts.size,
      timestamp: new Date().toISOString(),
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/v1/payouts/create') {
    await handleJsonPost(req, res, buildCreateResponse)
    return
  }

  if (req.method === 'POST' && url.pathname === '/v1/payouts/query') {
    await handleJsonPost(req, res, buildQueryResponse)
    return
  }

  if (req.method === 'POST' && url.pathname === '/v1/notify/verify') {
    await handleJsonPost(req, res, buildVerifyResponse)
    return
  }

  json(res, 404, { success: false, error: 'not found' })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`bank-payout-sidecar listening on :${port}`)
})
