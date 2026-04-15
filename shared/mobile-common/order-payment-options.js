export function normalizePayChannel(raw) {
  const value = String(raw || '').trim().toLowerCase()
  if (value === 'if-pay' || value === 'if_pay' || value === 'balance') return 'ifpay'
  if (value === 'wxpay' || value === 'wechatpay') return 'wechat'
  if (value === 'ali') return 'alipay'
  return value
}

function defaultPayMethodLabel(value) {
  if (value === 'ifpay') return 'IF-Pay 余额支付'
  if (value === 'wechat') return '微信支付'
  if (value === 'alipay') return '支付宝支付'
  return value
}

export function fallbackOrderPayMethods({ platform = 'app' } = {}) {
  const fallback = [
    { value: 'ifpay', label: 'IF-Pay 余额支付', tip: '优先使用钱包余额' },
    {
      value: 'wechat',
      label: '微信支付',
      tip: platform === 'mini_program' ? '小程序订单支付' : '推荐微信用户选择',
    },
  ]

  if (platform !== 'mini_program') {
    fallback.push({ value: 'alipay', label: '支付宝支付', tip: '适合支付宝用户' })
  }

  return fallback
}

export function normalizeOrderPayMethods(response, { platform = 'app' } = {}) {
  const safeResponse = response && typeof response === 'object' ? response : {}
  const responseData = safeResponse.data && typeof safeResponse.data === 'object' ? safeResponse.data : {}
  const rawOptions = Array.isArray(safeResponse.options)
    ? safeResponse.options
    : Array.isArray(responseData.options)
      ? responseData.options
      : []

  const normalized = rawOptions
    .map((item) => {
      const safeItem = item && typeof item === 'object' ? item : {}
      const value = normalizePayChannel(safeItem.channel)
      if (!value) return null
      return {
        value,
        label: String(safeItem.label || '').trim() || defaultPayMethodLabel(value),
        tip: String(safeItem.description || '').trim() || '由后台支付中心统一控制',
      }
    })
    .filter(Boolean)

  return normalized.length > 0 ? normalized : fallbackOrderPayMethods({ platform })
}
