export const ORDER_TYPE_OPTIONS = ['外卖类', '团购类', '混合类']

export const BUSINESS_CATEGORY_OPTIONS = [
  '美食',
  '团购',
  '甜点饮品',
  '超市便利',
  '休闲娱乐',
  '生活服务',
]

export const MERCHANT_TYPE_OPTION_DETAILS = [
  { key: 'takeout', label: '外卖', aliases: ['外卖', '外卖类'] },
  { key: 'groupbuy', label: '团购', aliases: ['团购', '团购类', '到店团购'] },
  { key: 'hybrid', label: '混合', aliases: ['混合', '混合类'] },
]

export const BUSINESS_CATEGORY_OPTION_DETAILS = [
  { key: 'food', label: '美食', aliases: ['美食'] },
  { key: 'groupbuy', label: '团购', aliases: ['团购'] },
  { key: 'dessert_drinks', label: '甜点饮品', aliases: ['甜点饮品'] },
  { key: 'supermarket_convenience', label: '超市便利', aliases: ['超市便利'] },
  { key: 'leisure_entertainment', label: '休闲娱乐', aliases: ['休闲娱乐', '休闲玩乐'] },
  { key: 'life_services', label: '生活服务', aliases: ['生活服务'] },
]

const GROUPBUY_STATUSES = new Set([
  'pending_payment',
  'paid_unused',
  'redeemed',
  'refunding',
  'refunded',
  'expired',
  'cancelled',
])

const TAKEOUT_STATUSES = new Set([
  'pending',
  'accepted',
  'delivering',
  'completed',
  'cancelled',
  'priced',
])

const AFTER_SALES_STATUSES = new Set(['pending', 'processing', 'approved', 'completed', 'rejected'])

function normalizeText(value) {
  return String(value || '').trim()
}

export function normalizeMerchantType(value) {
  const raw = normalizeText(value).toLowerCase()
  if (!raw) {
    return 'takeout'
  }
  if (['groupbuy', '团购', '团购类', '到店团购'].includes(raw)) {
    return 'groupbuy'
  }
  if (['hybrid', '混合', '混合类'].includes(raw)) {
    return 'hybrid'
  }
  return 'takeout'
}

export function normalizeBizType(value) {
  const raw = normalizeText(value).toLowerCase()
  if (['groupbuy', '团购', '团购类', '到店团购'].includes(raw)) {
    return 'groupbuy'
  }
  if (['errand', '跑腿', '代买', '代取'].includes(raw)) {
    return 'errand'
  }
  return 'takeout'
}

export function normalizeOrderTypeLabel(value) {
  const merchantType = normalizeMerchantType(value)
  if (merchantType === 'groupbuy') {
    return '团购类'
  }
  if (merchantType === 'hybrid') {
    return '混合类'
  }
  return '外卖类'
}

export function merchantTypeFromOrderType(value) {
  return normalizeMerchantType(value)
}

function normalizeAliasList(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => normalizeText(item))
    .filter(Boolean)
}

function normalizeTaxonomyOptions(source, fallbackItems) {
  const items = Array.isArray(source) && source.length ? source : fallbackItems
  return items
    .map((item, index) => {
      const sourceItem = item && typeof item === 'object' ? item : {}
      const fallback = fallbackItems.find((candidate) => normalizeText(candidate.key) === normalizeText(sourceItem.key)) || {}
      return {
        key: normalizeText(sourceItem.key || fallback.key),
        label: normalizeText(sourceItem.label || fallback.label),
        enabled: sourceItem.enabled !== false,
        sort_order: Number(sourceItem.sort_order || fallback.sort_order || (index + 1) * 10),
        aliases: normalizeAliasList(sourceItem.aliases).length
          ? normalizeAliasList(sourceItem.aliases)
          : normalizeAliasList(fallback.aliases)
      }
    })
    .filter((item) => item.key && item.label)
    .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
}

function legacyOrderTypeLabelForKey(key) {
  const normalized = normalizeText(key).toLowerCase()
  if (normalized === 'groupbuy') return '团购类'
  if (normalized === 'hybrid') return '混合类'
  return '外卖类'
}

