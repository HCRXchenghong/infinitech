import { recordPhoneContactClick, reportOrderException } from './api'
import { createPhoneContactHelper } from '../../packages/mobile-core/src/phone-contact.js'

declare const uni: any

const phoneContactHelper = createPhoneContactHelper({ recordPhoneContactClick })

function pickString(...values: any[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue
    const text = String(value).trim()
    if (text) return text
  }
  return ''
}

function pickLatitude(...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const num = Number(value)
    if (Number.isFinite(num) && num >= -90 && num <= 90) return num
  }
  return null
}

function pickLongitude(...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const num = Number(value)
    if (Number.isFinite(num) && num >= -180 && num <= 180) return num
  }
  return null
}

function showToast(title: string) {
  uni.showToast({ title, icon: 'none' })
}

function resolveTaskContactTargetId(task: any, targetRole: string): string {
  if (targetRole === 'merchant') {
    return pickString(task?.merchantId, task?.merchant_id, task?.shopId, task?.shop_id)
  }
  return pickString(task?.customerId, task?.customer_id, task?.userId, task?.user_id)
}

function buildTaskPhoneAuditPayload(task: any, phoneNumber: string, targetRole: string) {
  const orderId = resolveTaskId(task)
  return {
    targetRole,
    targetId: resolveTaskContactTargetId(task, targetRole),
    targetPhone: phoneNumber,
    entryPoint: 'rider_task',
    scene: 'task_contact',
    orderId,
    roomId: targetRole === 'merchant' ? `rs_${orderId}` : `rider_${orderId}`,
    pagePath: '/pages/tasks/index',
    metadata: {
      status: pickString(task?.status),
      shopId: pickString(task?.shopId, task?.shop_id),
      customerId: pickString(task?.customerId, task?.customer_id, task?.userId, task?.user_id),
      merchantId: pickString(task?.merchantId, task?.merchant_id),
    },
  }
}

function buildServiceUrl(chatId: string, role: string, name: string) {
  return `/pages/service/index?chatId=${encodeURIComponent(chatId)}&role=${encodeURIComponent(role)}&name=${encodeURIComponent(name)}`
}

function fallbackCopyAddress(address: string, fallbackText: string) {
  const content = pickString(address, fallbackText)
  if (!content) {
    showToast('缺少导航地址')
    return
  }

  uni.setClipboardData({
    data: content,
    success: () => {
      showToast('缺少坐标，地址已复制')
    },
    fail: () => {
      showToast('缺少坐标，请手动导航')
    },
  })
}

async function callPhoneNumber(phone: string, fallbackText: string, auditPayload?: Record<string, any>) {
  if (!/^1\d{10}$/.test(phone)) {
    showToast(fallbackText)
    return
  }

  try {
    await phoneContactHelper.makePhoneCall({
      ...auditPayload,
      targetPhone: phone,
    })
  } catch (_err) {
    showToast('拨号失败，请稍后重试')
  }
}

export function resolveTaskId(task: any): string {
  if (!task) return ''
  const value = task.id || task.orderId || task.order_id || task.daily_order_id
  return value === undefined || value === null ? '' : String(value).trim()
}

export function openCustomerChat(task: any) {
  const orderId = resolveTaskId(task)
  if (!orderId) {
    showToast('订单信息异常')
    return
  }

  uni.navigateTo({
    url: buildServiceUrl(`rider_${orderId}`, 'user', '顾客会话'),
  })
}

export function openMerchantChat(task: any) {
  const orderId = resolveTaskId(task)
  if (!orderId) {
    showToast('订单信息异常')
    return
  }

  const shopName = pickString(task?.shopName, '商家会话')
  uni.navigateTo({
    url: buildServiceUrl(`rs_${orderId}`, 'merchant', shopName),
  })
}

export function openTaskChat(task: any) {
  if (String(task?.status || '').toLowerCase() === 'pending') {
    openMerchantChat(task)
    return
  }
  openCustomerChat(task)
}

export function callTaskPhone(task: any) {
  const isPending = String(task?.status || '').toLowerCase() === 'pending'
  const merchantPhone = pickString(task?.merchantPhone, task?.shopPhone, task?.shop_phone, task?.merchant_phone)
  const customerPhone = pickString(task?.customerPhone, task?.customer_phone, task?.deliveryPhone, task?.delivery_phone)

  if (isPending) {
    const preferred = pickString(merchantPhone, customerPhone)
    void callPhoneNumber(
      preferred,
      merchantPhone ? '暂无完整手机号，请稍后重试' : '暂无商家电话，请使用在线消息',
      buildTaskPhoneAuditPayload(task, preferred, 'merchant')
    )
    return
  }

  void callPhoneNumber(
    customerPhone,
    '暂无完整手机号，请使用在线消息',
    buildTaskPhoneAuditPayload(task, customerPhone, 'user')
  )
}

export function navigateTask(task: any) {
  const isPending = String(task?.status || '').toLowerCase() === 'pending'
  const name = isPending
    ? pickString(task?.shopName, '取货点')
    : pickString(task?.deliveryName, task?.customerName, '送达点')
  const address = isPending
    ? pickString(task?.shopAddress, task?.shopName)
    : pickString(task?.customerAddress, task?.address, task?.deliveryAddress)

  const latitude = isPending
    ? pickLatitude(
        task?.shopLatitude,
        task?.pickupLatitude,
        task?.shopLat,
        task?.pickupLat,
        task?.shop_latitude,
        task?.pickup_latitude,
        task?.shop_lat
      )
    : pickLatitude(
        task?.customerLatitude,
        task?.deliveryLatitude,
        task?.addressLatitude,
        task?.customerLat,
        task?.deliveryLat,
        task?.customer_latitude,
        task?.delivery_latitude,
        task?.address_latitude,
        task?.latitude,
        task?.lat
      )
  const longitude = isPending
    ? pickLongitude(
        task?.shopLongitude,
        task?.pickupLongitude,
        task?.shopLng,
        task?.pickupLng,
        task?.shop_longitude,
        task?.pickup_longitude,
        task?.shop_lng
      )
    : pickLongitude(
        task?.customerLongitude,
        task?.deliveryLongitude,
        task?.addressLongitude,
        task?.customerLng,
        task?.deliveryLng,
        task?.customer_longitude,
        task?.delivery_longitude,
        task?.address_longitude,
        task?.longitude,
        task?.lng
      )

  if (latitude === null || longitude === null) {
    fallbackCopyAddress(address, name)
    return
  }

  uni.openLocation({
    latitude,
    longitude,
    name,
    address,
    scale: 16,
    fail: () => {
      fallbackCopyAddress(address, name)
    },
  })
}

export async function submitTaskException(task: any, reason: string, note = '') {
  const orderId = resolveTaskId(task)
  if (!orderId) {
    throw new Error('订单信息异常')
  }

  const trimmedReason = pickString(reason)
  if (!trimmedReason) {
    throw new Error('请选择异常原因')
  }

  const trimmedNote = pickString(note)
  return reportOrderException(orderId, {
    reason: trimmedReason,
    note: trimmedNote,
  })
}
