import { fetchAfterSalesList, fetchGroupbuyVouchers, fetchOrders, fetchVoucherQRCode, recordPhoneContactClick } from '@/shared-ui/api.js'
import { canUseUserRTCContact, loadRTCRuntimeSettings } from '@/shared-ui/rtc-contact.js'
import { mapAfterSalesItem, mapOrderItem } from './order-list-utils'
import ContactModal from '@/components/ContactModal.vue'
import PhoneWarningModal from '@/components/PhoneWarningModal.vue'

import { createPhoneContactHelper } from '../../../../shared/mobile-common/phone-contact.js'

const phoneContactHelper = createPhoneContactHelper({ recordPhoneContactClick })

function normalizePhoneNumber(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const parts = text.match(/\d+/g)
  return parts ? parts.join('') : text
}

function buildOrderPhoneAuditPayload(order, contactType, phoneNumber) {
  const safeOrder = order && typeof order === 'object' ? order : {}
  const targetRole = contactType === 'rider' ? 'rider' : 'merchant'
  return {
    targetRole,
    targetId: String(contactType === 'rider' ? (safeOrder.riderId || '') : (safeOrder.shopId || '')),
    targetPhone: normalizePhoneNumber(phoneNumber),
    entryPoint: 'order_list',
    scene: 'order_contact',
    orderId: String(safeOrder.id || ''),
    roomId: contactType === 'rider' ? `rider_${safeOrder.id || ''}` : `shop_${safeOrder.id || ''}`,
    pagePath: '/pages/order/list/index',
    metadata: {
      bizType: safeOrder.bizType || '',
      status: safeOrder.status || '',
      shopId: String(safeOrder.shopId || ''),
      riderId: String(safeOrder.riderId || ''),
      contactType,
    }
  }
}

function buildOrderRTCContext(order, contactType) {
  const safeOrder = order && typeof order === 'object' ? order : {}
  const deliveryInfo = safeOrder.deliveryInfo && typeof safeOrder.deliveryInfo === 'object'
    ? safeOrder.deliveryInfo
    : {}
  const isRider = contactType === 'rider'
  const riderInfo = String(deliveryInfo.rider || '')
  const riderPhone = riderInfo.match(/1[3-9]\d{9}/)
  return {
    targetRole: isRider ? 'rider' : 'merchant',
    targetId: String(isRider ? (safeOrder.riderId || '') : (safeOrder.shopId || '')),
    targetName: isRider ? (riderInfo.split(' ')[0] || '骑手') : String(safeOrder.shopName || '商家'),
    targetPhone: normalizePhoneNumber(
      isRider ? ((riderPhone && riderPhone[0]) || safeOrder.riderPhone || '') : (safeOrder.shopPhone || '')
    ),
    conversationId: isRider ? `rider_${safeOrder.id || ''}` : `shop_${safeOrder.id || ''}`,
    orderId: String(safeOrder.id || ''),
  }
}

