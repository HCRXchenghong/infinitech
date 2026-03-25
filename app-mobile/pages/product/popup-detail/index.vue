<template>
  <view class="page product-popup-page">
    <view class="popup-header">
      <view class="back-btn" @tap="goBack">
        <text>‹</text>
      </view>
    </view>
    <view class="popup-image-section">
      <image class="popup-image" :src="product.image" mode="aspectFill" />
    </view>
    <scroll-view scroll-y class="popup-content">
      <text class="popup-name">{{ product.name }}</text>
      <view class="popup-meta">
        <text>月售{{ product.sales }}</text>
        <text>好评率{{ product.likeRate || 95 }}%</text>
      </view>
      <view class="popup-price-row">
        <text class="popup-price-symbol">¥</text>
        <text class="popup-price">{{ product.price }}</text>
        <text v-if="product.originalPrice" class="popup-original">¥{{ product.originalPrice }}</text>
      </view>
      <view v-if="product.nutrition" class="nutrition-section">
        <text class="section-label">营养成分（每份）</text>
        <view class="nutrition-grid">
          <view class="nutrition-item">
            <text class="value">{{ product.nutrition.calories }}</text>
            <text class="label">千卡</text>
          </view>
          <view class="nutrition-item">
            <text class="value">{{ product.nutrition.protein }}g</text>
            <text class="label">蛋白质</text>
          </view>
          <view class="nutrition-item">
            <text class="value">{{ product.nutrition.fat }}g</text>
            <text class="label">脂肪</text>
          </view>
          <view class="nutrition-item">
            <text class="value">{{ product.nutrition.carbs }}g</text>
            <text class="label">碳水</text>
          </view>
        </view>
      </view>
      <view v-if="product.detail" class="detail-section">
        <text class="section-label">商品描述</text>
        <text class="detail-text">{{ product.detail }}</text>
      </view>
    </scroll-view>
    <view class="popup-footer">
      <view class="popup-cart-actions">
        <view v-if="count > 0" class="minus-btn large" @tap="handleMinus">
          <text>−</text>
        </view>
        <text v-if="count > 0" class="item-count large">{{ count }}</text>
        <view class="plus-btn large" @tap="handlePlus">
          <text>+</text>
        </view>
      </view>
      <button class="add-cart-btn" @tap="handleAddCart">
        <text>加入购物车 ¥{{ product.price }}</text>
      </button>
    </view>
  </view>
</template>

<script>
import { fetchProductDetail } from '@/shared-ui/api.js'

