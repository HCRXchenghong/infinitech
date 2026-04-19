import { fetchRiderOrders, request as apiRequest } from '@/shared-ui/api'
import { readRiderAuthIdentity } from '@/shared-ui/auth-session.js'

export const serviceDataMethods = {
  resolveMessageTimestamp(rawValue: any, fallback = Date.now()) {
    const directValue = Number(rawValue)
    if (Number.isFinite(directValue) && directValue > 0) {
      return directValue
    }

    const text = String(rawValue || '').trim()
    if (!text) return fallback

    const parsedValue = Date.parse(text)
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback
  },

  resolveMessageId(payload: any, fallback: string) {
    const explicitId = payload?.id ?? payload?.uid ?? payload?.tsid ?? payload?.messageId
    if (explicitId !== undefined && explicitId !== null && String(explicitId).trim()) {
      return String(explicitId)
    }
    const timestamp = this.resolveMessageTimestamp(payload?.timestamp || payload?.createdAt, Date.now())
    const senderRole = String(payload?.senderRole || 'unknown').trim() || 'unknown'
    const senderId = String(payload?.senderId || 'unknown').trim() || 'unknown'
    const messageType = String(payload?.messageType || payload?.type || 'text').trim() || 'text'
    const contentSeed = String(payload?.content || '')
      .trim()
      .slice(0, 24)
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '')
    return `${fallback}_${senderRole}_${senderId}_${messageType}_${timestamp}_${contentSeed || 'empty'}`
  },

  createLocalMessageId(prefix = 'local', timestamp = Date.now()) {
    const nextSeed = Number(this.localMessageSeed || 0) + 1
    this.localMessageSeed = nextSeed
    return `${prefix}_${this.chatId || 'chat'}_${timestamp}_${nextSeed}`
  },

  normalizeIncomingMessage(payload: any, isSelf: boolean) {
    const type = payload?.messageType || payload?.type || 'text'
    const timestamp = this.resolveMessageTimestamp(payload?.timestamp || payload?.createdAt, Date.now())
    return {
      id: this.resolveMessageId(payload, `incoming_${this.chatId || 'chat'}_${timestamp}`),
      content: payload?.content || '',
      type,
      isSelf,
      sender: payload?.sender || '',
      senderId: payload?.senderId || '',
      senderRole: payload?.senderRole || '',
      avatar: payload?.avatar || '',
      timestamp,
      time: payload?.time || new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      coupon: payload?.coupon || null,
      order: type === 'order' ? this.normalizeOrder(payload?.order || payload?.content) : null,
      officialIntervention: !!payload?.officialIntervention,
      interventionLabel: payload?.interventionLabel || '官方介入'
    }
  },

  inferRoleByChatId(chatId: string) {
    const value = String(chatId || '')
    if (value.startsWith('rider_')) return 'user'
    if (value.startsWith('rs_')) return 'merchant'
    return 'admin'
  },

  inferTitleByRole(role: string) {
    const supportTitle = String(this?.supportChatTitle || '平台客服')
    if (role === 'user') return '顾客会话'
    if (role === 'merchant') return '商家会话'
    return supportTitle
  },

  defaultAvatarByRole(role: string) {
    if (role === 'user') return '/static/images/logo.png'
    if (role === 'merchant') return '/static/images/logo.png'
    return '/static/images/logo.png'
  },

  normalizeOrder(order: any) {
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
        : raw.deliveryFee !== undefined && raw.deliveryFee !== null
          ? raw.deliveryFee
          : raw.delivery_fee !== undefined && raw.delivery_fee !== null
            ? raw.delivery_fee
            : raw.totalPrice !== undefined && raw.totalPrice !== null
              ? raw.totalPrice
              : raw.total_price !== undefined && raw.total_price !== null
                ? raw.total_price
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
  },

  formatOrderNo(order: any) {
    if (!order) return '--'
    return order.orderNo || order.order_no || order.daily_order_id || order.id || '--'
  },

  formatOrderAmount(order: any) {
    if (!order) return '0.00'
    const sourceAmount = order.amount !== undefined && order.amount !== null
      ? order.amount
      : order.price !== undefined && order.price !== null
        ? order.price
        : order.deliveryFee !== undefined && order.deliveryFee !== null
          ? order.deliveryFee
          : order.delivery_fee !== undefined && order.delivery_fee !== null
            ? order.delivery_fee
            : order.totalPrice !== undefined && order.totalPrice !== null
              ? order.totalPrice
              : order.total_price !== undefined && order.total_price !== null
                ? order.total_price
                : 0
    const amount = Number(sourceAmount)
    return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
  },

  getOrderStatusText(order: any) {
    if (!order) return '订单信息'
    if (order.statusText) return order.statusText
    const status = order.status || ''
    const statusMap: Record<string, string> = {
      pending: '待接单',
      accepted: '已接单',
      delivering: '配送中',
      completed: '已完成',
      cancelled: '已取消'
    }
    return statusMap[status] || (status || '订单信息')
  },

  extractOrderList(data: any): any[] {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.orders)) return data.orders
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.data?.orders)) return data.data.orders
    return []
  },

  async loadRecentOrders() {
    if (!this.riderId) {
      this.recentOrders = []
      return
    }
    try {
      const [availableRes, riderRes] = await Promise.all([
        fetchRiderOrders('available'),
        fetchRiderOrders()
      ])

      let availableOrders = this.extractOrderList(availableRes)
        .map((item: any) => this.normalizeOrder(item))
        .filter((item: any) => item && item.id)
        .map((item: any) => ({ ...item, status: item.status || 'pending' }))

      let acceptedOrders = this.extractOrderList(riderRes)
        .map((item: any) => this.normalizeOrder(item))
        .filter((item: any) => {
          if (!item || !item.id) return false
          const status = String(item.status || '').toLowerCase()
          return status === 'accepted' || status === 'delivering' || status === 'picked_up'
        })

      if (availableOrders.length === 0 && acceptedOrders.length === 0) {
        const riderAuth = readRiderAuthIdentity({ uniApp: uni })
        const riderPhone = String(riderAuth.riderPhone || '')
        const [pendingRes, acceptedRes] = await Promise.all([
          apiRequest({ url: '/api/orders', method: 'GET', data: { status: 'pending', page: 1, limit: 200 } }),
          apiRequest({ url: '/api/orders', method: 'GET', data: { status: 'accepted', page: 1, limit: 200 } })
        ])

        const pendingOrders = this.extractOrderList(pendingRes)
          .map((item: any) => this.normalizeOrder(item))
          .filter((item: any) => item && item.id)
          .map((item: any) => ({ ...item, status: item.status || 'pending' }))

        const acceptedByRider = this.extractOrderList(acceptedRes)
          .filter((item: any) => {
            const itemRiderId = String(item.rider_id || item.riderId || '')
            const itemRiderPhone = String(item.rider_phone || item.riderPhone || '')
            return itemRiderId === String(this.riderId) ||
              (riderPhone && itemRiderPhone === riderPhone) ||
              itemRiderPhone === String(this.riderId)
          })
          .map((item: any) => this.normalizeOrder(item))
          .filter((item: any) => item && item.id)

        availableOrders = pendingOrders
        acceptedOrders = acceptedByRider
      }

      const merged = [...availableOrders, ...acceptedOrders]
      const uniqueMap: Record<string, any> = {}
      merged.forEach((item: any) => {
        uniqueMap[String(item.id)] = item
      })
      this.recentOrders = Object.values(uniqueMap).slice(0, 20)
    } catch (err) {
      this.recentOrders = []
    }
  },
}
