<template>
  <view class="product-detail-page">
    <!-- 顶部导航（固定在顶部） -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text>‹</text>
      </view>
      <view class="nav-actions">
        <view class="action-btn">
          <text>♡</text>
        </view>
        <view class="action-btn">
          <text>↗</text>
        </view>
      </view>
    </view>

    <!-- 顶部大图 -->
    <view class="hero-section">
      <image class="hero-image" :src="product.image" mode="aspectFill" />
      <view class="hero-gradient"></view>
    </view>

    <!-- 商品信息 -->
    <view class="product-content">
      <!-- 基本信息卡片 -->
      <view class="info-card">
        <view class="price-row">
          <text class="price-symbol">¥</text>
          <text class="price">{{ product.price }}</text>
          <text v-if="product.originalPrice" class="original-price">¥{{ product.originalPrice }}</text>
          <view v-if="product.tag" class="product-tag">{{ product.tag }}</view>
        </view>

        <text class="product-name">{{ product.name }}</text>

        <view class="product-meta">
          <text>月售{{ product.sales || 0 }}</text>
          <text>好评率{{ product.likeRate || 95 }}%</text>
        </view>

        <!-- 商家信息 -->
        <view class="shop-row" @tap="goShopDetail">
          <view class="shop-logo">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="#FFF7ED"/>
              <path d="M9 22V12H15V22" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </view>
          <text class="shop-name">{{ product.shopName }}</text>
          <text class="arrow">›</text>
        </view>
      </view>

      <!-- 营养成分 -->
      <view v-if="product.nutrition" class="section-card">
        <text class="section-title">营养成分（每份）</text>
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

      <!-- 商品详情 -->
      <view class="section-card">
        <text class="section-title">商品详情</text>
        <text class="detail-text">{{ product.detail || '精选优质食材，匠心烹饪，还原地道风味。适合各类人群食用，美味健康。' }}</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-action">
      <view class="action-left">
        <view class="action-item" @tap="goShopDetail">
          <image class="action-icon" src="/static/icons/shop.png" mode="aspectFit" />
          <text class="action-text">店铺</text>
        </view>
        <view class="action-item">
          <image class="action-icon" src="/static/icons/service.png" mode="aspectFit" />
          <text class="action-text">客服</text>
        </view>
      </view>

      <view class="action-right">
        <button class="add-cart-btn" @tap="addToCart">
          <text>加入购物车 ¥{{ (product.price || 0).toFixed(2) }}</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchProductDetail } from '@/shared-ui/api.js'

export default {
  data() {
    return {
      product: {
        price: 0,
        name: '',
        image: '',
        shopName: '',
        sales: 0,
        likeRate: 95
      },
      loading: true
    }
  },
  async onLoad(query) {
    const id = String((query && query.id) || '').trim()
    const shopId = String((query && query.shopId) || '').trim()

    if (!id) {
      uni.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
      return
    }

    try {
      uni.showLoading({ title: '加载中...' })
      const data = await fetchProductDetail(id)

      if (data) {
        // 处理nutrition字段（如果是JSON字符串需要解析）
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
              data.image = imagesArray[0] // 使用第一张图片作为主图
            }
          } catch (e) {
            console.error('解析图片失败:', e)
          }
        }

        // 设置shopId（如果query中有）
        if (shopId) {
          data.shopId = shopId
        }

        // 设置好评率（从rating计算）
        if (data.rating) {
          data.likeRate = Math.round(data.rating * 20) // 5分制转100分制
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
        setTimeout(() => uni.navigateBack(), 1500)
      }

      uni.hideLoading()
      this.loading = false
    } catch (error) {
      console.error('加载商品详情失败:', error)
      uni.hideLoading()
      this.loading = false
      uni.showToast({ title: '加载失败', icon: 'none' })
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    goShopDetail() {
      if (this.product.shopId) {
        uni.navigateTo({
          url: '/pages/shop/detail/index?id=' + this.product.shopId
        })
      }
    },
    addToCart() {
      // 保存到购物车（默认1件）
      if (this.product.shopId && this.product.id) {
        try {
          const cartKey = `cart_${this.product.shopId}`
          const cartStr = uni.getStorageSync(cartKey) || '{}'
          const cart = JSON.parse(cartStr)
          cart[this.product.id] = (cart[this.product.id] || 0) + 1
          uni.setStorageSync(cartKey, JSON.stringify(cart))
          
          // 触发购物车更新事件
          uni.$emit('cartUpdated', { shopId: this.product.shopId })
        } catch (e) {
          console.error('保存购物车失败:', e)
        }
      }

      // 直接跳转到商家点餐页
      if (this.product.shopId) {
        uni.redirectTo({
          url: '/pages/shop/menu/index?id=' + this.product.shopId
        })
      }
    }
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