export default {
  data() {
    return {
      product: {},
      productId: '',
      shopId: '',
      count: 0,
      loading: true
    }
  },
  async onLoad(query) {
    this.productId = String(query.id || '').trim()
    this.shopId = String(query.shopId || '').trim()

    if (!this.productId) {
      uni.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => this.goBack(), 1500)
      return
    }

    await this.loadProduct()
    this.loadCartCount()
  },
  onShow() {
    this.loadCartCount()
  },
  methods: {
    async loadProduct() {
      try {
        uni.showLoading({ title: '加载中...' })
        const data = await fetchProductDetail(this.productId)

        if (data) {
          // 处理nutrition字段
          if (data.nutrition && typeof data.nutrition === 'string') {
            try {
              data.nutrition = JSON.parse(data.nutrition)
            } catch (e) {
              console.error('解析营养成分失败:', e)
              data.nutrition = null
            }
          }

          // 处理images字段
          if (data.images && typeof data.images === 'string') {
            try {
              const imagesArray = JSON.parse(data.images)
              if (Array.isArray(imagesArray) && imagesArray.length > 0) {
                data.image = imagesArray[0]
              }
            } catch (e) {
              console.error('解析图片失败:', e)
            }
          }

          // 设置好评率
          if (data.rating) {
            data.likeRate = Math.round(data.rating * 20)
          }

          // 设置月销量
          if (data.monthlySales !== undefined) {
            data.sales = data.monthlySales
          }

          // 设置商品描述
          if (data.description) {
            data.detail = data.description
          }

          this.product = data
        } else {
          uni.showToast({ title: '商品不存在', icon: 'none' })
          setTimeout(() => this.goBack(), 1500)
        }

        uni.hideLoading()
        this.loading = false
      } catch (e) {
        console.error('加载商品失败:', e)
        uni.hideLoading()
        this.loading = false
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    loadCartCount() {
      try {
        const cartStr = uni.getStorageSync(`cart_${this.shopId}`) || '{}'
        const cart = JSON.parse(cartStr)
        this.count = cart[this.productId] || 0
      } catch (e) {
        this.count = 0
      }
    },
    saveCart() {
      try {
        const cartStr = uni.getStorageSync(`cart_${this.shopId}`) || '{}'
        const cart = JSON.parse(cartStr)
        if (this.count > 0) {
          cart[this.productId] = this.count
        } else {
          delete cart[this.productId]
        }
        uni.setStorageSync(`cart_${this.shopId}`, JSON.stringify(cart))
        uni.$emit('cartUpdated', { shopId: this.shopId })
      } catch (e) {
        console.error('保存购物车失败:', e)
      }
    },
    handlePlus() {
      if (uni.getStorageSync('authMode') !== 'user') {
        uni.showToast({ title: '请先登录后下单', icon: 'none' })
        uni.navigateTo({ url: '/pages/auth/login/index' })
        return
      }
      this.count++
      this.saveCart()
    },
    handleMinus() {
      if (uni.getStorageSync('authMode') !== 'user') {
        uni.showToast({ title: '请先登录后下单', icon: 'none' })
        uni.navigateTo({ url: '/pages/auth/login/index' })
        return
      }
      if (this.count > 0) {
        this.count--
        this.saveCart()
      }
    },
    handleAddCart() {
      if (uni.getStorageSync('authMode') !== 'user') {
        uni.showToast({ title: '请先登录后下单', icon: 'none' })
        uni.navigateTo({ url: '/pages/auth/login/index' })
        return
      }
      if (this.count === 0) {
        this.count = 1
        this.saveCart()
      }
      uni.showToast({ title: '已加入购物车', icon: 'success' })
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped lang="scss">
.product-popup-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.popup-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding-top: calc(env(safe-area-inset-top, 0px) + 8px);
  padding-bottom: 8px;
  padding-left: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #333;
  font-weight: bold;
}

.popup-image-section {
  width: 100%;
  height: 260px;
  flex-shrink: 0;
}

.popup-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.popup-content {
  flex: 1;
  padding: 24px 20px;
  padding-top: calc(260px + env(safe-area-inset-top, 0px) + 52px);
}

.popup-name {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  display: block;
}

.popup-meta {
  margin-top: 10px;
  font-size: 13px;
  color: #6b7280;
  display: flex;
  gap: 16px;
}

.popup-price-row {
  margin-top: 14px;
  display: flex;
  align-items: baseline;
}

.popup-price-symbol {
  font-size: 16px;
  font-weight: 700;
  color: #ef4444;
}

.popup-price {
  font-size: 28px;
  font-weight: 700;
  color: #ef4444;
}

.popup-original {
  font-size: 14px;
  color: #9ca3af;
  text-decoration: line-through;
  margin-left: 10px;
}

.nutrition-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f3f4f6;
}

.section-label {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
  display: block;
  margin-bottom: 14px;
}

.nutrition-grid {
  display: flex;
  justify-content: space-between;
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
}

.nutrition-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.nutrition-item .value {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.nutrition-item .label {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
}

.detail-section {
  margin-top: 20px;
}

.detail-text {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.7;
  display: block;
}

.popup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border-top: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.popup-cart-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.minus-btn.large,
.plus-btn.large {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
}

.minus-btn.large {
  background: #f3f4f6;
  color: #6b7280;
}

.plus-btn.large {
  background: #009bf5;
  color: #fff;
}

.item-count.large {
  font-size: 20px;
  min-width: 36px;
  text-align: center;
  font-weight: 600;
  color: #1f2937;
}

.add-cart-btn {
  flex: 1;
  height: 50px;
  margin-left: 20px;
  background: linear-gradient(135deg, #009bf5, #0077cc);
  border-radius: 25px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;

  &::after {
    border: none;
  }
}
</style>
