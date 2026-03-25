<template>
  <view class="page confirm">
    <view class="card address" @tap="goAddressList">
      <view class="row between">
        <text class="title">{{ deliveryAddressTitle }}</text>
        <text class="arrow">›</text>
      </view>
      <text class="sub">{{ deliveryAddressSubtitle }}</text>
      <view class="row between time">
        <text class="bold">立即送出</text>
        <text class="primary">预计 12:30 送达</text>
      </view>
    </view>

    <view class="card shop" v-if="shop">
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
        <text class="price">¥{{ ((Number(item.price) || 0) * (Number(item.qty) || 0)).toFixed(2) }}</text>
      </view>

      <view class="row between line">
        <text>打包费</text>
        <text class="price">¥1.00</text>
      </view>
      <view class="row between line">
        <text>配送费</text>
        <text class="price">¥{{ deliveryPrice.toFixed(2) }}</text>
      </view>
      <view v-if="discountAmount > 0" class="row between line discount">
        <text>优惠券</text>
        <text class="price">- ¥{{ discountAmount.toFixed(2) }}</text>
      </view>
      <view class="row justify-end total-row">
        <text v-if="discountAmount > 0" class="save">已优惠 ¥{{ discountAmount.toFixed(2) }}</text>
        <text>小计</text>
        <text class="total">¥{{ finalTotalDisplay }}</text>
      </view>
    </view>

    <view class="card">
      <view class="row between" @tap="goRemark">
        <text>备注</text>
        <text class="gray">
          {{ remarkText || '口味、偏好等 ›' }}
        </text>
      </view>
      <view class="row between" @tap="goTableware">
        <text>餐具数量</text>
        <text class="gray">
          {{ tablewareText || '未选择 ›' }}
        </text>
      </view>
      <view class="row between" @tap="goCoupon">
        <text>优惠券</text>
        <text class="gray">
          {{ selectedCoupon ? `已选 -¥${discountAmount.toFixed(2)}` : (availableCoupons.length > 0 ? `${availableCoupons.length}张可用 ›` : '暂无可用 ›') }}
        </text>
      </view>
    </view>

    <view class="card pay-method-card">
      <view class="row between pay-method-header">
        <text class="pay-method-title">支付方式</text>
        <text class="pay-method-current">{{ payMethodLabel(selectedPayMethod) }}</text>
      </view>
      <view class="pay-method-list">
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
        <text class="big">¥{{ finalTotalDisplay }}</text>
        <text v-if="discountAmount > 0" class="hint"> | 已优惠¥{{ discountAmount.toFixed(2) }}</text>
      </view>
      <button class="pay-btn" @tap="submitOrder">提交订单</button>
    </view>
  </view>
</template>

<script>
import { fetchShopDetail, fetchProductDetail, createOrder, earnPoints, fetchUserAddresses, request } from '@/shared-ui/api.js'
import { useUserOrderStore } from '@/shared-ui/userOrderStore.js'