export function buildMerchantTypeOptions(taxonomySettings = null) {
  const runtimeSettings = taxonomySettings && typeof taxonomySettings === 'object' ? taxonomySettings : {}
  const source = normalizeTaxonomyOptions(runtimeSettings.merchant_types, MERCHANT_TYPE_OPTION_DETAILS)
  return source
    .filter((item) => item.enabled !== false)
    .map((item) => {
      const orderTypeLabel = item.label.endsWith('类') ? item.label : `${item.label}类`
      const legacyOrderTypeLabel = legacyOrderTypeLabelForKey(item.key)
      return {
        ...item,
        orderTypeLabel,
        legacyOrderTypeLabel,
        matchValues: [
          item.key,
          item.label,
          orderTypeLabel,
          legacyOrderTypeLabel,
          ...normalizeAliasList(item.aliases)
        ].map((entry) => normalizeText(entry).toLowerCase())
      }
    })
}

export function buildBusinessCategoryOptions(taxonomySettings = null) {
  const runtimeSettings = taxonomySettings && typeof taxonomySettings === 'object' ? taxonomySettings : {}
  return normalizeTaxonomyOptions(runtimeSettings.business_categories, BUSINESS_CATEGORY_OPTION_DETAILS)
    .filter((item) => item.enabled !== false)
    .map((item) => ({
      ...item,
      matchValues: [
        item.key,
        item.label,
        ...normalizeAliasList(item.aliases)
      ].map((entry) => normalizeText(entry).toLowerCase())
    }))
}

export function resolveMerchantTypeOption(value, taxonomySettings = null) {
  const normalizedValue = normalizeText(value).toLowerCase()
  const options = buildMerchantTypeOptions(taxonomySettings)
  return options.find((item) => item.matchValues.includes(normalizedValue)) || options[0] || {
    ...MERCHANT_TYPE_OPTION_DETAILS[0],
    orderTypeLabel: ORDER_TYPE_OPTIONS[0],
    legacyOrderTypeLabel: ORDER_TYPE_OPTIONS[0],
    matchValues: []
  }
}

export function resolveBusinessCategoryOption(value, taxonomySettings = null) {
  const normalizedValue = normalizeText(value).toLowerCase()
  const options = buildBusinessCategoryOptions(taxonomySettings)
  return options.find((item) => item.matchValues.includes(normalizedValue)) || options[0] || {
    ...BUSINESS_CATEGORY_OPTION_DETAILS[0],
    matchValues: []
  }
}

export function normalizeBusinessCategoryKey(value, taxonomySettings = null) {
  return resolveBusinessCategoryOption(value, taxonomySettings).key
}

export function getBusinessCategoryLabelByKey(value, taxonomySettings = null) {
  return resolveBusinessCategoryOption(value, taxonomySettings).label
}

export function normalizeBusinessCategory(value, taxonomySettings = null) {
  return resolveBusinessCategoryOption(value, taxonomySettings).label
}

export function normalizeOrderStatus(status, bizType = 'takeout', options = {}) {
  if (options.afterSales) {
    const raw = normalizeText(status).toLowerCase()
    if (AFTER_SALES_STATUSES.has(raw)) {
      return raw
    }
    if (raw.includes('处理中')) return 'processing'
    if (raw.includes('已通过') || raw.includes('完成')) return 'approved'
    if (raw.includes('拒绝')) return 'rejected'
    return 'pending'
  }

  const normalizedBizType = normalizeBizType(bizType)
  const raw = normalizeText(status).toLowerCase()

  if (normalizedBizType === 'groupbuy') {
    if (GROUPBUY_STATUSES.has(raw)) {
      return raw
    }
    if (raw.includes('核销')) {
      return raw.includes('已') ? 'redeemed' : 'paid_unused'
    }
    if (raw.includes('退款')) {
      return raw.includes('中') ? 'refunding' : 'refunded'
    }
    if (raw.includes('过期')) return 'expired'
    if (raw.includes('取消')) return 'cancelled'
    if (raw.includes('支付')) return 'pending_payment'
    return 'paid_unused'
  }

  if (TAKEOUT_STATUSES.has(raw)) {
    return raw
  }
  if (raw.includes('送达') || raw.includes('完成')) return 'completed'
  if (raw.includes('取消')) return 'cancelled'
  if (raw.includes('配送') || raw.includes('进行') || raw.includes('接单')) return 'delivering'
  if (raw.includes('待付款') || raw.includes('待支付')) return 'priced'
  return 'pending'
}

