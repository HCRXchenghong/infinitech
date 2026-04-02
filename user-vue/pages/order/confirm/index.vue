<template>
  <view class="page confirm">
    <view class="card address" @tap="goAddressList">
      <view class="row between">
        <text class="title">{{ deliveryAddressTitle }}</text>
        <text class="arrow">></text>
      </view>
      <text class="sub">{{ deliveryAddressSubtitle }}</text>
      <view class="row between time">
        <text class="bold">{{ deliveryScheduleTitle }}</text>
        <text class="primary">{{ deliveryScheduleSubtitle }}</text>
      </view>
    </view>

    <view v-if="shop" class="card shop">
      <text class="shop-name">{{ shop.name }}</text>
      <view
        v-for="item in items"
        :key="item.id"
        class="row item"
      >
        <view class="thumb"></view>
        <view class="info">
          <text class="name">{{ item.name }}</text>
          <text class="qty">x {{ item.qty }}</text>
        </view>
        <text class="price">￥{{ itemTotal(item) }}</text>
      </view>

      <view class="row between line">
        <text>打包费</text>
        <text class="price">￥{{ packagingFee.toFixed(2) }}</text>
      </view>
      <view class="row between line">
        <text>配送费</text>
        <text class="price">￥{{ deliveryPrice.toFixed(2) }}</text>
      </view>
      <view v-if="discountAmount > 0" class="row between line discount">
        <text>优惠券</text>
        <text class="price">-￥{{ discountAmount.toFixed(2) }}</text>
      </view>
      <view class="row justify-end total-row">
        <text v-if="discountAmount > 0" class="save">已优惠￥{{ discountAmount.toFixed(2) }}</text>
        <text>小计</text>
        <text class="total">￥{{ finalTotalDisplay }}</text>
      </view>
    </view>

    <view class="card">
      <view class="row between" @tap="goRemark">
        <text>备注</text>
        <text class="gray">{{ remarkText || '口味、偏好等' }}</text>
      </view>
      <view class="row between" @tap="goTableware">
        <text>餐具数量</text>
        <text class="gray">{{ tablewareText || '未选择' }}</text>
      </view>
      <view class="row between" @tap="goCoupon">
        <text>优惠券</text>
        <text class="gray">{{ couponSummaryText }}</text>
      </view>
    </view>

    <view class="card pay-method-card">
      <view class="row between pay-method-header">
        <text class="pay-method-title">支付方式</text>
        <text class="pay-method-current">{{ payMethodLabel(selectedPayMethod) }}</text>
      </view>
      <view v-if="paymentOptionsLoading" class="pay-method-empty">
        <text class="gray">正在加载支付方式...</text>
      </view>
      <view v-else-if="payMethods.length === 0" class="pay-method-empty">
        <text class="gray">后台暂未开放当前端订单支付方式</text>
      </view>
      <view v-else class="pay-method-list">
        <view
          v-for="item in payMethods"
          :key="item.value"
          class="pay-method-item"
          :class="{ active: selectedPayMethod === item.value }"
          @tap="selectedPayMethod = item.value"
        >
          <view class="pay-method-left">
            <text class="pay-method-name">{{ item.label }}</text>
            <text class="pay-method-tip">{{ item.tip }}</text>
          </view>
          <text class="pay-method-check">{{ selectedPayMethod === item.value ? '✓' : '' }}</text>
        </view>
      </view>
    </view>

    <view class="pay-bar">
      <view class="amount">
        <text class="big">￥{{ finalTotalDisplay }}</text>
        <text v-if="discountAmount > 0" class="hint">已优惠￥{{ discountAmount.toFixed(2) }}</text>
      </view>
      <button class="pay-btn" @tap="submitOrder">提交订单</button>
    </view>
  </view>
</template>

<script>
import {
  createOrder,
  earnPoints,
  fetchProductDetail,
  fetchShopDetail,
  fetchUserAddresses,
  request
} from '@/shared-ui/api.js'
import { useUserOrderStore } from '@/shared-ui/userOrderStore.js'

const CLIENT_PLATFORM = 'mini_program'

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
    { value: 'wechat', label: '微信支付', tip: '小程序订单支付' }
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

function normalizeBizType(raw) {
  const value = String(raw || '').trim().toLowerCase()
  if (!value) return 'takeout'
  if (value === 'groupbuy' || value.includes('团购')) return 'groupbuy'
  return 'takeout'
}

function normalizeAddress(addr) {
  if (!addr || typeof addr !== 'object') return null
  const id = String(addr.id || '').trim()
  const detail = String(addr.fullAddress || addr.detail || '').trim()
  const name = String(addr.name || '').trim()
  const phone = String(addr.phone || '').trim()
  const tag = String(addr.tag || '').trim()
  if (!id || !detail || !name) return null
  return {
    id,
    detail,
    fullAddress: detail,
    name,
    phone,
    tag,
    isDefault: Boolean(addr.isDefault)
  }
}

