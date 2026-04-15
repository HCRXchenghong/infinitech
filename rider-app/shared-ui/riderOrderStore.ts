// 骑手订单状态管理
import Vue from 'vue'
import { fetchRiderOrders, fetchRiderStats, acceptOrder as apiAcceptOrder, pickupOrder, deliverOrder, updateRiderStatus } from './api'

declare const uni: any
type RawOrder = Record<string, any>

const DEFAULT_REMAINING_MINUTES = 45

export interface RiderOrder {
  id: string
  orderNum: string
  status: 'pending' | 'delivering' | 'completed' // 待取货 | 配送中 | 已完成
  price: string
  shopName: string
  shopAddress: string
  shopPhone: string
  merchantPhone: string
  shopDistance: string
  shopLatitude: number | null
  shopLongitude: number | null
  customerAddress: string
  customerPhone: string
  customerPhoneTail: string
  customerDistance: string
  customerLatitude: number | null
  customerLongitude: number | null
  items: string
  remainingTime: number // 剩余送达时间（分钟）
  totalDistance: string
  timeLeft: string // 预计送达时间
  createTime: string
  pickupTime?: string // 取餐时间
  deliveryTime?: string // 送达时间
}

export interface NewOrder {
  id: string
  price: string
  totalDistance: string
  totalDistanceText: string
  timeLeft: string
  isHighPrice: boolean
  isNearDistance: boolean
  isRouteFriendly: boolean
  routeLabel: string
  priceDesc: string
  shopName: string
  shopAddress: string
  shopDistance: string
  shopDistanceText: string
  customerAddress: string
  customerPhoneTail: string
  customerDistance: string
  customerDistanceText: string
  countdown: number // 订单失效倒计时（秒）
}

interface RiderState {
  isOnline: boolean // 是否在线听单
  todayEarnings: string // 今日收入
  completedCount: number // 今日完成单数
  myOrders: RiderOrder[] // 我的任务订单
  newOrders: NewOrder[] // 抢单大厅订单
  earningsLog: Array<{
    source: string
    amount: string
    time: string
  }>
}

const state = Vue.observable({
  isOnline: false,
  todayEarnings: '0',
  completedCount: 0,
  myOrders: [],
  newOrders: [],
  earningsLog: []
}) as RiderState

function toArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

function pickNumber(...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const num = Number(value)
    if (!Number.isNaN(num) && Number.isFinite(num)) return num
  }
  return null
}

function pickString(...values: any[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue
    const text = String(value).trim()
    if (text) return text
  }
  return ''
}

function normalizeId(value: any): string {
  return pickString(value)
}

function pickCoordinate(min: number, max: number, ...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const num = Number(value)
    if (!Number.isNaN(num) && Number.isFinite(num) && num >= min && num <= max) return num
  }
  return null
}

function formatMoney(amount: number | null): string {
  if (amount === null) return '0'
  const fixed = amount.toFixed(2)
  return fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed
}

function formatDistance(distanceKm: number): string {
  const rounded = Math.round(distanceKm * 10) / 10
  const fixed = rounded.toFixed(1)
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed
}

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num))
}

function parseDateValue(value: any): Date | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function settlePromise<T>(promise: Promise<T>) {
  return promise
    .then((value) => ({ status: 'fulfilled' as const, value }))
    .catch((reason) => ({ status: 'rejected' as const, reason }))
}