export function getOrderStatusText(status, bizType = 'takeout', options = {}) {
  const normalizedStatus = normalizeOrderStatus(status, bizType, options)

  if (options.afterSales) {
    const statusMap = {
      pending: '待处理',
      processing: '处理中',
      approved: '已通过',
      completed: '已完成',
      rejected: '已拒绝',
    }
    return statusMap[normalizedStatus] || normalizedStatus || '待处理'
  }

  if (normalizeBizType(bizType) === 'groupbuy') {
    const statusMap = {
      pending_payment: '待支付',
      paid_unused: '待核销',
      redeemed: '已核销',
      refunding: '退款中',
      refunded: '已退款',
      expired: '已过期',
      cancelled: '已取消',
    }
    return statusMap[normalizedStatus] || normalizedStatus || '待处理'
  }

  const statusMap = {
    pending: '待接单',
    accepted: '进行中',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
    priced: '待付款',
  }
  return statusMap[normalizedStatus] || normalizedStatus || '待处理'
}

export function getOrderStatusClass(status, bizType = 'takeout', options = {}) {
  const normalizedStatus = normalizeOrderStatus(status, bizType, options)

  if (options.afterSales) {
    if (normalizedStatus === 'pending') return 'status-pending'
    if (normalizedStatus === 'processing') return 'status-delivering'
    if (normalizedStatus === 'approved' || normalizedStatus === 'completed') return 'status-completed'
    return 'status-cancelled'
  }

  if (normalizeBizType(bizType) === 'groupbuy') {
    if (normalizedStatus === 'pending_payment') return 'status-pending'
    if (['paid_unused', 'refunding'].includes(normalizedStatus)) return 'status-delivering'
    if (['redeemed', 'refunded'].includes(normalizedStatus)) return 'status-completed'
    return 'status-cancelled'
  }

  if (['pending', 'pending_payment', 'priced'].includes(normalizedStatus)) return 'status-pending'
  if (['accepted', 'delivering'].includes(normalizedStatus)) return 'status-delivering'
  if (['completed'].includes(normalizedStatus)) return 'status-completed'
  return 'status-cancelled'
}

export function formatOrderListTime(timeStr) {
  if (!timeStr) return ''

  try {
    const date = new Date(timeStr)
    if (Number.isNaN(date.getTime())) {
      return String(timeStr)
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const orderDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const timeFormat = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

    if (orderDate.getTime() === today.getTime()) {
      return `${timeFormat} 下单`
    }
    if (orderDate.getTime() === yesterday.getTime()) {
      return `昨天 ${timeFormat}`
    }

    return `${date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}` +
      ` ${timeFormat}`
  } catch (_error) {
    return String(timeStr)
  }
}

export function formatDateTime(value) {
  if (!value) return ''

  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return String(value)
    }

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\//g, '-')
  } catch (_error) {
    return String(value)
  }
}

export function parseOrderProductList(order = {}) {
  let productList = []
  let itemCount = 1

  if (Array.isArray(order.productList)) {
    productList = order.productList
    itemCount = productList.length
  } else if (order.items) {
    if (typeof order.items === 'string') {
      try {
        const parsed = JSON.parse(order.items)
        if (Array.isArray(parsed)) {
          productList = parsed
          itemCount = parsed.length
        }
      } catch (_error) {
        itemCount = 1
      }
    } else if (Array.isArray(order.items)) {
      productList = order.items
      itemCount = order.items.length
    }
  }

  return { productList, itemCount }
}

export function extractProductImageUrls(productList) {
  if (!Array.isArray(productList) || productList.length === 0) {
    return ['/static/images/default-food.svg']
  }

  const imageUrls = productList
    .filter((item) => item && (item.image || item.img))
    .map((item) => item.image || item.img)
    .slice(0, 4)

  return imageUrls.length > 0 ? imageUrls : ['/static/images/default-food.svg']
}

