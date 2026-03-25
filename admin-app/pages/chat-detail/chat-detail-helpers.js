export function safeDecode(value) {
  try {
    return decodeURIComponent(value || '')
  } catch (err) {
    return value || ''
  }
}

export function normalizeChatId(value) {
  if (value === undefined || value === null) return ''
  return String(value)
}

export function normalizeRole(role) {
  const text = String(role || '').trim().toLowerCase()
  if (text === 'rider' || text === 'merchant') return text
  return 'user'
}

export function normalizeOrder(order) {
  if (!order) return null
  let raw = order
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch (err) {
      raw = {}
    }
  }
  if (!raw || typeof raw !== 'object') return null

  const sourceAmount = raw.amount !== undefined && raw.amount !== null
    ? raw.amount
    : raw.price !== undefined && raw.price !== null
      ? raw.price
      : raw.totalPrice !== undefined && raw.totalPrice !== null
        ? raw.totalPrice
        : raw.total_price !== undefined && raw.total_price !== null
          ? raw.total_price
          : raw.delivery_fee !== undefined && raw.delivery_fee !== null
            ? raw.delivery_fee
            : 0
  const amount = Number(sourceAmount)
  const id = raw.id || raw.orderId || raw.order_id || raw.daily_order_id || ''
  return {
    ...raw,
    id,
    orderNo: raw.orderNo || raw.order_no || raw.daily_order_id || String(id || ''),
    amount: Number.isFinite(amount) ? amount : 0,
    shopName: raw.shopName || raw.shop_name || raw.food_shop || '',
    status: raw.status || '',
    statusText: raw.statusText || raw.status_text || ''
  }
}

export function normalizeMessage(message, selfOverride) {
  const type = message.messageType || message.type || 'text'
  const order = type === 'order' ? normalizeOrder(message.order || message.content) : null
  return {
    id: message.id || Date.now(),
    text: message.content || message.text || '',
    self: typeof selfOverride === 'boolean' ? selfOverride : message.senderRole === 'admin',
    type,
    coupon: message.coupon || null,
    order,
    status: message.status || 'sent'
  }
}

export function formatOrderNo(order) {
  if (!order) return '--'
  return order.orderNo || order.order_no || order.daily_order_id || order.id || '--'
}

export function formatOrderAmount(order) {
  if (!order) return '0.00'
  const sourceAmount = order.amount !== undefined && order.amount !== null
    ? order.amount
    : order.price !== undefined && order.price !== null
      ? order.price
      : order.totalPrice !== undefined && order.totalPrice !== null
        ? order.totalPrice
        : order.total_price !== undefined && order.total_price !== null
          ? order.total_price
          : order.delivery_fee !== undefined && order.delivery_fee !== null
            ? order.delivery_fee
            : 0
  const amount = Number(sourceAmount)
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
}

export function getOrderStatusText(order) {
  if (!order) return '订单信息'
  if (order.statusText) return order.statusText
  const status = order.status || ''
  const statusMap = {
    pending: '待接单',
    accepted: '已接单',
    delivering: '配送中',
    priced: '待付款',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || (status || '订单信息')
}

export function getOrderList(res) {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.orders)) return res.orders
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res?.data?.orders)) return res.data.orders
  return []
}

export function matchRider(order, riderKey) {
  if (!riderKey) return true
  const riderId = String(order.rider_id || order.riderId || '')
  const riderPhone = String(order.rider_phone || order.riderPhone || '')
  return riderId === riderKey || riderPhone === riderKey
}
