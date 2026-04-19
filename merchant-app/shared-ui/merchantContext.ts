import { fetchMerchantShops } from './api'
import { readMerchantAuthIdentity, readMerchantAuthSession } from './auth-session.js'

declare const uni: any

const STORAGE_CURRENT_SHOP_ID = 'merchantCurrentShopId'

let cachedShops: any[] | null = null

export function getMerchantProfile() {
  const profile = readMerchantAuthSession({ uniApp: uni }).profile
  if (profile && typeof profile === 'object') {
    return profile
  }
  return null
}

export function getMerchantId(): string {
  return String(readMerchantAuthIdentity({ uniApp: uni }).merchantId || '')
}

export function getCurrentShopId(): string {
  return String(uni.getStorageSync(STORAGE_CURRENT_SHOP_ID) || '')
}

export function setCurrentShopId(shopId: string | number) {
  uni.setStorageSync(STORAGE_CURRENT_SHOP_ID, String(shopId))
}

export function clearMerchantContext() {
  cachedShops = null
  uni.removeStorageSync(STORAGE_CURRENT_SHOP_ID)
}

export function formatMoney(value: any) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '0.00'
  return num.toFixed(2)
}

export function orderStatusText(status: string, bizType: string = 'takeout') {
  const normalizedBizType = String(bizType || '').trim().toLowerCase() || 'takeout'
  if (normalizedBizType === 'groupbuy') {
    const groupbuyMap: Record<string, string> = {
      pending_payment: '待支付',
      paid_unused: '待核销',
      redeemed: '已核销',
      refunding: '退款中',
      refunded: '已退款',
      expired: '已过期',
      cancelled: '已取消',
    }
    return groupbuyMap[status] || status || '未知'
  }

  const takeoutMap: Record<string, string> = {
    pending: '待接单',
    accepted: '待出餐',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
    rejected: '已拒绝',
  }
  return takeoutMap[status] || status || '未知'
}

export function paymentStatusText(status: string) {
  const map: Record<string, string> = {
    unpaid: '未支付',
    paid: '已支付',
    refunded: '已退款',
  }
  return map[status] || status || '未知'
}

export function parseOrderItems(itemsText: string): Array<{ name: string; qty: number }> {
  const text = String(itemsText || '').trim()
  if (!text) return []
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/(.+?)\s*x(\d+)$/i)
      if (!m) {
        return { name: part, qty: 1 }
      }
      return {
        name: m[1].trim(),
        qty: Number(m[2]) || 1,
      }
    })
}

export async function ensureMerchantShops(force: boolean = false) {
  if (!force && cachedShops) {
    const currentShop = pickCurrentShop(cachedShops)
    return { shops: cachedShops, currentShop }
  }

  const merchantId = getMerchantId()
  if (!merchantId) {
    throw new Error('未找到商户身份信息，请重新登录')
  }

  const response: any = await fetchMerchantShops(merchantId)
  const shops = Array.isArray(response?.shops) ? response.shops : []
  cachedShops = shops
  const currentShop = pickCurrentShop(shops)
  return { shops, currentShop }
}

function pickCurrentShop(shops: any[]) {
  if (!Array.isArray(shops) || shops.length === 0) return null
  const currentShopId = getCurrentShopId()
  const matched = shops.find((shop) => String(shop.id) === currentShopId)
  if (matched) return matched

  const first = shops[0]
  if (first && first.id != null) {
    setCurrentShopId(first.id)
  }
  return first || null
}
