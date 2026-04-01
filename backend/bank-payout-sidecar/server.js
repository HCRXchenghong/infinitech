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
    allowStub: allowStub(body),
  }
}

function allowStub(body = {}) {
  return boolFromValue(body.allowStub, boolFromValue(process.env.BANK_PAYOUT_ALLOW_STUB, true))
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
    eventType: forcedStatus,
    thirdPartyOrderId,
    transferResult,
    responseData: {
      requestId,
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
      ready: boolFromValue(process.env.BANK_PAYOUT_ALLOW_STUB, true),
      mode: boolFromValue(process.env.BANK_PAYOUT_ALLOW_STUB, true) ? 'stub-enabled' : 'config-required',
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

  json(res, 404, { success: false, error: 'not found' })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`bank-payout-sidecar listening on :${port}`)
})