function normalizeAddresses(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => normalizeAddress(item)).filter(Boolean)
}

export default {
  data() {
    return {
      shop: null,
      items: [],
      orderState: useUserOrderStore().state,
      submitting: false,
      loading: true,
      paymentOptionsLoading: false,
      deliveryAddress: null,
      savedAddressCount: 0,
      selectedPayMethod: '',
      selectedCoupon: null,
      selectedUserCouponId: null,
      availableCoupons: [],
      payMethods: []
    }
  },
  computed: {
    rawTotal() {
      return this.items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0)
    },
    bizType() {
      return normalizeBizType(this.shop?.merchantType || this.shop?.merchant_type || this.shop?.orderType)
    },
    packagingFee() {
      return 1
    },
    deliveryPrice() {
      if (!this.shop) return 0
      const value = Number(this.shop.deliveryPrice)
      return Number.isFinite(value) ? value : 0
    },
    discountAmount() {
      if (!this.selectedCoupon) return 0
      const coupon = this.selectedCoupon
      if (this.rawTotal < Number(coupon.minAmount || 0)) return 0
      if (coupon.type === 'fixed') {
        return Math.min(Number(coupon.amount || 0), this.rawTotal)
      }
      if (coupon.type === 'percent') {
        const discount = this.rawTotal * (Number(coupon.amount || 0) / 100)
        const maxDiscount = Number(coupon.maxDiscount || 0)
        return maxDiscount > 0 ? Math.min(discount, maxDiscount) : discount
      }
      return 0
    },
    finalTotal() {
      return Math.max(0, this.rawTotal + this.packagingFee + this.deliveryPrice - this.discountAmount)
    },
    finalTotalDisplay() {
      return (Number(this.finalTotal) || 0).toFixed(2)
    },
    deliveryAddressTitle() {
      if (!this.deliveryAddress) return '请选择收货地址'
      return this.detailParts(this.deliveryAddress.detail).place
    },
    deliveryAddressSubtitle() {
      if (!this.deliveryAddress) {
        return this.savedAddressCount > 0 ? '请选择一个收货地址后再提交订单' : '暂无收货地址，点击前往新增'
      }
      const parts = this.detailParts(this.deliveryAddress.detail)
      const contact = [this.deliveryAddress.name, this.deliveryAddress.phone].filter(Boolean).join(' ')
      return [parts.area, contact].filter(Boolean).join(' · ')
    },
    deliveryAddressPayload() {
      if (!this.deliveryAddress) return ''
      return [this.deliveryAddress.detail, this.deliveryAddress.name, this.deliveryAddress.phone].filter(Boolean).join(' ')
    },
    deliveryScheduleTitle() {
      return this.bizType === 'groupbuy' ? '到店核销' : '立即送出'
    },
    deliveryScheduleSubtitle() {
      return this.bizType === 'groupbuy' ? '下单后自动发券，可到店使用' : '预计 30 分钟内送达'
    },
    remarkText() {
      return String(this.orderState.remark || '').trim()
    },
    tablewareText() {
      switch (this.orderState.tableware) {
        case 0:
          return '不需要餐具'
        case 1:
          return '1 套'
        case 2:
          return '2 套'
        case 3:
          return '3 套以上'
        default:
          return ''
      }
    },
    couponSummaryText() {
      if (this.selectedCoupon) {
        return `已选 ${this.selectedCoupon.name || '优惠券'} -￥${this.discountAmount.toFixed(2)}`
      }
      if (this.availableCoupons.length > 0) {
        return `${this.availableCoupons.length} 张可用`
      }
      return '暂无可用'
    }
  },
  async onLoad(query) {
    if (uni.getStorageSync('authMode') !== 'user') {
      uni.redirectTo({ url: '/pages/auth/login/index' })
      return
    }

    await this.syncDeliveryAddress()

    const shopId = String(query?.shopId || '').trim()
    const cartStr = query?.cart
    if (!shopId || !cartStr) {
      uni.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
      return
    }

    try {
      uni.showLoading({ title: '加载中...' })
      const shopData = await fetchShopDetail(shopId)
      if (shopData) {
        this.shop = shopData
      }

      const cartObj = JSON.parse(decodeURIComponent(cartStr))
      const productIds = [...new Set(Object.keys(cartObj).map((id) => String(id)))]
      const products = await Promise.all(
        productIds.map((id) =>
          fetchProductDetail(id).catch((error) => {
            console.error(`加载商品 ${id} 失败:`, error)
            return null
          })
        )
      )

      this.items = products
        .filter(Boolean)
        .map((product) => {
          const qty = Number(cartObj[product.id] || cartObj[String(product.id)] || 0)
          if (qty <= 0) return null
          return {
            id: String(product.id),
            name: product.name,
            qty,
            price: Number(product.price) || 0,
            image: product.image || ''
          }
        })
        .filter(Boolean)

      await this.loadAvailableCoupons(shopId)
      await this.loadPaymentOptions()
    } catch (error) {
      console.error('加载订单信息失败:', error)
      uni.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      uni.hideLoading()
      this.loading = false
    }
  },
  onShow() {
    void this.syncDeliveryAddress()
  },
  methods: {
    itemTotal(item) {
      return (((Number(item.price) || 0) * (Number(item.qty) || 0)) || 0).toFixed(2)
    },
    async loadPaymentOptions() {
      this.paymentOptionsLoading = true
      try {
        const response = await request({
          url: '/api/payment/options',
          method: 'GET',
          data: {
            userType: 'customer',
            platform: CLIENT_PLATFORM,
            scene: 'order_payment'
          }
        })
        this.payMethods = normalizePayMethods(response)
      } catch (error) {
        console.error('加载订单支付方式失败:', error)
        this.payMethods = fallbackPayMethods()
      } finally {
        const availableValues = this.payMethods.map((item) => item.value)
        if (!availableValues.includes(this.selectedPayMethod)) {
          this.selectedPayMethod = availableValues[0] || ''
        }
        this.paymentOptionsLoading = false
      }
    },
    payMethodLabel(value) {
      return this.payMethods.find((item) => item.value === value)?.label || '未选择'
    },
    detailParts(detail) {
      const text = String(detail || '').trim()
      if (!text) return { area: '收货地址', place: '请完善收货地址' }
      const firstGap = text.indexOf(' ')
      if (firstGap === -1) return { area: '收货地址', place: text }
      const area = text.slice(0, firstGap).trim()
      const place = text.slice(firstGap + 1).trim() || area
      return { area, place }
    },
    async syncDeliveryAddress() {
      const cachedAddresses = normalizeAddresses(uni.getStorageSync('addresses'))
      let addresses = cachedAddresses
      const profile = uni.getStorageSync('userProfile') || {}
      const userId = String(profile.id || profile.userId || profile.phone || '').trim()

      if (userId) {
        try {
          const serverAddresses = normalizeAddresses(await fetchUserAddresses(userId))
          if (serverAddresses.length > 0 || cachedAddresses.length === 0) {
            addresses = serverAddresses
          }
          if (serverAddresses.length > 0) {
            uni.setStorageSync('addresses', serverAddresses)
          }
        } catch (error) {
          console.error('同步收货地址失败:', error)
        }
      }

      const selectedAddressId = String(uni.getStorageSync('selectedAddressId') || '').trim()
      const selectedAddress = String(uni.getStorageSync('selectedAddress') || '').trim()
      this.savedAddressCount = addresses.length

      let matched = null
      if (selectedAddressId) {
        matched = addresses.find((addr) => addr.id === selectedAddressId) || null
      }
      if (!matched && selectedAddress) {
        matched = addresses.find((addr) => addr.detail === selectedAddress) || null
      }
      if (!matched) {
        matched = addresses.find((addr) => addr.isDefault) || null
      }
      if (!matched && addresses.length === 1) {
        matched = addresses[0]
      }

      if (matched) {
        uni.setStorageSync('selectedAddressId', matched.id)
        uni.setStorageSync('selectedAddress', matched.detail)
      } else {
        uni.removeStorageSync('selectedAddressId')
        uni.removeStorageSync('selectedAddress')
      }

      this.deliveryAddress = matched
    },
    goAddressList() {
      uni.navigateTo({ url: '/pages/profile/address-list/index?select=1' })
    },
    isHtmlErrorPayload(payload) {
      return typeof payload === 'string' && payload.includes('<!DOCTYPE html>')
    },
    extractErrorMessage(err) {
      const rawMessage = err?.data?.error || err?.error || err?.message || ''
      return typeof rawMessage === 'string' ? rawMessage.trim() : ''
    },
    async loadAvailableCoupons(shopId) {
      try {
        const profile = uni.getStorageSync('userProfile') || {}
        const userId = profile.phone || profile.id || profile.userId
        if (!userId) return

        const res = await request({
          url: '/api/coupons/available',
          method: 'GET',
          data: {
            userId: String(userId),
            shopId,
            orderAmount: this.rawTotal
          }
        })

        this.availableCoupons = Array.isArray(res?.data) ? res.data : []
      } catch (error) {
        const htmlPayload = error?.data?.data || error?.data
        if (!this.isHtmlErrorPayload(htmlPayload)) {
          console.error('加载优惠券失败:', error)
        }
      }
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
    async payOrder(orderId, userId, token) {
      const idempotencyKey = this.createIdempotencyKey('orderpay', userId)
      return request({
        url: '/api/payment/intent',
        method: 'POST',
        data: {
          userId,
          userType: 'customer',
          platform: CLIENT_PLATFORM,
          orderId: String(orderId),
          amount: Math.round((Number(this.finalTotal) || 0) * 100),
          paymentMethod: this.selectedPayMethod,
          paymentChannel: this.payChannelByMethod(this.selectedPayMethod),
          idempotencyKey
        },
        header: Object.assign(
          token ? { Authorization: `Bearer ${token}` } : {},
          { 'Idempotency-Key': idempotencyKey }
        )
      })
    },
    async submitOrder() {
      if (this.submitting) return
      if (!this.deliveryAddress) {
        uni.showToast({
          title: this.savedAddressCount > 0 ? '请先选择收货地址' : '请先新增收货地址',
          icon: 'none'
        })
        setTimeout(() => this.goAddressList(), 300)
        return
      }

      const profile = uni.getStorageSync('userProfile') || {}
      const userId = profile.phone || profile.id || profile.userId || ''
      const token = uni.getStorageSync('token') || ''
      if (!this.selectedPayMethod) {
        uni.showToast({ title: '当前没有可用支付方式', icon: 'none' })
        return
      }
      const payload = {
        shopId: this.shop ? String(this.shop.id || '').trim() : '',
        shopName: this.shop ? this.shop.name : 'Unknown Shop',
        bizType: this.bizType,
        items: this.items.map((item) => `${item.name} x${item.qty}`).join(', '),
        price: Number(this.finalTotal) || 0,
        originalPrice: Number(this.rawTotal) || 0,
        discountAmount: Number(this.discountAmount) || 0,
        userCouponId: this.selectedUserCouponId || null,
        remark: this.remarkText,
        tableware: this.tablewareText,
        addressId: this.deliveryAddress.id,
        address: this.deliveryAddressPayload,
        name: this.deliveryAddress.name,
        userId: String(userId),
        phone: this.deliveryAddress.phone || profile.phone || ''
      }

      this.submitting = true
      uni.showLoading({ title: '提交中...' })
      try {
        const res = await createOrder(payload)
        if (!res || !res.id) {
          throw new Error('订单创建失败')
        }

        const paymentResult = await this.payOrder(res.id, userId, token)
        const paymentStatus = String((paymentResult && paymentResult.status) || '').trim()
        if (paymentStatus && paymentStatus !== 'success') {
          uni.showToast({ title: '订单已创建，请继续完成支付', icon: 'none' })
          setTimeout(() => {
            uni.navigateTo({ url: `/pages/order/detail/index?id=${encodeURIComponent(res.id || '')}` })
          }, 220)
          return
        }

        const multiplier = Number(uni.getStorageSync('vipPointsMultiplier')) || 1
        const orderTotal = Number(this.finalTotal) || 0
        if (userId && res.id) {
          earnPoints({
            userId,
            orderId: String(res.id),
            amount: orderTotal,
            multiplier
          })
            .then((pointsRes) => {
              if (pointsRes && typeof pointsRes.balance === 'number') {
                uni.setStorageSync('pointsBalance', pointsRes.balance)
              }
            })
            .catch(() => {})
        }

        uni.navigateTo({ url: `/pages/pay/success/index?orderId=${encodeURIComponent(res.id || '')}` })
      } catch (error) {
        const message = this.extractErrorMessage(error)
        const isInsufficientBalance = /insufficient balance|available balance is not enough|余额不足/i.test(message)
        if (isInsufficientBalance && this.selectedPayMethod === 'ifpay') {
          uni.showToast({ title: '余额不足，请先充值', icon: 'none' })
          return
        }
        console.error('支付失败:', error)
        uni.showToast({ title: message || '支付失败，请重试', icon: 'none' })
      } finally {
        uni.hideLoading()
        this.submitting = false
      }
    },
    goRemark() {
      uni.navigateTo({ url: '/pages/order/remark/index' })
    },
    goTableware() {
      uni.navigateTo({ url: '/pages/order/tableware/index' })
    },
    goCoupon() {
      if (this.availableCoupons.length === 0) {
        uni.showToast({ title: '暂无可用优惠券', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: `/pages/order/coupon/index?shopId=${this.shop.id}&amount=${this.rawTotal}`
      })
    }
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
