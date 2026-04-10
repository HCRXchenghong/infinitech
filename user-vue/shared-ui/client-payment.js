function normalizeText(value) {
  return String(value == null ? '' : value).trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function createPaymentError(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

function normalizeGateway(value) {
  const text = normalizeLower(value)
  if (text === 'wxpay' || text === 'wechatpay') return 'wechat'
  if (text === 'ali') return 'alipay'
  return text
}

function normalizePlatform(value) {
  const text = normalizeLower(value)
  if (text === 'mini-program' || text === 'mp-weixin' || text === 'wechat-mini-program') {
    return 'mini_program'
  }
  if (text === 'app-plus') return 'app'
  return text
}

function extractPaymentPayload(result) {
  const safeResult = asObject(result)
  return asObject(
    safeResult.paymentPayload ||
      safeResult.payment_payload ||
      safeResult.clientPayload ||
      safeResult.client_payload
  )
}

function requestPayment(options) {
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      ...options,
      success: resolve,
      fail: reject,
    })
  })
}

function buildWechatMiniProgramParams(payload) {
  const timeStamp = normalizeText(payload.timeStamp || payload.timestamp)
  const nonceStr = normalizeText(payload.nonceStr || payload.noncestr)
  const pkg = normalizeText(payload.package)
  const paySign = normalizeText(payload.paySign || payload.sign)
  const signType = normalizeText(payload.signType || 'RSA')
  if (!timeStamp || !nonceStr || !pkg || !paySign) {
    throw createPaymentError('微信支付参数不完整，请检查支付配置', 'PAYMENT_PAYLOAD_INVALID')
  }
  return {
    timeStamp,
    nonceStr,
    package: pkg,
    signType,
    paySign,
  }
}

function buildWechatAppOrderInfo(payload) {
  const appid = normalizeText(payload.appId || payload.appid)
  const partnerid = normalizeText(payload.partnerId || payload.partnerid)
  const prepayid = normalizeText(payload.prepayId || payload.prepayid)
  const noncestr = normalizeText(payload.nonceStr || payload.noncestr)
  const timestamp = normalizeText(payload.timeStamp || payload.timestamp)
  const pkg = normalizeText(payload.package || 'Sign=WXPay')
  const sign = normalizeText(payload.sign || payload.paySign)
  if (!appid || !partnerid || !prepayid || !noncestr || !timestamp || !sign) {
    throw createPaymentError('微信 App 支付参数不完整，请检查支付配置', 'PAYMENT_PAYLOAD_INVALID')
  }
  return {
    appid,
    partnerid,
    prepayid,
    noncestr,
    timestamp,
    package: pkg,
    sign,
  }
}

function buildAlipayOrderString(payload) {
  const orderString = normalizeText(payload.orderString || payload.orderStr || payload.orderInfo)
  if (!orderString) {
    if (normalizeLower(payload.sidecarMode) === 'stub') {
      throw createPaymentError('当前支付宝仍是 Stub 模式，无法拉起真实支付', 'PAYMENT_STUB_MODE')
    }
    throw createPaymentError('支付宝支付参数不完整，请检查支付配置', 'PAYMENT_PAYLOAD_INVALID')
  }
  return orderString
}

export function shouldLaunchClientPayment(result) {
  const safeResult = asObject(result)
  const status = normalizeLower(safeResult.status)
  if (status !== 'awaiting_client_pay') return false
  const payload = extractPaymentPayload(result)
  const gateway = normalizeGateway(
    payload.gateway || safeResult.gateway || safeResult.paymentMethod || safeResult.payment_method
  )
  return gateway === 'wechat' || gateway === 'alipay'
}

export function isClientPaymentCancelled(error) {
  const safeError = asObject(error)
  const text = normalizeLower(safeError.errMsg || safeError.message || safeError.error)
  return text.includes('cancel')
}

export function getClientPaymentErrorMessage(error, fallback = '支付拉起失败，请稍后重试') {
  if (!error) return fallback
  if (isClientPaymentCancelled(error)) return '已取消支付'
  const safeError = asObject(error)
  const text = normalizeText(safeError.message || safeError.errMsg || safeError.error)
  if (!text) return fallback
  return text.replace(/^requestpayment:fail\s*/i, '').trim() || fallback
}

export async function invokeClientPayment(result, platform) {
  const payload = extractPaymentPayload(result)
  const safeResult = asObject(result)
  const gateway = normalizeGateway(
    payload.gateway || safeResult.gateway || safeResult.paymentMethod || safeResult.payment_method
  )
  const normalizedPlatform = normalizePlatform(platform || payload.platform || safeResult.platform)

  if (gateway === 'wechat') {
    if (normalizedPlatform === 'mini_program') {
      return requestPayment(buildWechatMiniProgramParams(payload))
    }
    if (normalizedPlatform === 'app') {
      return requestPayment({
        provider: 'wxpay',
        orderInfo: buildWechatAppOrderInfo(payload),
      })
    }
    throw createPaymentError('当前平台不支持拉起微信支付', 'PAYMENT_UNSUPPORTED_PLATFORM')
  }

  if (gateway === 'alipay') {
    if (normalizedPlatform !== 'app') {
      throw createPaymentError('当前平台不支持拉起支付宝支付', 'PAYMENT_UNSUPPORTED_PLATFORM')
    }
    return requestPayment({
      provider: 'alipay',
      orderInfo: buildAlipayOrderString(payload),
    })
  }

  throw createPaymentError('当前支付渠道不支持客户端拉起', 'PAYMENT_UNSUPPORTED_GATEWAY')
}