export default {
  components: {
    ContactModal,
    PhoneWarningModal
  },
  data() {
    return {
      currentTab: 'all',
      isRefreshing: false,
      scrollTop: 0,
      showContactModal: false,
      showPhoneWarning: false,
      showRtcContact: canUseUserRTCContact(),
      contactModalTitle: '选择联系方式',
      currentOrder: null,
      contactType: null, // 'rider' or 'shop'
      tabs: [
        { id: 'all', name: '全部' },
        { id: 'delivering', name: '进行中' },
        { id: 'review', name: '待评价' },
        { id: 'refund', name: '退款/售后' }
      ],
      orders: [],
      afterSalesOrders: []
    }
  },
  computed: {
    filteredOrders() {
      if (this.currentTab === 'all') return this.orders
      if (this.currentTab === 'delivering') {
        return this.orders.filter((o) => {
          if (o.bizType === 'groupbuy') {
            return ['pending_payment', 'paid_unused', 'refunding'].includes(o.status)
          }
          return ['pending', 'accepted', 'delivering'].includes(o.status)
        })
      }
      if (this.currentTab === 'review') {
        return this.orders.filter((o) => o.bizType !== 'groupbuy' && o.status === 'completed' && !o.isReviewed)
      }
      if (this.currentTab === 'refund') return this.afterSalesOrders
      return this.orders
    }
  },
  onLoad(query) {
    void this.syncRTCContactAvailability()
    // 支持从外部传入tab参数
    if (query && query.tab) {
      this.currentTab = query.tab
    }
    this.loadOrders()
  },
  onShow() {
    void this.syncRTCContactAvailability()
    // 监听切换tab事件
    uni.$off('switchToRefundTab', this.switchToRefundTab)
    uni.$on('switchToRefundTab', this.switchToRefundTab)
    uni.$off('realtime:refresh:orders', this.loadOrders)
    uni.$off('realtime:refresh:after_sales', this.loadOrders)
    uni.$on('realtime:refresh:orders', this.loadOrders)
    uni.$on('realtime:refresh:after_sales', this.loadOrders)
    // Tab页会复用，回到订单页时主动刷新最新订单
    this.loadOrders()
  },
  onUnload() {
    uni.$off('switchToRefundTab', this.switchToRefundTab)
    uni.$off('realtime:refresh:orders', this.loadOrders)
    uni.$off('realtime:refresh:after_sales', this.loadOrders)
  },
  methods: {
    async syncRTCContactAvailability() {
      this.showRtcContact = canUseUserRTCContact()
      try {
        await loadRTCRuntimeSettings()
      } catch (_err) {}
      this.showRtcContact = canUseUserRTCContact()
    },
    // 加载订单数据
    loadOrders() {
      const profile = uni.getStorageSync('userProfile') || {}
      // 优先使用phone作为userId，因为后端订单表的user_id存储的是手机号
      let userId = profile.phone || profile.id || profile.userId

      // 确保userId是字符串类型
      if (userId) {
        userId = String(userId)
      }

      if (!userId) {
        this.orders = []
        this.afterSalesOrders = []
        return
      }

      this.loadAfterSales(userId)
      uni.showLoading({ title: '加载中...' })

      fetchOrders(userId)
        .then((data) => {
          uni.hideLoading()

          if (Array.isArray(data) && data.length > 0) {
            this.orders = data.map((order) => mapOrderItem(order))
          } else {
            this.orders = []
          }
        })
        .catch((e) => {
          uni.hideLoading()
          console.error('❌ 加载订单失败:', e)
          // 加载失败时显示空列表
          this.orders = []
        })
    },
    // 加载售后申请列表（退款/售后 Tab）
    loadAfterSales(userId) {
      fetchAfterSalesList(userId)
        .then((data) => {
          const list = Array.isArray(data) ? data : []
          this.afterSalesOrders = list.map((item) => mapAfterSalesItem(item))
        })
        .catch(() => {
          this.afterSalesOrders = []
        })
    },

    // 监听滚动
    onScroll(e) {
      this.scrollTop = e.detail.scrollTop
    },

    // 切换标签
    switchTab(tabId) {
      if (this.currentTab !== tabId) {
        this.currentTab = tabId
      }
    },
    // 切换到退款/售后tab
    switchToRefundTab() {
      this.currentTab = 'refund'
    },

    // 格式化价格
    formatPrice(price) {
      if (price === '-') return '-'
      const num = Number(price)
      if (isNaN(num)) return '0.00'
      return num.toFixed(2).replace(/\.00$/, '')
    },

    getStatusClass(order) {
      if (order && order.isAfterSales) {
        const status = String(order.status || '').toLowerCase()
        if (status === 'pending') return 'status-pending'
        if (status === 'processing') return 'status-delivering'
        if (status === 'approved' || status === 'completed') return 'status-completed'
        if (status === 'rejected') return 'status-cancelled'
        return 'status-cancelled'
      }
      const status = order && typeof order === 'object' ? order.status : order
      if (['pending', 'pending_payment', 'priced'].includes(status)) return 'status-pending'
      if (['accepted', 'delivering', 'paid_unused', 'refunding'].includes(status)) return 'status-delivering'
      if (['completed', 'redeemed', 'refunded'].includes(status)) return 'status-completed'
      return 'status-cancelled'
    },

    getButtons(order) {
      if (order && order.isAfterSales) {
        return []
      }
      const status = order && typeof order === 'object' ? order.status : order
      if (status === 'pending_payment') {
        return [
          { text: '继续支付', primary: true, action: 'pay' }
        ]
      }
      if (order && order.bizType === 'groupbuy') {
        if (status === 'paid_unused') {
          return [
            { text: '查看券码', primary: true, action: 'voucher' },
            { text: '申请售后', primary: false, action: 'refund' }
          ]
        }
        if (status === 'redeemed') {
          return [
            { text: '联系商家', primary: false, action: 'contactShop' }
          ]
        }
        return []
      }
      if (['pending', 'accepted', 'delivering'].includes(status)) {
        return [
          { text: '申请售后', primary: false, action: 'refund' }
        ]
      } else if (status === 'completed') {
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
        uni.navigateTo({ url: '/pages/order/detail/index?id=' + order.id })
      } else if (action === 'review') {
        uni.navigateTo({ url: '/pages/order/review/index?id=' + order.id })
      } else if (action === 'refund') {
        if (order.bizType === 'groupbuy' && order.status === 'redeemed') {
          uni.showToast({ title: '该团购券已核销，仅商户可发起退款', icon: 'none' })
          return
        }
        uni.navigateTo({ url: '/pages/order/refund/index?id=' + order.id })
      } else if (action === 'voucher') {
        this.showVoucherCode(order)
      } else if (action === 'contactShop') {
        this.currentOrder = order
        this.contactType = 'shop'
        this.contactModalTitle = '联系商家'
        this.showContactModal = true
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
        const content = String((qr && qr.qrContent) || (qr && qr.scanToken) || '').trim()
        if (!content) {
          uni.showToast({ title: '券码生成失败', icon: 'none' })
          return
        }
        uni.showModal({
          title: '到店核销码',
          content: `请向商家出示以下核销码：\n${content}\n\n有效期至：${(qr && qr.expiresAt) || '--'}`,
          showCancel: false
        })
      } catch (error) {
        const message = (error && error.data && error.data.error) || (error && error.error) || '获取券码失败'
        uni.showToast({ title: message, icon: 'none' })
      }
    },
    handleOnlineContact() {
      if (!this.currentOrder) return
      const order = this.currentOrder
      const roomId = this.contactType === 'rider' ? `rider_${order.id}` : `shop_${order.id}`
      const name = this.contactType === 'rider'
        ? (((order.deliveryInfo && order.deliveryInfo.rider) ? order.deliveryInfo.rider.split(' ')[0] : '') || '骑手')
        : order.shopName
      const role = this.contactType
      const targetId = this.contactType === 'rider'
        ? String(order.riderId || '')
        : String(order.shopId || '')
      const avatar = this.contactType === 'rider'
        ? '/static/images/default-avatar.svg'
        : (order.shopLogo || '/static/images/default-shop.svg')

      uni.navigateTo({
        url: `/pages/message/chat/index?chatType=direct&roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(name)}&role=${encodeURIComponent(role)}&avatar=${encodeURIComponent(avatar)}&targetId=${encodeURIComponent(targetId)}&orderId=${encodeURIComponent(String(order.id || ''))}`
      })
    },
    handleRTCContact() {
      if (!this.currentOrder) return
      if (!this.showRtcContact) {
        this.handlePhoneContact()
        return
      }

      const context = buildOrderRTCContext(this.currentOrder, this.contactType)
      if (!context.orderId || !context.targetRole || !context.targetId) {
        uni.showToast({ title: '缺少语音联系目标', icon: 'none' })
        return
      }

      uni.navigateTo({
        url:
          `/pages/rtc/call/index?mode=outgoing` +
          `&entryPoint=${encodeURIComponent('order_list')}` +
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
      if (!this.currentOrder) return
      const order = this.currentOrder
      let phoneNumber

      if (this.contactType === 'rider') {
        const riderText = (order.deliveryInfo && order.deliveryInfo.rider) || ''
        const riderMatch = riderText.match(/\d{11}/)
        phoneNumber = (riderMatch && riderMatch[0]) || order.riderPhone || '10086'
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

        // 优先使用 productList
        if (order.productList && order.productList.length > 0) {
          order.productList.forEach(item => {
            const itemId = item.id || item.name
            cart[itemId] = item.count || 1
          })
        } else if (order.items) {
          // 如果没有productList，尝试从items解析
          // 这里简化处理，实际应该从后端获取完整商品信息
          const itemNames = order.items.split(' 等')[0]
          cart[itemNames] = order.itemCount || 1
        } else {
          uni.showToast({ title: '订单商品信息不完整', icon: 'none' })
          return
        }

        // 保存购物车
        uni.setStorageSync(cartKey, JSON.stringify(cart))

        // 触发购物车更新事件
        uni.$emit('cartUpdated', { shopId: order.shopId })

        // 跳转到商家点餐页面
        uni.redirectTo({
          url: `/pages/shop/menu/index?id=${order.shopId}`
        })
      } catch (err) {
        console.error('再来一单失败:', err)
        uni.showToast({ title: '操作失败，请重试', icon: 'none' })
      }
    },

    goDetail(id, order) {
      if (order && order.isAfterSales) {
        const content = order.adminRemark
          ? `${order.statusText}\n处理备注：${order.adminRemark}`
          : order.statusText
        uni.showModal({
          title: '售后进度',
          content,
          showCancel: false
        })
        return
      }
      uni.navigateTo({ url: '/pages/order/detail/index?id=' + id })
    },

    goSearch() {
      uni.navigateTo({ url: '/pages/search/index/index?type=order' }).catch(() => {
        uni.showToast({ title: '搜索订单', icon: 'none' })
      })
    }
  }
}
