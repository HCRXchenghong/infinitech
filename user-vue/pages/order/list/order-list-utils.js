import {
  getOrderStatusClass,
  getOrderStatusText,
  normalizeAfterSalesItem,
  normalizeBizType,
  normalizeOrderListItem,
  normalizeOrderStatus,
} from '@/shared-ui/platform-schema.js'

export {
  getOrderStatusClass as orderStatusClass,
  getOrderStatusText as orderStatusText,
  normalizeBizType,
  normalizeOrderStatus as parseStatus,
}

export function mapOrderItem(order) {
  return normalizeOrderListItem(order)
}

export function mapAfterSalesItem(item) {
  return normalizeAfterSalesItem(item)
}