function formatDateTime(value: any): string {
  const date = parseDateValue(value)
  if (!date) return ''
  const MM = String(date.getMonth() + 1).padStart(2, '0')
  const DD = String(date.getDate()).padStart(2, '0')
  const HH = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${MM}-${DD} ${HH}:${mm}`
}

function parsePhoneTail(order: RawOrder): string {
  const phone = pickString(order.customer_phone, order.customerPhone, order.delivery_phone, order.deliveryPhone)
  const digits = phone.replace(/\D/g, '')
  if (!digits) return '--'
  return digits.slice(-4)
}

function parseCustomerPhone(order: RawOrder): string {
  return pickString(order.customer_phone, order.customerPhone, order.delivery_phone, order.deliveryPhone)
}

function parseMerchantPhone(order: RawOrder): string {
  return pickString(order.shop_phone, order.shopPhone, order.merchant_phone, order.merchantPhone)
}

function normalizeItems(items: any): string {
  if (Array.isArray(items)) {
    return items
      .map((item: any) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const name = pickString(item.name, item.title)
          const qty = pickNumber(item.qty, item.quantity, item.count)
          if (!name) return ''
          return qty && qty > 1 ? `${name}x${qty}` : name
        }
        return ''
      })
      .filter(Boolean)
      .join('、')
  }

  if (typeof items === 'string') {
    const text = items.trim()
    if (!text) return '订单商品'
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        const fromArray = normalizeItems(parsed)
        if (fromArray) return fromArray
      }
    } catch (err) {
      // keep original string when not JSON.
    }
    return text
  }

  return '订单商品'
}

function withFallback(value: string, fallback: string): string {
  return value ? value : fallback
}

function resolveShopName(order: RawOrder): string {
  return pickString(
    order.shop_name,
    order.shopName,
    order.food_shop,
    order.merchant_name,
    order.merchantName
  )
}

function resolveShopAddress(order: RawOrder): string {
  return pickString(
    order.shop_address,
    order.shopAddress,
    order.pickup_address,
    order.pickupAddress,
    order.food_shop,
    order.merchant_address,
    order.merchantAddress
  )
}

function resolveCustomerAddress(order: RawOrder): string {
  return pickString(
    order.address,
    order.customer_address,
    order.customerAddress,
    order.delivery_request,
    order.deliveryRequest,
    order.errand_location,
    order.errandLocation,
    order.dorm_number,
    order.dormNumber
  )
}

function resolveShopCoordinates(order: RawOrder) {
  return {
    latitude: pickCoordinate(
      -90,
      90,
      order.shop_latitude,
      order.shopLatitude,
      order.pickup_latitude,
      order.pickupLatitude,
      order.shop_lat,
      order.pickupLat
    ),
    longitude: pickCoordinate(
      -180,
      180,
      order.shop_longitude,
      order.shopLongitude,
      order.pickup_longitude,
      order.pickupLongitude,
      order.shop_lng,
      order.pickupLng
    )
  }
}

function resolveCustomerCoordinates(order: RawOrder) {
  return {
    latitude: pickCoordinate(
      -90,
      90,
      order.customer_latitude,
      order.customerLatitude,
      order.delivery_latitude,
      order.deliveryLatitude,
      order.address_latitude,
      order.addressLatitude,
      order.latitude,
      order.lat,
      order.customer_lat,
      order.deliveryLat
    ),
    longitude: pickCoordinate(
      -180,
      180,
      order.customer_longitude,
      order.customerLongitude,
      order.delivery_longitude,
      order.deliveryLongitude,
      order.address_longitude,
      order.addressLongitude,
      order.longitude,
      order.lng,
      order.customer_lng,
      order.deliveryLng
    )
  }
}

function normalizeDistances(order: RawOrder) {
  let totalDistanceKm = pickNumber(
    order.total_distance_km,
    order.total_distance,
    order.totalDistance,
    order.distance
  )
  if (totalDistanceKm !== null && totalDistanceKm > 50) {
    totalDistanceKm = totalDistanceKm / 1000
  }

  let shopDistanceMeters = pickNumber(
    order.shop_distance_m,
    order.shop_distance,
    order.shopDistance,
    order.pickup_distance,
    order.pickupDistance
  )

  let customerDistanceKm = pickNumber(
    order.customer_distance_km,
    order.customer_distance,
    order.customerDistance,
    order.delivery_distance,
    order.deliveryDistance
  )
  if (customerDistanceKm !== null && customerDistanceKm > 50) {
    customerDistanceKm = customerDistanceKm / 1000
  }

  if (totalDistanceKm === null && shopDistanceMeters !== null && customerDistanceKm !== null) {
    totalDistanceKm = shopDistanceMeters / 1000 + customerDistanceKm
  }

  return {
    shopDistanceMeters: shopDistanceMeters || 0,
    customerDistanceKm: customerDistanceKm || 0,
    totalDistanceKm: totalDistanceKm || 0,
    hasShopDistance: shopDistanceMeters !== null,
    hasCustomerDistance: customerDistanceKm !== null,
    hasTotalDistance: totalDistanceKm !== null
  }
}

function parseMinutesLeft(order: RawOrder, createdAt: Date | null): number {
  const direct = pickNumber(
    order.remaining_time,
    order.remainingTime,
    order.time_left,
    order.timeLeft,
    order.estimated_time,
    order.estimatedTime
  )
  if (direct !== null) return clamp(Math.round(direct), 1, 180)

  if (!createdAt) return DEFAULT_REMAINING_MINUTES
  const elapsedMinutes = Math.floor((Date.now() - createdAt.getTime()) / 60000)
  return clamp(DEFAULT_REMAINING_MINUTES - elapsedMinutes, 5, DEFAULT_REMAINING_MINUTES)
}

function normalizeRiderStatus(status: any): 'pending' | 'delivering' | 'completed' {
  const value = pickString(status).toLowerCase()
  if (value === 'completed') return 'completed'
  if (value === 'delivering') return 'delivering'
  if (value === 'accepted' || value === 'pending' || value === 'priced') return 'pending'
  return 'pending'
}

function normalizeRiderOrder(order: RawOrder): RiderOrder {
  const createdAt = parseDateValue(order.created_at || order.createdAt)
  const minutesLeft = parseMinutesLeft(order, createdAt)
  const distances = normalizeDistances(order)
  const shopCoordinates = resolveShopCoordinates(order)
  const customerCoordinates = resolveCustomerCoordinates(order)
  const priceAmount = pickNumber(
    order.delivery_fee,
    order.deliveryFee,
    order.rider_quoted_price,
    order.riderQuotedPrice,
    order.total_price,
    order.totalPrice,
    order.price
  )

  return {
    id: normalizeId(order.id || order.uid || order.legacyId || order.order_id),
    orderNum: pickString(order.daily_order_id, order.dailyOrderId, order.order_num, order.orderNum, order.id),
    status: normalizeRiderStatus(order.status),
    price: formatMoney(priceAmount),
    shopName: withFallback(resolveShopName(order), '商家信息缺失'),
    shopAddress: withFallback(resolveShopAddress(order), '取货地址缺失'),
    shopPhone: parseMerchantPhone(order),
    merchantPhone: parseMerchantPhone(order),
    shopDistance: distances.hasShopDistance ? String(Math.round(distances.shopDistanceMeters)) : '',
    shopLatitude: shopCoordinates.latitude,
    shopLongitude: shopCoordinates.longitude,
    customerAddress: withFallback(resolveCustomerAddress(order), '送达地址缺失'),
    customerPhone: parseCustomerPhone(order),
    customerPhoneTail: parsePhoneTail(order),
    customerDistance: distances.hasCustomerDistance ? formatDistance(distances.customerDistanceKm) : '',
    customerLatitude: customerCoordinates.latitude,
    customerLongitude: customerCoordinates.longitude,
    items: normalizeItems(order.items || order.food_request),
    remainingTime: minutesLeft,
    totalDistance: distances.hasTotalDistance ? formatDistance(distances.totalDistanceKm) : '--',
    timeLeft: String(minutesLeft),
    createTime: formatDateTime(order.created_at || order.createdAt),
    pickupTime: formatDateTime(order.accepted_at || order.acceptedAt),
    deliveryTime: formatDateTime(order.completed_at || order.completedAt)
  }
}

function normalizeAvailableOrder(order: RawOrder): NewOrder {
  const createdAt = parseDateValue(order.created_at || order.createdAt)
  const expiresAt = parseDateValue(order.expires_at || order.expiresAt)
  const distances = normalizeDistances(order)
  const minutesLeft = parseMinutesLeft(order, createdAt)
  const priceAmount = pickNumber(
    order.delivery_fee,
    order.deliveryFee,
    order.rider_quoted_price,
    order.riderQuotedPrice,
    order.total_price,
    order.totalPrice,
    order.price
  )

  const directCountdown = pickNumber(order.countdown, order.remaining_seconds, order.remainingSeconds)
  let countdown = directCountdown !== null ? Math.round(directCountdown) : 0
  if (countdown <= 0 && expiresAt) {
    countdown = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  }
  if (countdown <= 0 && createdAt) {
    countdown = Math.max(0, 120 - Math.floor((Date.now() - createdAt.getTime()) / 1000))
  }
  if (countdown <= 0) countdown = 60

  const isNearDistance = distances.hasTotalDistance && distances.totalDistanceKm <= 2.5
  const isRouteFriendly = isNearDistance || (distances.hasShopDistance && distances.shopDistanceMeters <= 800)

  return {
    id: normalizeId(order.id || order.uid || order.legacyId || order.order_id),
    price: formatMoney(priceAmount),
    totalDistance: distances.hasTotalDistance ? formatDistance(distances.totalDistanceKm) : '--',
    totalDistanceText: distances.hasTotalDistance ? `${formatDistance(distances.totalDistanceKm)}km` : '--',
    timeLeft: String(minutesLeft),
    isHighPrice: (priceAmount || 0) >= 15,
    isNearDistance,
    isRouteFriendly,
    routeLabel: isRouteFriendly ? '顺路单' : '',
    priceDesc: pickString(order.price_desc, order.priceDesc),
    shopName: withFallback(resolveShopName(order), '商家信息缺失'),
    shopAddress: withFallback(resolveShopAddress(order), '取货地址缺失'),
    shopDistance: distances.hasShopDistance ? String(Math.round(distances.shopDistanceMeters)) : '',
    shopDistanceText: distances.hasShopDistance ? `${Math.round(distances.shopDistanceMeters)}m` : '--',
    customerAddress: withFallback(resolveCustomerAddress(order), '送达地址缺失'),
    customerPhoneTail: parsePhoneTail(order),
    customerDistance: distances.hasCustomerDistance ? formatDistance(distances.customerDistanceKm) : '',
    customerDistanceText: distances.hasCustomerDistance ? `${formatDistance(distances.customerDistanceKm)}km` : '--',
    countdown
  }
}

export async function toggleOnlineStatus() {
  const newStatus = !state.isOnline

  try {
    await updateRiderStatus(newStatus)
    state.isOnline = newStatus

    if (!state.isOnline) {
      state.newOrders = []
    } else {
      await loadAvailableOrders()
    }

    uni.showToast({
      title: newStatus ? '已开工' : '已停工',
      icon: 'success'
    })
  } catch (err) {
    console.error('更新在线状态失败:', err)
    uni.showToast({
      title: '操作失败，请检查网络',
      icon: 'none'
    })
    throw err
  }
}

export async function grabOrder(orderId: string) {
  try {
    await apiAcceptOrder(String(orderId))
    state.newOrders = state.newOrders.filter(o => o.id !== orderId)
    await loadRiderData()
  } catch (err) {
    console.error('抢单失败:', err)
    throw err
  }
}

export async function advanceTask(taskId: string) {
  const task = state.myOrders.find(o => o.id === taskId)
  if (!task) return

  try {
    if (task.status === 'pending') {
      await pickupOrder(String(taskId))
      task.status = 'delivering'
    } else if (task.status === 'delivering') {
      await deliverOrder(String(taskId))
      state.myOrders = state.myOrders.filter(o => o.id !== taskId)
      await loadRiderData()
    }
  } catch (err) {
    console.error('任务推进失败:', err)
    throw err
  }
}

// 添加新订单到大厅
export function addNewOrder(order: NewOrder) {
  state.newOrders.push(order)
}

export async function acceptDispatch(orderData: any) {
  try {
    await apiAcceptOrder(String(orderData.id))
    await loadRiderData()
  } catch (err) {
    console.error('接受派单失败:', err)
    throw err
  }
}

export async function loadRiderData() {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return

  const [ordersResult, statsResult] = await Promise.all([
    settlePromise(fetchRiderOrders()),
    settlePromise(fetchRiderStats())
  ])

  if (ordersResult.status === 'fulfilled') {
    const orderList = toArray(ordersResult.value).map(normalizeRiderOrder)
    state.myOrders = orderList.filter((o: RiderOrder) => o.status !== 'completed')
  } else {
    console.error('加载骑手订单失败:', ordersResult.reason)
  }

  if (statsResult.status === 'fulfilled') {
    const stats: any = statsResult.value || {}
    state.todayEarnings = String(stats.todayEarnings || stats.today_earnings || '0')
    state.completedCount = Number(stats.completedCount || stats.completed_count || 0)

    // 用数据库持久化的开工状态恢复 UI，不受心跳超时影响
    if (typeof stats.isOnline === 'boolean') {
      state.isOnline = stats.isOnline
    }
  } else {
    console.error('加载骑手统计失败:', statsResult.reason)
  }
}

export async function loadAvailableOrders() {
  try {
    const orders = await fetchRiderOrders('available')
    state.newOrders = toArray(orders).map(normalizeAvailableOrder)
  } catch (err) {
    console.error('加载可用订单失败:', err)
  }
}

export default state
