type PaymentResult = Record<string, any> | null | undefined

function normalizeText(value: unknown): string {
  return String(value == null ? '' : value).trim()
}

function normalizeLower(value: unknown): string {
  return normalizeText(value).toLowerCase()
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {}
}

function createPaymentError(message: string, code: string) {
  const error = new Error(message) as Error & { code?: string }
  error.code = code
  return error
}

function normalizeGateway(value: unknown): string {
  const text = normalizeLower(value)
  if (text === 'wxpay' || text === 'wechatpay') return 'wechat'
  if (text === 'ali') return 'alipay'
  return text
}

function normalizePlatform(value: unknown): string {
  const text = normalizeLower(value)
  if (text === 'mini-program' || text === 'mp-weixin' || text === 'wechat-mini-program') {
    return 'mini_program'
  }
  if (text === 'app-plus') return 'app'
  return text
}

function extractPaymentPayload(result: PaymentResult): Record<string, any> {
  return asObject(
    result?.paymentPayload ||
      result?.payment_payload ||
      result?.clientPayload ||
      result?.client_payload
  )
}

function requestPayment(options: Record<string, any>) {
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      ...options,
      success: resolve,
      fail: reject,
    })
  })
}

function buildWechatMiniProgramParams(payload: Record<string, any>) {
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

function buildWechatAppOrderInfo(payload: Record<string, any>) {
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

function buildAlipayOrderString(payload: Record<string, any>) {
  const orderString = normalizeText(payload.orderString || payload.orderStr || payload.orderInfo)
  if (!orderString) {
    if (normalizeLower(payload.sidecarMode) === 'stub') {
      throw createPaymentError('当前支付宝仍是 Stub 模式，无法拉起真实支付', 'PAYMENT_STUB_MODE')
    }
    throw createPaymentError('支付宝支付参数不完整，请检查支付配置', 'PAYMENT_PAYLOAD_INVALID')
  }
  return orderString
}

export function shouldLaunchClientPayment(result: PaymentResult): boolean {
  const status = normalizeLower(result?.status)
  if (status !== 'awaiting_client_pay') return false
  const payload = extractPaymentPayload(result)
  const gateway = normalizeGateway(payload.gateway || result?.gateway || result?.paymentMethod || result?.payment_method)
  return gateway === 'wechat' || gateway === 'alipay'
}

export function isClientPaymentCancelled(error: any): boolean {
  const text = normalizeLower(error?.errMsg || error?.message || error?.error)
  return text.includes('cancel')
}

export function getClientPaymentErrorMessage(error: any, fallback = '支付拉起失败，请稍后重试'): string {
  if (!error) return fallback
  if (isClientPaymentCancelled(error)) return '已取消支付'
  const text = normalizeText(error?.message || error?.errMsg || error?.error)
  if (!text) return fallback
  return text.replace(/^requestpayment:fail\s*/i, '').trim() || fallback
}

export async function invokeClientPayment(result: PaymentResult, platform: string) {
  const payload = extractPaymentPayload(result)
  const gateway = normalizeGateway(payload.gateway || result?.gateway || result?.paymentMethod || result?.payment_method)
  const normalizedPlatform = normalizePlatform(platform || payload.platform || result?.platform)

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
