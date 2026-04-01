import http from 'node:http'
import AlipaySdk from 'alipay-sdk'

const port = Number(process.env.ALIPAY_SIDECAR_PORT || 10301)

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

function boolFromEnv(value, fallback = false) {
  const normalized = String(value == null ? '' : value).trim().toLowerCase()
  if (!normalized) return fallback
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
  return fallback
}

function normalizeText(value) {
  return String(value == null ? '' : value).trim()
}

function configSummary() {
  return {
    appIdConfigured: Boolean(normalizeText(process.env.ALIPAY_APP_ID)),
    privateKeyConfigured: Boolean(normalizeText(process.env.ALIPAY_PRIVATE_KEY)),
    publicKeyConfigured: Boolean(normalizeText(process.env.ALIPAY_PUBLIC_KEY)),
    notifyUrlConfigured: Boolean(normalizeText(process.env.ALIPAY_NOTIFY_URL)),
    sandbox: String(process.env.ALIPAY_SANDBOX || 'true').trim().toLowerCase() !== 'false',
  }
}

function isReady() {
  const config = configSummary()
  return config.appIdConfigured && config.privateKeyConfigured && config.publicKeyConfigured && config.notifyUrlConfigured
}

function allowStubMode() {
  return boolFromEnv(process.env.ALIPAY_SIDECAR_ALLOW_STUB, false)
}

