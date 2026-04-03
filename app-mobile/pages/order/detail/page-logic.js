import { fetchGroupbuyVouchers, fetchOrderDetail, fetchVoucherQRCode, recordPhoneContactClick, request } from '@/shared-ui/api.js'
import { canUseUserRTCContact, loadRTCRuntimeSettings } from '@/shared-ui/rtc-contact.js'
import {
  getClientPaymentErrorMessage,
  invokeClientPayment,
  isClientPaymentCancelled,
  shouldLaunchClientPayment
} from '@/shared-ui/client-payment.js'
import ContactModal from '@/components/ContactModal.vue'
import PhoneWarningModal from '@/components/PhoneWarningModal.vue'

import { createPhoneContactHelper } from '../../../../shared/mobile-common/phone-contact.js'

const phoneContactHelper = createPhoneContactHelper({ recordPhoneContactClick })
const CLIENT_PLATFORM = 'app'

function normalizePayChannel(raw) {
  const value = String(raw || '').trim().toLowerCase()
  if (value === 'if-pay' || value === 'if_pay' || value === 'balance') return 'ifpay'
  if (value === 'wxpay' || value === 'wechatpay') return 'wechat'
  if (value === 'ali') return 'alipay'
  return value
}

function fallbackPayMethods() {
  return [
    { value: 'ifpay', label: 'IF-Pay 余额支付', tip: '优先使用钱包余额' },
    { value: 'wechat', label: '微信支付', tip: '推荐微信用户选择' },
    { value: 'alipay', label: '支付宝支付', tip: '适合支付宝用户' }
  ]
}

function normalizePayMethods(response) {
  const rawOptions = Array.isArray(response?.options)
    ? response.options
    : Array.isArray(response?.data?.options)
      ? response.data.options
      : []

  const normalized = rawOptions
    .map((item) => {
      const value = normalizePayChannel(item?.channel)
      if (!value) return null
      return {
        value,
        label: String(item?.label || '').trim() || (
          value === 'ifpay'
            ? 'IF-Pay 余额支付'
            : value === 'wechat'
              ? '微信支付'
              : '支付宝支付'
        ),
        tip: String(item?.description || '').trim() || '由后台支付中心统一控制'
      }
    })
    .filter(Boolean)

  return normalized.length > 0 ? normalized : fallbackPayMethods()
}

function normalizePhoneNumber(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const parts = text.match(/\d+/g)
  return parts ? parts.join('') : text
}

function buildOrderPhoneAuditPayload(order, contactType, phoneNumber) {
  const targetRole = contactType === 'rider' ? 'rider' : 'merchant'
  return {
    targetRole,
    targetId: String(contactType === 'rider' ? (order?.riderId || '') : (order?.shopId || '')),
    targetPhone: normalizePhoneNumber(phoneNumber),
    entryPoint: 'order_detail',
    scene: 'order_contact',
    orderId: String(order?.id || ''),
    roomId: contactType === 'rider' ? `rider_${order?.id || ''}` : `shop_${order?.id || ''}`,
    pagePath: '/pages/order/detail/index',
    metadata: {
      bizType: order?.bizType || '',
      status: order?.status || '',
      shopId: String(order?.shopId || ''),
      riderId: String(order?.riderId || ''),
      contactType,
    }
  }
}

function buildOrderRTCContext(order, contactType) {
  const isRider = contactType === 'rider'
  const riderInfo = String((order?.deliveryInfo && order.deliveryInfo.rider) || '')
  const riderPhone = riderInfo.match(/1[3-9]\d{9}/)
  return {
    targetRole: isRider ? 'rider' : 'merchant',
    targetId: String(isRider ? (order?.riderId || '') : (order?.shopId || '')),
    targetName: isRider ? (riderInfo.split(' ')[0] || '骑手') : String(order?.shopName || '商家'),
    targetPhone: normalizePhoneNumber(
      isRider ? ((riderPhone && riderPhone[0]) || (order?.deliveryInfo && order.deliveryInfo.contact) || '') : (order?.shopPhone || '')
    ),
    conversationId: isRider ? `rider_${order?.id || ''}` : `shop_${order?.id || ''}`,
    orderId: String(order?.id || ''),
  }
}

