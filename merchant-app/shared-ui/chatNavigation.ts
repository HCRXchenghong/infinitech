import { getMerchantId } from './merchantContext'
import { readMerchantAuthIdentity } from './auth-session.js'
import {
  navigateToRoleChat,
  resolveRoleChatOrderId,
} from '../../packages/mobile-core/src/role-chat-navigation.js'

function resolveOrderId(order: any) {
  return resolveRoleChatOrderId(order)
}

export function openMerchantUserChat(order: any) {
  const orderId = resolveOrderId(order)
  if (!orderId) {
    uni.showToast({ title: '订单信息异常', icon: 'none' })
    return
  }
  const name = order?.customer_name || order?.customer_phone || '用户会话'
  const targetId = order?.customer_id || order?.customer_phone || ''
  navigateToRoleChat(uni, {
    baseUrl: '/pages/messages/chat',
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
  navigateToRoleChat(uni, {
    baseUrl: '/pages/messages/chat',
    chatId: `rs_${orderId}`,
    role: 'rider',
    name,
    targetId: String(targetId || ''),
    orderId,
  })
}

export function openMerchantSupportChat(fallbackMerchantId?: string) {
  const auth = readMerchantAuthIdentity({ uniApp: uni })
  const merchantId =
    getMerchantId() || String(fallbackMerchantId || auth.merchantPhone || '')
  if (!merchantId) {
    uni.showToast({ title: '商户身份异常', icon: 'none' })
    return
  }
  navigateToRoleChat(uni, {
    baseUrl: '/pages/messages/chat',
    chatId: `merchant_${merchantId}`,
    role: 'admin',
    targetId: String(merchantId),
  })
}
