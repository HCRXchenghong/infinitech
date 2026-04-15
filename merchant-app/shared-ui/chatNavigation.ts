import { getMerchantId } from './merchantContext'

function encode(value: unknown) {
  return encodeURIComponent(String(value || ''))
}

function resolveOrderId(order: any) {
  const value = order?.id || order?.daily_order_id
  return value === undefined || value === null ? '' : String(value)
}

function navigateToChat(params: {
  chatId: string
  role: 'user' | 'rider' | 'admin'
  name?: string
  targetId?: string
  orderId?: string
}) {
  const query = [
    `chatId=${encode(params.chatId)}`,
    `role=${encode(params.role)}`,
  ]

  if (params.name) {
    query.push(`name=${encode(params.name)}`)
  }
  if (params.targetId) {
    query.push(`targetId=${encode(params.targetId)}`)
  }
  if (params.orderId) {
    query.push(`orderId=${encode(params.orderId)}`)
  }

  uni.navigateTo({
    url: `/pages/messages/chat?${query.join('&')}`,
  })
}

export function openMerchantUserChat(order: any) {
  const orderId = resolveOrderId(order)
  if (!orderId) {
    uni.showToast({ title: '订单信息异常', icon: 'none' })
    return
  }
  const name = order?.customer_name || order?.customer_phone || '用户会话'
  const targetId = order?.customer_id || order?.customer_phone || ''
  navigateToChat({
    chatId: `shop_${orderId}`,
    role: 'user',
    name,
    targetId: String(targetId || ''),
    orderId,
  })
}

export function openMerchantRiderChat(order: any) {
  const orderId = resolveOrderId(order)
  if (!orderId) {
    uni.showToast({ title: '订单信息异常', icon: 'none' })
    return
  }
  const name = order?.rider_name || '骑手会话'
  const targetId = order?.rider_id || order?.rider_phone || ''
  navigateToChat({
    chatId: `rs_${orderId}`,
    role: 'rider',
    name,
    targetId: String(targetId || ''),
    orderId,
  })
}

export function openMerchantSupportChat(fallbackMerchantId?: string) {
  const profile = uni.getStorageSync('merchantProfile') || {}
  const merchantId =
    getMerchantId() || String(fallbackMerchantId || profile.phone || '')
  if (!merchantId) {
    uni.showToast({ title: '商户身份异常', icon: 'none' })
    return
  }
  navigateToChat({
    chatId: `merchant_${merchantId}`,
    role: 'admin',
    targetId: String(merchantId),
  })
}