export default {
  components: {
    ContactModal,
    PhoneWarningModal
  },
  data() {
    return {
      showContactModal: false,
      showPhoneWarning: false,
      showRtcContact: canUseUserRTCContact(),
      contactModalTitle: '选择联系方式',
      contactType: null, // 'rider' or 'shop'
      order: {
        id: '',
        shopId: null,
        shopName: '',
        shopLogo: '',
        shopPhone: '',
        bizType: 'takeout',
        status: 'pending',
        statusText: '',
        estimatedTime: '',
        time: '',
        price: 0,
        productTotal: 0,
        deliveryFee: 0,
        discount: 0,
        riderId: '',
        riderRating: 0,
        riderRatingCount: 0,
        isReviewed: false,
        reviewedAt: '',
        payTime: '',
        payMethod: '',
        payMethodRaw: '',
        deliveryInfo: null,
        productList: []
      }
    }
  },
  onLoad(query) {
    void this.syncRTCContactAvailability()
    const id = query && query.id
    if (id) {
      void this.loadOrderDetail(id)
    } else {
      uni.showToast({ title: '订单ID不存在', icon: 'none' })
    }
  },
  methods: {
    async syncRTCContactAvailability() {
      this.showRtcContact = canUseUserRTCContact()
      try {
        await loadRTCRuntimeSettings()
      } catch (_err) {}
      this.showRtcContact = canUseUserRTCContact()
    },
    async loadOrderDetail(id) {
      try {
        const data = await fetchOrderDetail(id)
        if (data && data.id) {
          this.order = this.formatOrderData(data)
          return
        }
        uni.showToast({ title: '订单不存在', icon: 'none' })
      } catch (error) {
        console.error('加载订单详情失败:', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    formatOrderData(data) {
      // 格式化后端返回的订单数据
      const shopId = data.shopId || data.shop_id || data.shop?.id
      const shopName = data.shopName || data.shop_name || data.shop?.name
      const shopLogo = data.shopLogo || data.shop?.logo
      const shopPhone = data.shopPhone || data.shop?.phone || data.customer_phone
      const riderId = String(data.riderId || data.rider_id || '')
      const riderRating = Number(data.riderRating || data.rider_rating || 0)
      const riderRatingCount = Number(data.riderRatingCount || data.rider_rating_count || 0)

      // 解析商品列表
      let productList = []
      if (data.productList && Array.isArray(data.productList)) {
        productList = data.productList
      } else if (data.items) {
        // 如果items是字符串，尝试解析
        if (typeof data.items === 'string') {
          try {
            const parsed = JSON.parse(data.items)
            if (Array.isArray(parsed)) {
              productList = parsed
            } else {
              // 如果是纯文本描述，创建一个商品项
              productList = [{
                name: data.items,
                price: data.product_price || data.productPrice || data.price || data.total_price || 0,
                count: 1,
                image: ''
              }]
            }
          } catch (e) {
            // 解析失败，作为纯文本处理
            productList = [{
              name: data.items,
              price: data.product_price || data.productPrice || data.price || data.total_price || 0,
              count: 1,
              image: ''
            }]
          }
        } else if (Array.isArray(data.items)) {
          productList = data.items
        }
      }

      // 构建配送信息
      let deliveryInfo = data.deliveryInfo
      if (!deliveryInfo && data.address) {
        deliveryInfo = {
          address: data.address,
          contact: data.customer_phone || data.delivery_phone,
          rider: data.rider_name && data.rider_phone ? `${data.rider_name} ${data.rider_phone}` : null,
          riderRating: riderRating,
          riderRatingCount: riderRatingCount
        }
      }
      if (deliveryInfo) {
        deliveryInfo.riderRating = Number(deliveryInfo.riderRating || riderRating || 0)
        deliveryInfo.riderRatingCount = Number(deliveryInfo.riderRatingCount || riderRatingCount || 0)
      }

      // 格式化时间
      const formatTime = (timeStr) => {
        if (!timeStr) return ''
        try {
          const date = new Date(timeStr)
          if (isNaN(date.getTime())) return timeStr
          return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }).replace(/\//g, '-')
        } catch (e) {
          return timeStr
        }
      }

      return {
        id: data.id || data.daily_order_id,
        shopId: shopId,
        shopName: shopName,
        shopLogo: shopLogo,
        shopPhone: shopPhone,
        bizType: this.normalizeBizType(data.bizType || data.biz_type),
        status: this.parseStatus(data.status, this.normalizeBizType(data.bizType || data.biz_type)),
        statusText: data.statusText || data.status,
        estimatedTime: data.estimatedTime || data.estimated_time,
        time: formatTime(data.time || data.createdAt || data.created_at),
        price: Number(data.price || data.totalPrice || data.total_price || 0),
        productTotal: Number(data.productTotal || data.product_price || data.price || data.total_price || 0),
        deliveryFee: Number(data.deliveryFee || data.delivery_fee || 0),
        discount: Number(data.discount || 0),
        payTime: formatTime(data.payTime || data.paid_at),
        payMethod: this.formatPayMethod(data.payMethod || data.pay_method),
        payMethodRaw: normalizePayChannel(data.payMethod || data.pay_method),
        riderId: riderId,
        riderRating: riderRating,
        riderRatingCount: riderRatingCount,
        isReviewed: data.isReviewed === true || data.is_reviewed === true || data.isReviewed === 1 || data.is_reviewed === 1 || data.isReviewed === '1' || data.is_reviewed === '1' || data.isReviewed === 'true' || data.is_reviewed === 'true',
        reviewedAt: data.reviewedAt || data.reviewed_at || '',
        deliveryInfo: deliveryInfo,
        productList: productList
      }
    },
    formatPayMethod(method) {
      const value = String(method || '').toLowerCase()
      if (!value) return '未支付'
      if (value === 'ifpay' || value === 'if-pay' || value === 'if_pay') return 'IF-Pay'
      if (value === 'wechat' || value === 'wxpay' || value === 'wechatpay') return '微信支付'
      if (value === 'alipay' || value === 'ali') return '支付宝'
      return method
    },
    normalizeBizType(bizType) {
      const value = String(bizType || '').toLowerCase()
      if (value === 'groupbuy' || value.includes('团购')) return 'groupbuy'
      return 'takeout'
    },
    parseStatus(status, bizType = 'takeout') {
      if (typeof status === 'string') {
        const s = status.toLowerCase()
        if (bizType === 'groupbuy') {
          if (['pending_payment', 'paid_unused', 'redeemed', 'refunding', 'refunded', 'expired', 'cancelled'].includes(s)) return s
          if (s.includes('核销')) return s.includes('已') ? 'redeemed' : 'paid_unused'
          if (s.includes('退款')) return s.includes('中') ? 'refunding' : 'refunded'
          if (s.includes('过期')) return 'expired'
          return 'paid_unused'
        }
        if (s === 'pending_payment') return 'pending_payment'
        if (s === 'completed' || s.includes('送达') || s.includes('完成')) return 'completed'
        if (s === 'cancelled' || s.includes('取消')) return 'cancelled'
        if (s === 'accepted' || s === 'priced' || s.includes('配送') || s.includes('进行') || s.includes('接单')) return 'delivering'
        if (s === 'pending' || s.includes('待')) return 'pending'
      }
      return status || 'pending'
    },
    getStatusIcon(status) {
      if (status === 'pending_payment') return '⏱'
      if (status === 'paid_unused') return '🎟'
      if (status === 'redeemed') return '✓'
      if (status === 'refunding') return '↺'
      if (status === 'refunded') return '↩'
      if (status === 'expired') return '⌛'
      if (status === 'completed') return '✓'
      if (status === 'cancelled') return '✕'
      if (status === 'pending') return '⏱'
      return '🚴'
    },
    getStatusIconClass(status) {
      if (status === 'pending_payment') return 'icon-pending'
      if (status === 'paid_unused') return 'icon-delivering'
      if (status === 'redeemed') return 'icon-completed'
      if (status === 'refunding') return 'icon-pending'
      if (status === 'refunded' || status === 'expired') return 'icon-cancelled'
      if (status === 'completed') return 'icon-completed'
      if (status === 'cancelled') return 'icon-cancelled'
      if (status === 'pending') return 'icon-pending'
      return 'icon-delivering'
    },
    getStatusText(status) {
      if (status === 'pending_payment') return '待支付'
      if (status === 'paid_unused') return '待核销'
      if (status === 'redeemed') return '已核销'
      if (status === 'refunding') return '退款处理中'
      if (status === 'refunded') return '已退款'
      if (status === 'expired') return '券码已过期'
      if (status === 'completed') return '订单已完成'
      if (status === 'cancelled') return '订单已取消'
      if (status === 'pending') return '等待接单'
      return '正在配送'
    },
    formatPrice(price) {
      const num = Number(price) || 0
      return num.toFixed(2).replace(/\.00$/, '')
    },
    formatRating(rating) {
      const num = Number(rating) || 0
      return num.toFixed(1)
    },
    shouldShowContactShop(status) {
      return ['delivering', 'pending', 'paid_unused', 'redeemed', 'refunding'].includes(status)
    },
    shouldShowContactRider(status) {
      return status === 'delivering'
    },
    shouldShowRefund(status) {
      if (this.order.bizType === 'groupbuy') {
        return status === 'paid_unused'
      }
      return status === 'delivering' || status === 'completed' || status === 'pending'
    },
    shouldShowOtherActions(status) {
      if (this.order.bizType === 'groupbuy') {
        return status === 'redeemed'
      }
      return status === 'completed' || status === 'cancelled'
    },
    getAuth() {
      const profile = uni.getStorageSync('userProfile') || {}
      const userId = String(profile.phone || profile.id || profile.userId || '').trim()
      const token = String(uni.getStorageSync('token') || '').trim()
      return { userId, token }
    },
    getAuthHeader(token) {
      if (!token) return {}
      return { Authorization: `Bearer ${token}` }
    },
    createIdempotencyKey(prefix, userId) {
      const seed = `${Date.now()}${Math.floor(Math.random() * 1000000)}`
      return `${prefix}_${String(userId || 'guest')}_${seed}`
    },
    payChannelByMethod(method) {
      if (method === 'wechat') return 'wxpay'
      if (method === 'alipay') return 'alipay'
      return 'ifpay'
    },
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    },
    normalizePaymentStatus(payload) {
      return String((payload && payload.status) || '').trim().toLowerCase()
    },
    isPaymentSuccessStatus(status) {
      return ['success', 'completed', 'paid'].includes(String(status || '').trim().toLowerCase())
    },
    isPaymentFailureStatus(status) {
      return ['failed', 'rejected', 'cancelled', 'closed'].includes(String(status || '').trim().toLowerCase())
    },
    async pollOrderPaymentStatus(transactionId, userId, token) {
      let latest = null
      for (let attempt = 0; attempt < 8; attempt += 1) {
        latest = await request({
          url: `/api/wallet/transactions/${encodeURIComponent(String(transactionId || ''))}`,
          method: 'GET',
          data: {
            userId,
            userType: 'customer'
          },
          header: this.getAuthHeader(token)
        })
        const status = this.normalizePaymentStatus(latest)
        if (this.isPaymentSuccessStatus(status) || this.isPaymentFailureStatus(status)) {
          return latest
        }
        await this.sleep(1500)
      }
      return latest
    },
    async pickPaymentMethod(defaultMethod) {
      const response = await request({
        url: '/api/payment/options',
        method: 'GET',
        data: {
          userType: 'customer',
          platform: CLIENT_PLATFORM,
          scene: 'order_payment'
        }
      })
      const methods = normalizePayMethods(response)
      if (!methods.length) {
        throw new Error('当前没有可用支付方式')
      }
      const current = normalizePayChannel(defaultMethod)
      methods.sort((left, right) => (left.value === current ? -1 : right.value === current ? 1 : 0))
      if (methods.length === 1) {
        return methods[0]
      }
      return new Promise((resolve) => {
        uni.showActionSheet({
          itemList: methods.map((item) => item.label),
          success: (res) => resolve(methods[res.tapIndex] || null),
          fail: () => resolve(null)
        })
      })
    },
    async continuePayOrder(order) {
      const { userId, token } = this.getAuth()
      if (!userId) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      const selected = await this.pickPaymentMethod(order && order.payMethodRaw)
      if (!selected) return
      try {
        const idempotencyKey = this.createIdempotencyKey('orderpay_resume', userId)
        let result = await request({
          url: '/api/payment/intent',
          method: 'POST',
          data: {
            userId,
            userType: 'customer',
            platform: CLIENT_PLATFORM,
            orderId: String(order?.id || ''),
            paymentMethod: selected.value,
            paymentChannel: this.payChannelByMethod(selected.value),
            idempotencyKey
          },
          header: Object.assign({}, this.getAuthHeader(token), {
            'Idempotency-Key': idempotencyKey
          })
        })

        if (shouldLaunchClientPayment(result)) {
          uni.showLoading({ title: '正在拉起支付', mask: true })
          try {
            await invokeClientPayment(result, CLIENT_PLATFORM)
          } finally {
            uni.hideLoading()
          }
        }

        let status = this.normalizePaymentStatus(result)
        if (!this.isPaymentSuccessStatus(status) && !this.isPaymentFailureStatus(status) && result?.transactionId) {
          uni.showLoading({ title: '正在确认支付状态', mask: true })
          try {
            result = await this.pollOrderPaymentStatus(result.transactionId, userId, token)
          } finally {
            uni.hideLoading()
          }
          status = this.normalizePaymentStatus(result)
        }

        if (this.isPaymentSuccessStatus(status)) {
          await this.loadOrderDetail(order?.id)
          uni.navigateTo({ url: `/pages/pay/success/index?orderId=${encodeURIComponent(String(order?.id || ''))}` })
          return
        }

        await this.loadOrderDetail(order?.id)
        uni.showToast({
          title: this.isPaymentFailureStatus(status) ? '支付失败，请稍后重试' : '支付请求已提交，请稍后刷新订单状态',
          icon: 'none'
        })
      } catch (error) {
        if (isClientPaymentCancelled(error)) {
          uni.showToast({ title: '已取消支付', icon: 'none' })
          return
        }
        uni.showToast({ title: getClientPaymentErrorMessage(error), icon: 'none' })
      }
    },
    getOtherActionButtons(order) {
      const status = order && typeof order === 'object' ? order.status : order
      if (order && order.bizType === 'groupbuy') {
        if (status === 'redeemed') {
          return [
            { text: '联系商家', primary: false, action: 'contactShop' }
          ]
        }
        return []
      }
      if (status === 'completed') {
        if (order && order.isReviewed) {
          return [
            { text: '再来一单', primary: false, action: 'reorder' }
          ]
        }
        return [
          { text: '再来一单', primary: false, action: 'reorder' },
          { text: '评价', primary: true, action: 'review' }
        ]
      } else {
        return [
          { text: '再来一单', primary: false, action: 'reorder' }
        ]
      }
    },
    handleAction(action, order) {
      if (action === 'reorder') {
        this.handleReorder(order)
      } else if (action === 'pay') {
        this.continuePayOrder(order)
      } else if (action === 'review') {
        uni.navigateTo({ url: '/pages/order/review/index?id=' + order.id })
      } else if (action === 'location') {
        uni.showToast({ title: '查看骑手位置', icon: 'none' })
      } else if (action === 'contactRider') {
        this.showContactModal = true
        this.contactModalTitle = '联系骑手'
        this.contactType = 'rider'
      } else if (action === 'contactShop') {
        this.showContactModal = true
        this.contactModalTitle = '联系商家'
        this.contactType = 'shop'
      } else if (action === 'refund') {
        if (order.bizType === 'groupbuy' && order.status === 'redeemed') {
          uni.showToast({ title: '该团购券已核销，仅商户可发起退款', icon: 'none' })
          return
        }
        uni.navigateTo({ url: '/pages/order/refund/index?id=' + order.id })
      } else if (action === 'voucher') {
        this.showVoucherCode(order)
      }
    },
    async showVoucherCode(order) {
      try {
        const vouchers = await fetchGroupbuyVouchers({ orderId: order.id, status: 'issued' })
        const list = Array.isArray(vouchers) ? vouchers : []
        if (list.length === 0) {
          uni.showToast({ title: '暂无可用券码', icon: 'none' })
          return
        }
        const voucher = list[0]
        const qr = await fetchVoucherQRCode(voucher.id)
        const content = String(qr?.qrContent || qr?.scanToken || '').trim()
        if (!content) {
          uni.showToast({ title: '券码生成失败', icon: 'none' })
          return
        }
        uni.showModal({
          title: '到店核销码',
          content: `请向商家出示以下核销码：\n${content}\n\n有效期至：${qr?.expiresAt || '--'}`,
          showCancel: false
        })
      } catch (error) {
        const message = error?.data?.error || error?.error || '获取券码失败'
        uni.showToast({ title: message, icon: 'none' })
      }
    },
    // 再来一单：将订单商品加入购物车并跳转
    handleReorder(order) {
      if (!order.shopId) {
        uni.showToast({ title: '店铺信息不存在', icon: 'none' })
        return
      }

      try {
        // 将订单商品加入购物车
        const cartKey = `cart_${order.shopId}`
        const cart = {}

        if (order.productList && order.productList.length > 0) {
          order.productList.forEach(item => {
            // 使用商品ID作为key，如果没有ID则使用名称
            const itemId = item.id || item.productId || item.name
            const count = Number(item.count) || Number(item.quantity) || 1
            cart[itemId] = count
          })

          // 保存购物车
          uni.setStorageSync(cartKey, JSON.stringify(cart))

          // 触发购物车更新事件
          uni.$emit('cartUpdated', { shopId: order.shopId })

          // 跳转到商家点餐页面
          uni.redirectTo({
            url: `/pages/shop/menu/index?id=${order.shopId}`
          })
        } else {
          // 如果没有productList，直接跳转到商家页面
          uni.showToast({ title: '订单商品信息不完整，请重新选择', icon: 'none', duration: 2000 })
          setTimeout(() => {
            uni.redirectTo({
              url: `/pages/shop/menu/index?id=${order.shopId}`
            })
          }, 2000)
        }
      } catch (err) {
        console.error('再来一单失败:', err)
        uni.showToast({ title: '操作失败，请重试', icon: 'none' })
      }
    },
    handleOnlineContact() {
      const order = this.order
      let roomId, name, role, avatar, targetId
      
      if (this.contactType === 'rider') {
        roomId = `rider_${order.id}`
        name = order.deliveryInfo?.rider?.split(' ')[0] || '骑手'
        role = 'rider'
        avatar = '/static/images/default-avatar.svg'
        targetId = String(order.riderId || '')
      } else {
        roomId = `shop_${order.id}`
        name = order.shopName
        role = 'shop'
        avatar = order.shopLogo || '/static/images/default-shop.svg'
        targetId = String(order.shopId || '')
      }
      
      uni.navigateTo({
        url: `/pages/message/chat/index?chatType=direct&roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(name)}&role=${encodeURIComponent(role)}&avatar=${encodeURIComponent(avatar)}&targetId=${encodeURIComponent(targetId || '')}&orderId=${encodeURIComponent(String(order.id || ''))}`
      })
    },
    handleRTCContact() {
      if (!this.showRtcContact) {
        this.handlePhoneContact()
        return
      }

      const context = buildOrderRTCContext(this.order, this.contactType)
      if (!context.orderId || !context.targetRole || !context.targetId) {
        uni.showToast({ title: '缺少语音联系目标', icon: 'none' })
        return
      }

      uni.navigateTo({
        url:
          `/pages/rtc/call/index?mode=outgoing` +
          `&entryPoint=${encodeURIComponent('order_detail')}` +
          `&scene=${encodeURIComponent('order_contact')}` +
          `&orderId=${encodeURIComponent(context.orderId)}` +
          `&conversationId=${encodeURIComponent(context.conversationId)}` +
          `&targetRole=${encodeURIComponent(context.targetRole)}` +
          `&targetId=${encodeURIComponent(context.targetId)}` +
          `&targetName=${encodeURIComponent(context.targetName)}` +
          `&targetPhone=${encodeURIComponent(context.targetPhone)}`
      })
    },
    handlePhoneContact() {
      this.showPhoneWarning = true
    },
    handleConfirmPhone() {
      const order = this.order
      let phoneNumber

      if (this.contactType === 'rider') {
        // 从骑手信息中提取电话号码
        const riderInfo = order.deliveryInfo?.rider || ''
        const phoneMatch = riderInfo.match(/1[3-9]\d{9}/)
        phoneNumber = phoneMatch ? phoneMatch[0] : (order.deliveryInfo?.contact || '10086')
      } else {
        phoneNumber = order.shopPhone || '10086'
      }

      phoneContactHelper.makePhoneCall(
        buildOrderPhoneAuditPayload(order, this.contactType, phoneNumber)
      ).catch((err) => {
        console.error('拨打电话失败:', err)
        uni.showToast({
          title: '无法拨打电话，请检查设备权限',
          icon: 'none',
          duration: 2000
        })
      })
    },
    // 跳转到店铺详情
    goShopDetail() {
      if (this.order.shopId) {
        uni.navigateTo({
          url: `/pages/shop/detail/index?id=${this.order.shopId}`
        })
      } else {
        uni.showToast({ title: '店铺信息不存在', icon: 'none' })
      }
    },
    back() {
      uni.navigateBack()
    }
  }
}
