export function statsHasPendingCount(result) {
  return result && result.status === 'fulfilled' && Number.isFinite(Number(result.value?.pendingOrdersCount))
}

export function normalizeBizType(order) {
  const value = String(order?.bizType || order?.biz_type || '').trim().toLowerCase()
  return value === 'groupbuy' ? 'groupbuy' : 'takeout'
}

export function canQuickDispatch(order) {
  if (!order) return false
  if (String(order.status || '').trim().toLowerCase() !== 'pending') return false
  if (normalizeBizType(order) === 'groupbuy') return false
  const riderId = String(order.rider_id || '').trim()
  const riderName = String(order.rider_name || '').trim()
  const riderPhone = String(order.rider_phone || '').trim()
  return !riderId && !riderName && !riderPhone
}

export function toBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const text = String(value || '').trim().toLowerCase()
  if (['1', 'true', 'yes', 'y'].includes(text)) return true
  if (['0', 'false', 'no', 'n', ''].includes(text)) return false
  return Boolean(value)
}

export function normalizeAfterSalesRecord(raw = {}) {
  return {
    id: String(raw.id || ''),
    requestNo: String(raw.requestNo || raw.request_no || ''),
    orderNo: String(raw.orderNo || raw.order_no || ''),
    typeText: String(raw.typeText || raw.type || ''),
    status: String(raw.status || 'pending'),
    statusText: String(raw.statusText || raw.status || '待处理'),
    requestedRefundAmount: Number(raw.requestedRefundAmount ?? raw.requested_refund_amount ?? 0) || 0,
    shouldRefund: toBoolean(raw.shouldRefund ?? raw.should_refund ?? false),
    refundAmount: Number(raw.refundAmount ?? raw.refund_amount ?? 0) || 0,
    refundReason: String(raw.refundReason || raw.refund_reason || ''),
    refundTransactionId: String(raw.refundTransactionId || raw.refund_transaction_id || ''),
    adminRemark: String(raw.adminRemark || raw.admin_remark || ''),
    createdAt: raw.createdAt || raw.created_at || '',
    created_at: raw.created_at || raw.createdAt || ''
  }
}

export function getAfterSalesStatusClass(status) {
  const value = String(status || '').trim().toLowerCase()
  if (value === 'completed' || value === 'approved') return 'status-success'
  if (value === 'rejected') return 'status-danger'
  if (value === 'processing') return 'status-warning'
  return 'status-default'
}

export function resolveAdminName(userKey) {
  try {
    const raw = uni.getStorageSync(userKey)
    if (!raw) return 'admin'

    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.name || parsed?.phone || 'admin'
  } catch (error) {
    return 'admin'
  }
}

export function fenToYuan(fen) {
  return (Math.abs(Number(fen || 0)) / 100).toFixed(2)
}

export function yuanToFen(yuan) {
  const text = String(yuan || '').trim()
  if (!text || !/^\d+(\.\d{1,2})?$/.test(text)) return 0
  return Math.round(Number(text) * 100)
}

export function formatOrderAmount(raw) {
  const num = Number(raw || 0)
  if (!Number.isFinite(num) || num <= 0) return '金额待定'
  return `¥${num.toFixed(2)}`
}

export function formatTemperature(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return '--'
  if (/^-?\d+(\.\d+)?$/.test(text)) return `${text}°C`
  if (text.includes('°')) return text
  return text
}

export function formatDateTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

export function toTime(value) {
  const date = new Date(value)
  const ts = date.getTime()
  return Number.isNaN(ts) ? 0 : ts
}

export function getErrorMessage(err, fallback = '操作失败') {
  const message = String(err?.message || '').trim()
  return message || fallback
}

export function confirmAction(title, content) {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false)
    })
  })
}
