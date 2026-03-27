export function normalizeOrder(order) {
  if (!order) return null;
  let raw = order;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      raw = {};
    }
  }
  if (typeof raw !== 'object') return null;

  const sourceAmount = raw.amount !== undefined && raw.amount !== null
    ? raw.amount
    : raw.price !== undefined && raw.price !== null
      ? raw.price
      : raw.totalPrice !== undefined && raw.totalPrice !== null
        ? raw.totalPrice
        : raw.total_price !== undefined && raw.total_price !== null
          ? raw.total_price
          : 0;

  const amount = Number(sourceAmount);
  const id = raw.id || raw.orderId || raw.order_id || raw.daily_order_id || '';

  return {
    ...raw,
    id,
    orderNo: raw.orderNo || raw.order_no || raw.daily_order_id || String(id || ''),
    amount: Number.isFinite(amount) ? amount : 0,
    shopName: raw.shopName || raw.shop_name || '',
    status: raw.status || '',
    statusText: raw.statusText || raw.status_text || ''
  };
}

export function normalizeIncomingMessage(payload, isSelf) {
  const type = payload && payload.messageType ? payload.messageType : (payload && payload.type ? payload.type : 'text');
  const timestamp = Number.isFinite(Number(payload && (payload.timestamp || payload.createdAt)))
    ? Number(payload.timestamp || payload.createdAt)
    : Date.now();
  return {
    id: payload && payload.id ? payload.id : Date.now(),
    content: payload ? payload.content : '',
    type,
    isSelf: !!isSelf,
    timestamp,
    time: payload && payload.time ? payload.time : new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    avatar: payload && payload.avatar ? payload.avatar : '',
    order: type === 'order' ? normalizeOrder(payload && (payload.order || payload.content)) : null
  };
}

export function formatOrderNo(order) {
  if (!order) return '--';
  return order.orderNo || order.order_no || order.daily_order_id || order.id || '--';
}

export function formatOrderAmount(order) {
  if (!order) return '0.00';
  const sourceAmount = order.amount !== undefined && order.amount !== null
    ? order.amount
    : order.price !== undefined && order.price !== null
      ? order.price
      : order.totalPrice !== undefined && order.totalPrice !== null
        ? order.totalPrice
        : order.total_price !== undefined && order.total_price !== null
          ? order.total_price
          : 0;

  const amount = Number(sourceAmount);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

export function getOrderStatusText(order) {
  if (!order) return '订单信息';
  if (order.statusText) return order.statusText;
  const status = order.status || '';
  const statusMap = {
    pending: '待接单',
    accepted: '进行中',
    priced: '待付款',
    completed: '已完成',
    cancelled: '已取消'
  };
  return statusMap[status] || (status || '订单信息');
}