export function normalizeShopProjection(item = {}) {
  const merchantType = normalizeMerchantType(item.merchantType || item.merchant_type || item.orderType || item.order_type)
  return {
    ...item,
    id: item.id || item.shopId || item.shop_id || '',
    legacyId: item.legacyId || item.shopId || item.shop_id || '',
    name: item.name || item.shopName || item.shop_name || '',
    logo: item.logo || item.shopLogo || item.shop_logo || '/static/images/default-shop.svg',
    coverImage: item.coverImage || item.cover_image || item.backgroundImage || item.background_image || '',
    merchantType,
    bizType: normalizeBizType(item.bizType || item.biz_type || merchantType),
    orderType: normalizeOrderTypeLabel(item.orderType || item.order_type || merchantType),
    businessCategory: normalizeBusinessCategory(item.businessCategory || item.business_category),
    deliveryTime: item.deliveryTime || item.delivery_time || '',
    isPromoted: Boolean(item.isPromoted),
    promoteLabel: item.promoteLabel || '',
    positionSource: item.positionSource || 'natural',
  }
}

export function normalizeFeaturedProductProjection(item = {}) {
  return {
    ...item,
    id: item.id || item.productId || item.product_id || '',
    legacyId: item.legacyId || item.productId || item.product_id || '',
    name: item.name || item.productName || item.product_name || item.title || '',
    shopId: item.shopId || item.shop_id || '',
    shopName: item.shopName || item.shop_name || '',
    price: Number(item.price || item.currentPrice || 0),
    originalPrice: Number(item.originalPrice || item.original_price || 0),
    image: item.image || item.productImage || item.imageUrl || item.image_url || '/static/images/default-food.svg',
    tag: item.tag || item.label || '',
    detail: item.detail || item.description || '',
    isPromoted: Boolean(item.isPromoted),
    promoteLabel: item.promoteLabel || '',
    positionSource: item.positionSource || 'featured',
  }
}

export function normalizeOrderListItem(order = {}) {
  const shop = order.shop && typeof order.shop === 'object' ? order.shop : {}
  const bizType = normalizeBizType(order.bizType || order.biz_type)
  const status = normalizeOrderStatus(order.status, bizType)
  const { productList, itemCount } = parseOrderProductList(order)

  return {
    id: order.id || order.daily_order_id,
    shopId: order.shopId || order.shop_id || shop.id || '',
    shopName: order.shopName || order.shop_name || shop.name || '未知商家',
    shopLogo: order.shopLogo || shop.logo || '/static/images/default-shop.svg',
    bizType,
    status,
    statusClass: getOrderStatusClass(status, bizType),
    statusText: order.statusText || order.status_text || getOrderStatusText(status, bizType),
    time: formatOrderListTime(order.time || order.created_at || order.createdAt),
    price: Number(order.price || order.total_price || order.totalPrice || 0),
    isReviewed:
      order.isReviewed === true ||
      order.is_reviewed === true ||
      order.isReviewed === 1 ||
      order.is_reviewed === 1 ||
      order.isReviewed === '1' ||
      order.is_reviewed === '1' ||
      order.isReviewed === 'true' ||
      order.is_reviewed === 'true',
    reviewedAt: order.reviewedAt || order.reviewed_at || '',
    itemCount,
    items: order.items || '订单商品',
    productList,
    imageUrls: extractProductImageUrls(productList),
  }
}

export function normalizeAfterSalesItem(item = {}) {
  const status = normalizeOrderStatus(item.status, 'takeout', { afterSales: true })
  const requestNo = item.requestNo || item.request_no || item.id

  return {
    id: `after_sales_${item.id || requestNo}`,
    afterSalesId: item.id,
    isAfterSales: true,
    shopId: item.shopId || item.shop_id || '',
    shopName: `售后申请 ${requestNo || ''}`.trim(),
    shopLogo: '/static/images/default-shop.svg',
    status,
    statusText: item.statusText || getOrderStatusText(status, 'takeout', { afterSales: true }),
    statusClass: getOrderStatusClass(status, 'takeout', { afterSales: true }),
    time: formatDateTime(item.createdAt || item.created_at || ''),
    price: '-',
    itemCount: 1,
    items: item.problemDesc || item.problem_desc || '售后申请',
    productList: Array.isArray(item.selectedProducts) ? item.selectedProducts : [],
    imageUrls: ['/static/images/default-food.svg'],
    adminRemark: item.adminRemark || item.admin_remark || '',
  }
}