function currentMode() {
  if (isReady()) return 'official-sdk'
  if (allowStubMode()) return 'stub'
  return 'unconfigured'
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

function fenToYuan(amount) {
  return (Number(amount || 0) / 100).toFixed(2)
}

function buildEnvelope(payload) {
  return {
    success: true,
    gateway: 'alipay',
    integrationTarget: 'official-sidecar-sdk',
    ...payload,
  }
}

function normalizeGatewayTransactionId(params) {
  return normalizeText(
    params.trade_no ||
      params.pay_fund_order_id ||
      params.order_id ||
      params.biz_order_id,
  )
}

function normalizeAlipayEventType(params) {
  return normalizeText(
    params.trade_status ||
      params.status ||
      params.order_status ||
      params.trans_status,
  )
}

function normalizeTransferLifecycleStatus(value) {
  const status = normalizeText(value).toLowerCase()
  if (!status) return 'transferring'
  if (status.includes('success') || status.includes('finish')) return 'success'
  if (status.includes('fail') || status.includes('close') || status.includes('cancel') || status.includes('reject')) return 'failed'
  return 'transferring'
}

let cachedSdk = null

function getAlipaySdk() {
  if (!isReady()) return null
  if (cachedSdk) return cachedSdk
  cachedSdk = new AlipaySdk({
    appId: normalizeText(process.env.ALIPAY_APP_ID),
    privateKey: normalizeText(process.env.ALIPAY_PRIVATE_KEY),
    alipayPublicKey: normalizeText(process.env.ALIPAY_PUBLIC_KEY),
    gateway: boolFromEnv(process.env.ALIPAY_SANDBOX, false)
      ? 'https://openapi-sandbox.dl.alipaydev.com/gateway.do'
      : 'https://openapi.alipay.com/gateway.do',
  })
  return cachedSdk
}

function buildStubPaymentResponse(body) {
  const outTradeNo = requireText(body.outTradeNo, 'outTradeNo')
  const scene = requireText(body.scene, 'scene')
  const amount = requireAmount(body.amount, 'amount')
  const description = requireText(body.description || '平台支付', 'description')
  const clientPayload = {
    gateway: 'alipay',
    scene,
    outTradeNo,
    amount,
    description,
    appId: normalizeText(process.env.ALIPAY_APP_ID),
    notifyUrl: requireText(body.notifyUrl || process.env.ALIPAY_NOTIFY_URL, 'notifyUrl'),
    sidecarMode: 'stub',
  }
  return buildEnvelope({
    status: 'awaiting_client_pay',
    thirdPartyOrderId: outTradeNo,
    clientPayload,
    responseData: {
      status: 'awaiting_client_pay',
      gateway: 'alipay',
      integrationTarget: 'official-sidecar-sdk',
      scene,
      outTradeNo,
      amount,
      description,
      clientPayload,
      sidecarMode: 'stub',
    },
    message: 'Alipay sidecar stub accepted payment intent.',
  })
}

async function buildOfficialPaymentResponse(body) {
  const sdk = getAlipaySdk()
  if (!sdk) {
    throw new Error('alipay sidecar is not fully configured')
  }
  const outTradeNo = requireText(body.outTradeNo, 'outTradeNo')
  const scene = requireText(body.scene, 'scene')
  const amount = requireAmount(body.amount, 'amount')
  const description = requireText(body.description || '平台支付', 'description')
  const notifyUrl = requireText(body.notifyUrl || process.env.ALIPAY_NOTIFY_URL, 'notifyUrl')
  const orderString = sdk.sdkExecute('alipay.trade.app.pay', {
    notifyUrl,
    bizContent: {
      outTradeNo,
      productCode: 'QUICK_MSECURITY_PAY',
      subject: description.slice(0, 120),
      body: description.slice(0, 256),
      totalAmount: fenToYuan(amount),
    },
  })

  const clientPayload = {
    gateway: 'alipay',
    scene,
    outTradeNo,
    amount,
    orderString,
    notifyUrl,
    appId: normalizeText(process.env.ALIPAY_APP_ID),
    sidecarMode: 'official-sdk',
  }
  return buildEnvelope({
    status: 'awaiting_client_pay',
    thirdPartyOrderId: outTradeNo,
    clientPayload,
    responseData: {
      status: 'awaiting_client_pay',
      gateway: 'alipay',
      integrationTarget: 'official-sidecar-sdk',
      scene,
      outTradeNo,
      amount,
      description,
      clientPayload,
      sidecarMode: 'official-sdk',
    },
    message: 'Alipay sidecar created official app payment order string.',
  })
}

async function buildRefundResponse(body) {
  if (currentMode() !== 'official-sdk') {
    throw new Error('alipay refund requires official sidecar configuration')
  }
  const sdk = getAlipaySdk()
  const outTradeNo = requireText(body.outTradeNo || body.transactionId, 'outTradeNo')
  const refundNo = requireText(body.refundNo || `${outTradeNo}-refund`, 'refundNo')
  const amount = requireAmount(body.amount, 'amount')
  const reason = requireText(body.reason || '订单退款', 'reason')
  const notifyUrl = requireText(body.notifyUrl || process.env.ALIPAY_NOTIFY_URL, 'notifyUrl')
  const result = await sdk.exec('alipay.trade.refund', {
    notifyUrl,
    bizContent: {
      outTradeNo,
      outRequestNo: refundNo,
      refundAmount: fenToYuan(amount),
      refundReason: reason,
    },
  })

  return buildEnvelope({
    status: 'refund_pending',
    thirdPartyOrderId: refundNo,
    responseData: {
      status: 'refund_pending',
      gateway: 'alipay',
      integrationTarget: 'official-sidecar-sdk',
      outTradeNo,
      refundNo,
      amount,
      reason,
      sidecarMode: 'official-sdk',
      gatewayResponse: result,
    },
    message: 'Alipay sidecar submitted official refund request.',
  })
}

async function buildPayoutResponse(body) {
  if (currentMode() !== 'official-sdk') {
    throw new Error('alipay payout requires official sidecar configuration')
  }
  const sdk = getAlipaySdk()
  const requestId = requireText(body.requestId, 'requestId')
  const transactionId = requireText(body.transactionId, 'transactionId')
  const withdrawAccount = requireText(body.withdrawAccount, 'withdrawAccount')
  const amount = requireAmount(body.amount, 'amount')
  const actualAmount = requireAmount(body.actualAmount || amount, 'actualAmount')
  const fee = Math.max(0, Number(body.fee || 0))
  const withdrawName = normalizeText(body.withdrawName)
  const notifyUrl = requireText(body.notifyUrl || process.env.ALIPAY_PAYOUT_NOTIFY_URL || process.env.ALIPAY_NOTIFY_URL, 'notifyUrl')
  const result = await sdk.exec('alipay.fund.trans.uni.transfer', {
    notifyUrl,
    bizContent: {
      outBizNo: requestId,
      transAmount: fenToYuan(actualAmount),
      productCode: 'TRANS_ACCOUNT_NO_PWD',
      bizScene: 'DIRECT_TRANSFER',
      orderTitle: `${normalizeText(body.userType) || 'wallet'}提现`,
      remark: normalizeText(body.remark || `${requestId} 提现打款`),
      payeeInfo: {
        identity: withdrawAccount,
        identityType: 'ALIPAY_LOGON_ID',
        name: withdrawName || undefined,
      },
    },
  })
  const gatewayTransactionId = normalizeText(
    result?.orderId || result?.payFundOrderId || result?.businessSceneId,
  )
  const gatewayStatus = normalizeText(
    result?.status || result?.orderStatus || result?.transStatus,
  )
  const payoutStatus = normalizeTransferLifecycleStatus(gatewayStatus)
  const transferResult = gatewayStatus
    ? `支付宝提现请求已提交，当前状态：${gatewayStatus.toLowerCase()}`
    : '支付宝提现请求已提交，等待异步结果回写'
  return buildEnvelope({
    status: payoutStatus,
    thirdPartyOrderId: gatewayTransactionId || requestId,
    transferResult,
    responseData: {
      status: payoutStatus,
      gateway: 'alipay',
      integrationTarget: 'official-sidecar-sdk',
      requestId,
      transactionId,
      withdrawAccount,
      withdrawName,
      amount,
      actualAmount,
      fee,
      thirdPartyOrderId: gatewayTransactionId || requestId,
      notifyUrl,
      gatewayStatus,
      sidecarMode: 'official-sdk',
      gatewayResponse: result,
    },
    message: 'Alipay sidecar submitted official payout request.',
  })
}

async function buildPayoutQueryResponse(body) {
  if (currentMode() !== 'official-sdk') {
    throw new Error('alipay payout query requires official sidecar configuration')
  }
  const sdk = getAlipaySdk()
  const requestId = requireText(body.requestId, 'requestId')
  const result = await sdk.exec('alipay.fund.trans.common.query', {
    bizContent: {
      outBizNo: requestId,
      productCode: 'TRANS_ACCOUNT_NO_PWD',
      bizScene: 'DIRECT_TRANSFER',
    },
  })
  const gatewayStatus = normalizeText(
    result?.status || result?.orderStatus || result?.transStatus,
  )
  const gatewayTransactionId = normalizeText(
    result?.payFundOrderId || result?.orderId || result?.bizOrderId,
  )
  return buildEnvelope({
    status: normalizeTransferLifecycleStatus(gatewayStatus),
    thirdPartyOrderId: gatewayTransactionId || requestId,
    eventType: gatewayStatus,
    responseData: {
      gatewayStatus,
      gatewayResponse: result,
      sidecarMode: 'official-sdk',
    },
    message: 'Alipay sidecar queried payout status.',
  })
}

async function buildNotifyVerifyResponse(body) {
  if (currentMode() !== 'official-sdk') {
    throw new Error('alipay notify verification requires official sidecar configuration')
  }
  const sdk = getAlipaySdk()
  const params = body && typeof body.params === 'object' && body.params ? body.params : {}
  if (!Object.keys(params).length) {
    throw new Error('params is required')
  }
  const verified = sdk.checkNotifySignV2(params)
  if (!verified) {
    throw new Error('alipay notify sign check failed')
  }
  const eventType = normalizeAlipayEventType(params)
  const merchantOrderId = normalizeText(params.out_trade_no || params.out_biz_no)
  const gatewayTransactionId = normalizeGatewayTransactionId(params)
  return buildEnvelope({
    status: 'verified',
    verified: true,
    eventType,
    transactionId: merchantOrderId,
    thirdPartyOrderId: gatewayTransactionId || merchantOrderId,
    responseData: {
      gatewayTransactionId,
      notifyPayload: params,
      sidecarMode: 'official-sdk',
    },
    message: 'Alipay sidecar verified callback signature.',
  })
}

async function handleJsonPost(req, res, builder) {
  try {
    const mode = currentMode()
    if (mode === 'unconfigured') {
      json(res, 503, {
        success: false,
        error: 'alipay sidecar is not fully configured',
        config: configSummary(),
      })
      return
    }
    const body = await readBody(req)
    const payload = await builder(body, mode)
    json(res, 200, payload)
  } catch (error) {
    json(res, 400, { success: false, error: error.message || 'invalid request body' })
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`)

  if (req.method === 'GET' && url.pathname === '/health') {
    json(res, 200, {
      status: 'ok',
      service: 'alipay-sidecar',
      mode: currentMode(),
      ready: isReady(),
      payoutMode: currentMode() === 'official-sdk' ? 'official-sdk' : 'stub',
      config: configSummary(),
      timestamp: new Date().toISOString(),
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/v1/payments/create') {
    await handleJsonPost(req, res, async (body, mode) => {
      if (mode === 'stub') return buildStubPaymentResponse(body)
      return buildOfficialPaymentResponse(body)
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/v1/refunds/create') {
    await handleJsonPost(req, res, buildRefundResponse)
    return
  }

  if (req.method === 'POST' && url.pathname === '/v1/payouts/create') {
    await handleJsonPost(req, res, buildPayoutResponse)
    return
  }

  if (req.method === 'POST' && url.pathname === '/v1/payouts/query') {
    await handleJsonPost(req, res, buildPayoutQueryResponse)
    return
  }

  if (req.method === 'POST' && url.pathname === '/v1/notify/verify') {
    await handleJsonPost(req, res, buildNotifyVerifyResponse)
    return
  }

  json(res, 404, { success: false, error: 'not found' })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`alipay-sidecar listening on :${port}`)
})
