<template>
  <view class="page cart-popup-page">
    <view class="popup-header">
      <text class="popup-title">已选商品</text>
      <text class="clear-cart" @tap="handleClear">🗑 清空</text>
    </view>
    <scroll-view scroll-y class="cart-popup-list">
      <view v-for="item in cartItems" :key="item.id" class="cart-popup-item">
        <view class="item-left">
          <text class="item-name">{{ item.name }}</text>
          <text class="item-desc">{{ item.desc || '' }}</text>
        </view>
        <view class="item-right">
          <text class="item-price">¥{{ (item.price * item.count).toFixed(2) }}</text>
          <view class="cart-actions small">
            <view class="minus-btn" @tap="handleMinus(item)">
              <text>−</text>
            </view>
            <text class="item-count">{{ item.count }}</text>
            <view class="plus-btn" @tap="handlePlus(item)">
              <text>+</text>
            </view>
          </view>
        </view>
      </view>
      <view v-if="cartItems.length === 0" class="empty-cart">
        <text class="empty-icon">🛒</text>
        <text class="empty-text">购物车是空的</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchMenuItems } from '@/shared-ui/api.js'

export default {
  data() {
    return {
      shopId: '',
      cart: {},
      products: [],
      loading: false
    }
  },
  computed: {
    cartItems() {
      const items = []
      Object.keys(this.cart).forEach(id => {
        const product = this.products.find(p => String(p.id) === String(id))
        if (product && this.cart[id] > 0) {
          items.push({
            ...product,
            count: this.cart[id]
          })
        }
      })
      return items
    }
  },
  onLoad(query) {
    if (uni.getStorageSync('authMode') !== 'user') {
      uni.redirectTo({ url: '/pages/auth/login/index' })
      return
    }
    this.shopId = String(query.shopId || '').trim()
    this.loadProducts()
    this.loadCart()
  },
  onShow() {
    if (uni.getStorageSync('authMode') !== 'user') {
      uni.redirectTo({ url: '/pages/auth/login/index' })
      return
    }
    this.loadCart()
  },
  methods: {
    async loadProducts() {
      if (!this.shopId) return
      this.loading = true
      try {
        const data = await fetchMenuItems(this.shopId)
        if (Array.isArray(data)) {
          this.products = data
        } else {
          this.products = []
        }
      } catch (error) {
        console.error('加载商品列表失败:', error)
        this.products = []
      } finally {
        this.loading = false
      }
    },
    loadCart() {
      try {
        const cartStr = uni.getStorageSync(`cart_${this.shopId}`) || '{}'
        this.cart = JSON.parse(cartStr)
      } catch (e) {
        this.cart = {}
      }
    },
    saveCart() {
      try {
        uni.setStorageSync(`cart_${this.shopId}`, JSON.stringify(this.cart))
        uni.$emit('cartUpdated', { shopId: this.shopId })
      } catch (e) {
        console.error('保存购物车失败:', e)
      }
    },
    handlePlus(item) {
      const current = this.cart[item.id] || 0
      this.cart = { ...this.cart, [item.id]: current + 1 }
      this.saveCart()
    },
    handleMinus(item) {
      const current = this.cart[item.id] || 0
      if (current <= 1) {
        const copy = { ...this.cart }
        delete copy[item.id]
        this.cart = copy
      } else {
        this.cart = { ...this.cart, [item.id]: current - 1 }
      }
      this.saveCart()
      if (this.cartItems.length === 0) {
        setTimeout(() => this.goBack(), 300)
      }
    },
    handleClear() {
      uni.showModal({
        title: '确认清空',
        content: '确定要清空购物车吗？',
        success: (res) => {
          if (res.confirm) {
            this.cart = {}
            this.saveCart()
            setTimeout(() => this.goBack(), 300)
          }
        }
      })
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped lang="scss">
.cart-popup-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  padding-top: calc(env(safe-area-inset-top, 0px) + 44px);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  background: #fff;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding-top: calc(env(safe-area-inset-top, 0px) + 16px);
}

.popup-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.clear-cart {
  font-size: 14px;
  color: #6b7280;
}

.cart-popup-list {
  flex: 1;
  padding: 12px 20px;
}

.cart-popup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f5;
}

.cart-popup-item:last-child {
  border-bottom: none;
}

.item-left {
  flex: 1;
  margin-right: 16px;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  display: block;
  margin-bottom: 4px;
}

.item-desc {
  font-size: 12px;
  color: #9ca3af;
  display: block;
}

.item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.item-price {
  font-size: 16px;
  font-weight: 700;
  color: #ef4444;
}

.cart-actions.small {
  display: flex;
  align-items: center;
  gap: 10px;
}

.minus-btn,
.plus-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}

.minus-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.plus-btn {
  background: #009bf5;
  color: #fff;
}

.item-count {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: #9ca3af;
}
</style>