export default {
  data() {
    return {
      shop: null,
      items: [],
      orderState: useUserOrderStore().state,
      submitting: false,
      loading: true,
      deliveryAddress: null,
      savedAddressCount: 0,
      selectedPayMethod: 'ifpay',
      selectedCoupon: null, // 选中的优惠券
      selectedUserCouponId: null, // 选中的用户优惠券ID
      availableCoupons: [], // 可用优惠券列表
      payMethods: [
        { value: 'ifpay', label: 'IF-Pay 余额支付', tip: '优先使用钱包余额' },
        { value: 'wechat', label: '微信支付', tip: '推荐微信用户选择' },
        { value: 'alipay', label: '支付宝支付', tip: '适合支付宝用户' }
      ]
    }
  },
  computed: {
    rawTotal() {
      return this.items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0)
    },
    deliveryPrice() {
      if (!this.shop) return 0
      const price = Number(this.shop.deliveryPrice)
      return isNaN(price) ? 0 : price
    },
    packagingFee() {
      return 1 // 打包费固定1元
    },
    discountAmount() {
      if (!this.selectedCoupon) return 0
      const coupon = this.selectedCoupon
      // 检查是否满足使用条件
      if (this.rawTotal < coupon.minAmount) return 0

      if (coupon.type === 'fixed') {
        // 固定金额优惠
        return Math.min(coupon.amount, this.rawTotal)
      } else if (coupon.type === 'percent') {
        // 百分比优惠
        const discount = this.rawTotal * (coupon.amount / 100)
        return Math.min(discount, coupon.maxDiscount || discount)
      }
      return 0
    },
    finalTotal() {
      if (!this.shop) return 0
      return Math.max(0, this.rawTotal + this.packagingFee + this.deliveryPrice - this.discountAmount)
    },
    finalTotalDisplay() {
      const total = Number(this.finalTotal)
      return isNaN(total) ? '0.00' : total.toFixed(2)
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
    remarkText() {
      return this.orderState.remark
    },
    tablewareText() {
      const t = this.orderState.tableware
      if (t === 0) return '不需要餐具'
      if (t === 1) return '1 套'
      if (t === 2) return '2 套'
      if (t === 3) return '3 套以上'
      return ''
    },
    payMethodLabel() {
      return (value) => {
        return {
          ifpay: 'IF-Pay 余额支付',
          wechat: '微信支付',
          alipay: '支付宝支付'
        }[value] || 'IF-Pay 余额支付'
      }
    }
  },
  async onLoad(query) {
    if (uni.getStorageSync('authMode') !== 'user') {
      uni.redirectTo({ url: '/pages/auth/login/index' })
      return
    }

    this.syncDeliveryAddress()

    const shopId = String((query && query.shopId) || '').trim()
    const cartStr = query && query.cart

    if (!shopId || !cartStr) {
      uni.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
      return
    }

    try {
      uni.showLoading({ title: '加载中...' })

      // 加载商家信息
      const shopData = await fetchShopDetail(shopId)
      if (shopData) {
        this.shop = shopData
      }

      // 解析购物车数据
      const cartObj = JSON.parse(decodeURIComponent(cartStr))
      const productIds = Object.keys(cartObj).map(id => String(id))

      // 去重商品ID
      const uniqueProductIds = [...new Set(productIds)]

      // 并行加载所有商品详情
      const productPromises = uniqueProductIds.map(id =>
        fetchProductDetail(id).catch(err => {
          console.error(`加载商品${id}失败:`, err)
          return null
        })
      )

      const products = await Promise.all(productPromises)

      // 构建订单商品列表
      const list = []
      products.forEach((product) => {
        if (product) {
          const qty = cartObj[product.id]
          if (qty > 0) {
            list.push({
              id: product.id,
              name: product.name,
              qty: qty,
              price: product.price,
              image: product.image
            })
          }
        }
      })

      this.items = list
      uni.hideLoading()
      this.loading = false

      // 加载可用优惠券
      this.loadAvailableCoupons(shopId)
    } catch (e) {
      console.error('加载订单信息失败:', e)
      uni.hideLoading()
      this.loading = false
      uni.showToast({ title: '加载失败', icon: 'none' })
    }
  },
  onShow() {
    this.syncDeliveryAddress()
  },
  methods: {
    normalizeAddresses(raw) {
      if (!Array.isArray(raw)) return []
      return raw
        .map((addr) => this.normalizeAddress(addr))
        .filter(Boolean)
    },
    normalizeAddress(addr) {
      if (!addr || typeof addr !== 'object') return null
      const id = String(addr.id || '').trim()
      const detail = String(addr.fullAddress || addr.detail || '').trim()
      const name = String(addr.name || '').trim()
      const phone = String(addr.phone || '').trim()
      const tag = String(addr.tag || '').trim()
      if (!id || !detail || !name) return null
      return { id, detail, fullAddress: detail, name, phone, tag, isDefault: Boolean(addr.isDefault) }
    },
    async syncDeliveryAddress() {
      let addresses = this.normalizeAddresses(uni.getStorageSync('addresses'))
      if (addresses.length === 0) {
        const profile = uni.getStorageSync('userProfile') || {}
        const userId = String(profile.id || profile.userId || profile.phone || '').trim()
        if (userId) {
          try {
            addresses = this.normalizeAddresses(await fetchUserAddresses(userId))
            if (addresses.length > 0) {
              uni.setStorageSync('addresses', addresses)
            }
          } catch (error) {
            // fallback to local cache only
          }
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
        uni.setStorageSync('selectedAddressId', matched.id)
        uni.setStorageSync('selectedAddress', matched.detail)
      } else if (!matched && selectedAddress) {
        uni.removeStorageSync('selectedAddressId')
        uni.removeStorageSync('selectedAddress')
      } else if (matched) {
        uni.setStorageSync('selectedAddressId', matched.id)
        uni.setStorageSync('selectedAddress', matched.detail)
      }

      this.deliveryAddress = matched
    },
    detailParts(detail) {
      const text = String(detail || '').trim()
      if (!text) {
        return { area: '收货地址', place: '请完善收货地址' }
      }
      const firstGap = text.indexOf(' ')
      if (firstGap === -1) {
        return { area: '收货地址', place: text }
      }
      const area = text.slice(0, firstGap).trim()
      const place = text.slice(firstGap + 1).trim() || area
      return { area, place }
    },
    goAddressList() {
      uni.navigateTo({ url: '/pages/profile/address-list/index?select=1' })
    },
    isHtmlErrorPayload(payload) {
      return typeof payload === 'string' && payload.includes('<!DOCTYPE html>')
    },
    extractErrorMessage(err) {
      const rawMessage = err?.data?.error || err?.error || err?.message || ''
      if (typeof rawMessage === 'string') return rawMessage.trim()
      return ''
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
            shopId: shopId,
            orderAmount: this.rawTotal
          }
        })

        if (res && Array.isArray(res.data)) {
          this.availableCoupons = res.data
        }
      } catch (err) {
        const htmlPayload = err?.data?.data || err?.data
        if (!this.isHtmlErrorPayload(htmlPayload)) {
          console.error('加载优惠券失败:', err)
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
      const totalAmount = Number(this.finalTotal) || 0
      const res = await request({
        url: '/api/wallet/payment',
        method: 'POST',
        data: {
          userId,
          userType: 'customer',
          orderId: String(orderId),
          amount: Math.round(totalAmount * 100),
          paymentMethod: this.selectedPayMethod,
          paymentChannel: this.payChannelByMethod(this.selectedPayMethod),
          idempotencyKey
        },
        header: Object.assign(
          token ? { Authorization: `Bearer ${token}` } : {},
          { 'Idempotency-Key': idempotencyKey }
        )
      })
      return res
    },
    submitOrder() {
      if (this.submitting) return
      if (!this.deliveryAddress) {
        uni.showToast({
          title: this.savedAddressCount > 0 ? '请先选择收货地址' : '请先新增收货地址',
          icon: 'none'
        })
        setTimeout(() => {
          this.goAddressList()
        }, 300)
        return
      }
      this.submitting = true

      const profile = uni.getStorageSync('userProfile') || {}
      // 优先使用phone作为userId，确保与订单表的user_id字段一致
      const userId = profile.phone || profile.id || profile.userId || ''
      const token = uni.getStorageSync('token') || ''
      const bizTypeRaw = String(this.shop?.merchantType || this.shop?.merchant_type || this.shop?.orderType || '').toLowerCase()
      const bizType = (bizTypeRaw.includes('groupbuy') || bizTypeRaw.includes('团购')) ? 'groupbuy' : 'takeout'
      const payload = {
        shopId: this.shop ? String(this.shop.id || '').trim() : '',
        shopName: this.shop ? this.shop.name : 'Unknown Shop',
        bizType,
        items: this.items.map(i => `${i.name} x${i.qty}`).join(', '),
        price: Number(this.finalTotal) || 0,
        originalPrice: Number(this.rawTotal) || 0,
        discountAmount: Number(this.discountAmount) || 0,
        userCouponId: this.selectedUserCouponId || null,
        remark: this.remarkText,
        tableware: this.tablewareText,
        addressId: this.deliveryAddress.id,
        address: this.deliveryAddressPayload,
        name: this.deliveryAddress.name,
        userId: String(userId), // 确保是字符串类型
        phone: this.deliveryAddress.phone || profile.phone || ''
      }

      uni.showLoading({ title: '提交中...' })

      createOrder(payload)
        .then(async (res) => {
          if (!res || !res.id) {
            throw new Error('订单创建失败')
          }
          await this.payOrder(res.id, userId, token)
          uni.hideLoading()
          this.submitting = false
          const multiplier = Number(uni.getStorageSync('vipPointsMultiplier')) || 1
          const orderTotal = Number(this.finalTotal) || 0
          if (userId && res.id) {
            earnPoints({
              userId,
              orderId: String(res.id),
              amount: orderTotal,
              multiplier
            }).then((pointsRes) => {
              if (pointsRes && typeof pointsRes.balance === 'number') {
                uni.setStorageSync('pointsBalance', pointsRes.balance)
              }
            }).catch(() => {})
          }
          // 跳转成功页，并传递订单ID
          uni.navigateTo({ url: '/pages/pay/success/index?orderId=' + (res.id || '') })
        })
        .catch((err) => {
          uni.hideLoading()
          this.submitting = false
          const message = this.extractErrorMessage(err)
          const isInsufficientBalance = /insufficient balance|available balance is not enough|余额不足/i.test(message)
          if (isInsufficientBalance && this.selectedPayMethod === 'ifpay') {
            uni.showToast({ title: '余额不足，请先充值', icon: 'none' })
            return
          }
          console.error('支付失败:', err)
          uni.showToast({ title: message || '支付失败，请重试', icon: 'none' })
        })
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
      // 跳转到优惠券选择页面
      uni.navigateTo({
        url: `/pages/order/coupon/index?shopId=${this.shop.id}&amount=${this.rawTotal}`
      })
    }
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
