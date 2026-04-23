import { fetchRiderOrders, request as apiRequest } from '@/shared-ui/api'
import { readRiderAuthIdentity } from '@/shared-ui/auth-session.js'
import {
  createRoleChatLocalMessageId,
  formatRoleChatOrderAmount,
  formatRoleChatOrderNo,
  getRoleChatOrderStatusText,
  normalizeRoleChatOrder,
  resolveRoleChatMessageId,
  resolveRoleChatMessageTimestamp,
} from '../../../packages/mobile-core/src/role-chat-portal.js'

export const serviceDataMethods = {
  resolveMessageTimestamp(rawValue: any, fallback = Date.now()) {
    return resolveRoleChatMessageTimestamp(rawValue, fallback)
  },

  resolveMessageId(payload: any, fallback: string) {
    return resolveRoleChatMessageId(payload, fallback)
  },

  createLocalMessageId(prefix = 'local', timestamp = Date.now()) {
    const result = createRoleChatLocalMessageId({
      prefix,
      timestamp,
      chatId: this.chatId,
      seed: this.localMessageSeed,
    })
    this.localMessageSeed = result.seed
    return result.id
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
    return normalizeRoleChatOrder(order)
  },

  formatOrderNo(order: any) {
    return formatRoleChatOrderNo(order)
  },

  formatOrderAmount(order: any) {
    return formatRoleChatOrderAmount(order)
  },

  getOrderStatusText(order: any) {
    return getRoleChatOrderStatusText(order)
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
