function normalizeBizType(value) {
  const s = String(value || '').toLowerCase();
  if (s === 'groupbuy' || s.includes('团购')) return 'groupbuy';
  return 'takeout';
}

function parseStatus(status, bizType) {
  const s = String(status || '').toLowerCase();
  if (bizType === 'groupbuy') {
    if (['pending_payment', 'paid_unused', 'redeemed', 'refunding', 'refunded', 'expired', 'cancelled'].includes(s)) return s;
    if (s.includes('核销')) return s.includes('已') ? 'redeemed' : 'paid_unused';
    if (s.includes('退款')) return s.includes('中') ? 'refunding' : 'refunded';
    if (s.includes('过期')) return 'expired';
    return 'paid_unused';
  }

  if (['pending', 'accepted', 'delivering', 'completed', 'cancelled', 'priced'].includes(s)) return s;
  if (s.includes('送达') || s.includes('完成')) return 'completed';
  if (s.includes('取消')) return 'cancelled';
  if (s.includes('配送') || s.includes('进行') || s.includes('接单')) return 'delivering';
  return 'pending';
}

function orderStatusText(status, bizType) {
  if (bizType === 'groupbuy') {
    const map = {
      pending_payment: '待支付',
      paid_unused: '待核销',
      redeemed: '已核销',
      refunding: '退款中',
      refunded: '已退款',
      expired: '已过期',
      cancelled: '已取消'
    };
    return map[status] || status || '待处理';
  }

  const map = {
    pending: '待接单',
    accepted: '进行中',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
    priced: '待付款'
  };
  return map[status] || status || '待处理';
}

function parseProductList(order) {
  let productList = [];
  let itemCount = 1;

  if (order.productList && Array.isArray(order.productList)) {
    productList = order.productList;
    itemCount = productList.length;
  } else if (order.items) {
    if (typeof order.items === 'string') {
      try {
        const parsed = JSON.parse(order.items);
        if (Array.isArray(parsed)) {
          productList = parsed;
          itemCount = parsed.length;
        }
      } catch (e) {
        itemCount = 1;
      }
    } else if (Array.isArray(order.items)) {
      productList = order.items;
      itemCount = order.items.length;
    }
  }

  return {
    productList,
    itemCount,
  };
}

function extractImageUrls(productList) {
  if (!Array.isArray(productList) || productList.length === 0) {
    return ['/static/images/default-food.svg'];
  }

  const imageUrls = productList
    .filter((item) => item.image || item.img)
    .map((item) => item.image || item.img)
    .slice(0, 4);

  return imageUrls.length > 0 ? imageUrls : ['/static/images/default-food.svg'];
}

function formatOrderListTime(timeStr) {
  if (!timeStr) return '';
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const orderDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeFormat = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    if (orderDate.getTime() === today.getTime()) {
      return timeFormat + ' 下单';
    }
    if (orderDate.getTime() === yesterday.getTime()) {
      return '昨天 ' + timeFormat;
    }
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace(/\//g, '-') + ' ' + timeFormat;
  } catch (e) {
    return timeStr;
  }
}

function formatAfterSalesTime(timeStr) {
  if (!timeStr) return '';
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return String(timeStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\//g, '-');
  } catch (error) {
    return String(timeStr);
  }
}

export function mapOrderItem(order) {
  const bizType = normalizeBizType(order.bizType || order.biz_type);
  const status = parseStatus(order.status, bizType);

  const { productList, itemCount } = parseProductList(order);
  const imageUrls = extractImageUrls(productList);

  return {
    id: order.id || order.daily_order_id,
    shopId: order.shopId || order.shop_id || order.shop?.id,
    shopName: order.shopName || order.shop_name || order.shop?.name || '未知商家',
    shopLogo: order.shopLogo || order.shop?.logo || '/static/images/default-shop.svg',
    bizType,
    status,
    statusText: order.statusText || order.status_text || orderStatusText(status, bizType),
    time: formatOrderListTime(order.time || order.created_at || order.createdAt),
    price: Number(order.price || order.total_price || order.totalPrice || 0),
    isReviewed: order.isReviewed === true || order.is_reviewed === true || order.isReviewed === 1 || order.is_reviewed === 1 || order.isReviewed === '1' || order.is_reviewed === '1' || order.isReviewed === 'true' || order.is_reviewed === 'true',
    reviewedAt: order.reviewedAt || order.reviewed_at || '',
    itemCount,
    items: order.items || '订单商品',
    productList,
    imageUrls,
  };
}

export function mapAfterSalesItem(item) {
  const createdAt = item.createdAt || item.created_at || '';
  const requestNo = item.requestNo || item.request_no || item.id;

  return {
    id: `after_sales_${item.id || requestNo}`,
    afterSalesId: item.id,
    isAfterSales: true,
    shopId: item.shopId || item.shop_id || '',
    shopName: `售后申请 ${requestNo || ''}`,
    shopLogo: '/static/images/default-shop.svg',
    status: item.status || 'pending',
    statusText: item.statusText || item.status || '待处理',
    time: formatAfterSalesTime(createdAt),
    price: '-',
    itemCount: 1,
    items: item.problemDesc || item.problem_desc || '售后申请',
    productList: Array.isArray(item.selectedProducts) ? item.selectedProducts : [],
    imageUrls: ['/static/images/default-food.svg'],
    adminRemark: item.adminRemark || item.admin_remark || ''
  };
}
