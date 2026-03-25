import { fetchGroupbuyVouchers, fetchOrderDetail, fetchVoucherQRCode } from '@/shared-ui/api.js'
import ContactModal from '@/components/ContactModal.vue'
import PhoneWarningModal from '@/components/PhoneWarningModal.vue'

export default {
  components: {
    ContactModal,
    PhoneWarningModal
  },
  data() {
    return {
      showContactModal: false,
      showPhoneWarning: false,
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
        deliveryInfo: null,
        productList: []
      }
    }
  },
  onLoad(query) {
    const id = query && query.id
    if (id) {
      fetchOrderDetail(id)
        .then((data) => {
          if (data && data.id) {
            this.order = this.formatOrderData(data)
          } else {
            uni.showToast({ title: '订单不存在', icon: 'none' })
          }
        })
        .catch((error) => {
          console.error('加载订单详情失败:', error)
          uni.showToast({ title: '加载失败', icon: 'none' })
        })
    } else {
      uni.showToast({ title: '订单ID不存在', icon: 'none' })
    }
  },
  methods: {
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
        if (s === 'completed' || s.includes('送达') || s.includes('完成')) return 'completed'
        if (s === 'cancelled' || s.includes('取消')) return 'cancelled'
        if (s === 'accepted' || s === 'priced' || s.includes('配送') || s.includes('进行') || s.includes('接单')) return 'delivering'
        if (s === 'pending' || s.includes('待')) return 'pending'
      }
      return status || 'pending'
    },
    getStatusIcon(status) {
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

      uni.makePhoneCall({
        phoneNumber: phoneNumber
      }).catch((err) => {
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
