import { createPhoneContactHelper } from './phone-contact.js'

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

export function createOrderListPage({
  fetchAfterSalesList,
  fetchGroupbuyVouchers,
  fetchOrders,
  fetchVoucherQRCode,
  recordPhoneContactClick,
  canUseUserRTCContact,
  loadRTCRuntimeSettings,
  mapAfterSalesItem,
  mapOrderItem,
  ContactModal,
  PhoneWarningModal,
} = {}) {
  const phoneContactHelper = createPhoneContactHelper({ recordPhoneContactClick })

  return {
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
        contactType: null,
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
          return this.orders.filter((order) => {
            if (order.bizType === 'groupbuy') {
              return ['pending_payment', 'paid_unused', 'refunding'].includes(order.status)
            }
            return ['pending', 'accepted', 'delivering'].includes(order.status)
          })
        }
        if (this.currentTab === 'review') {
          return this.orders.filter((order) => order.bizType !== 'groupbuy' && order.status === 'completed' && !order.isReviewed)
        }
        if (this.currentTab === 'refund') return this.afterSalesOrders
        return this.orders
      }
    },
    onLoad(query) {
      void this.syncRTCContactAvailability()
      if (query && query.tab) {
        this.currentTab = query.tab
      }
      this.loadOrders()
    },
    onShow() {
      void this.syncRTCContactAvailability()
      uni.$off('switchToRefundTab', this.switchToRefundTab)
      uni.$on('switchToRefundTab', this.switchToRefundTab)
      uni.$off('realtime:refresh:orders', this.loadOrders)
      uni.$off('realtime:refresh:after_sales', this.loadOrders)
      uni.$on('realtime:refresh:orders', this.loadOrders)
      uni.$on('realtime:refresh:after_sales', this.loadOrders)
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
        } catch (_error) {}
        this.showRtcContact = canUseUserRTCContact()
      },
      loadOrders() {
        const profile = uni.getStorageSync('userProfile') || {}
        let userId = profile.phone || profile.id || profile.userId

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
          .catch((error) => {
            uni.hideLoading()
            console.error('❌ 加载订单失败:', error)
            this.orders = []
          })
      },
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
      onScroll(event) {
        this.scrollTop = event.detail.scrollTop
      },
      switchTab(tabId) {
        if (this.currentTab !== tabId) {
          this.currentTab = tabId
        }
      },
      switchToRefundTab() {
        this.currentTab = 'refund'
      },
      formatPrice(price) {
        if (price === '-') return '-'
        const num = Number(price)
        if (Number.isNaN(num)) return '0.00'
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
        }
        return [
          { text: '再来一单', primary: false, action: 'reorder' }
        ]
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
        ).catch((error) => {
          console.error('拨打电话失败:', error)
          uni.showToast({
            title: '无法拨打电话，请检查设备权限',
            icon: 'none',
            duration: 2000
          })
        })
      },
      handleReorder(order) {
        if (!order.shopId) {
          uni.showToast({ title: '店铺信息不存在', icon: 'none' })
          return
        }

        try {
          const cartKey = `cart_${order.shopId}`
          const cart = {}

          if (order.productList && order.productList.length > 0) {
            order.productList.forEach((item) => {
              const itemId = item.id || item.name
              cart[itemId] = item.count || 1
            })
          } else if (order.items) {
            const itemNames = order.items.split(' 等')[0]
            cart[itemNames] = order.itemCount || 1
          } else {
            uni.showToast({ title: '订单商品信息不完整', icon: 'none' })
            return
          }

          uni.setStorageSync(cartKey, JSON.stringify(cart))
          uni.$emit('cartUpdated', { shopId: order.shopId })
          uni.redirectTo({
            url: `/pages/shop/menu/index?id=${order.shopId}`
          })
        } catch (error) {
          console.error('再来一单失败:', error)
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
}
