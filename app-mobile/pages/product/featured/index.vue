<template>
  <view class="page featured-page">
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">今日推荐</text>
      <view class="placeholder" />
    </view>

    <view class="product-list">
      <view
        v-for="item in products"
        :key="item.id"
        class="product-card"
        @tap="goProductDetail(item)"
      >
        <image class="product-image" :src="item.image" mode="aspectFill" />
        <view class="product-info">
          <view class="info-top">
            <text class="product-name">{{ item.name }}</text>
            <view v-if="item.tag" class="tags">
              <text class="tag">{{ item.tag }}</text>
            </view>
            <text class="product-desc">{{ item.detail }}</text>
          </view>

          <view class="info-bottom">
            <view class="shop-row">
              <text class="shop-name">{{ item.shopName }}</text>
            </view>
            <view class="price-row">
              <view class="price-box">
                <text class="symbol">¥</text>
                <text class="price">{{ item.price }}</text>
                <text class="original">¥{{ item.originalPrice }}</text>
              </view>
              <view class="buy-btn">抢购</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="shops.length" class="shop-list">
      <view class="shop-list-title">推荐商户</view>
      <HomeShopCard
        v-for="shop in shops"
        :key="shop.id"
        :shop="shop"
        @shop-tap="goShopDetail"
      />
    </view>
  </view>
</template>

<script>
import HomeShopCard from '@/components/HomeShopCard.vue'
import { fetchHomeFeed } from '@/shared-ui/api.js'
import {
  normalizeFeaturedProductProjection,
  normalizeShopProjection,
} from '@/shared-ui/platform-schema.js'

export default {
  components: {
    HomeShopCard,
  },
  data() {
    return {
      products: [],
      shops: [],
      loading: false,
    }
  },
  onLoad() {
    this.loadHomeFeed()
  },
  methods: {
    async loadHomeFeed() {
      this.loading = true
      try {
        const data = await fetchHomeFeed()
        this.products = Array.isArray(data.products)
          ? data.products.map((item) => normalizeFeaturedProductProjection(item))
          : []
        this.shops = Array.isArray(data.shops)
          ? data.shops.map((item) => normalizeShopProjection(item))
          : []
      } catch (error) {
        console.error('加载首页推荐编排失败:', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
        this.products = []
        this.shops = []
      } finally {
        this.loading = false
      }
    },
    goBack() {
      uni.navigateBack()
    },
    goProductDetail(item) {
      uni.navigateTo({
        url: `/pages/product/detail/index?id=${item.id}&shopId=${item.shopId}`,
      })
    },
    goShopDetail(id) {
      uni.navigateTo({ url: `/pages/shop/detail/index?id=${id}` })
    },
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f6f7;
  padding-top: calc(env(safe-area-inset-top, 0px) + 64px);
  padding-bottom: 20px;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: #fff;
  padding-top: calc(env(safe-area-inset-top, 0px) + 40px);
  padding-bottom: 14px;
  padding-left: 16px;
  padding-right: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.back-arrow {
  font-size: 28px;
  color: #333;
  line-height: 1;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.placeholder {
  width: 20px;
}

.product-list {
  padding: 8px 12px 12px;
}

.shop-list {
  padding: 0 12px 12px;
}

.shop-list-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 6px 0 10px;
}

.product-card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  display: flex;
}

.product-image {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tags {
  margin-bottom: 4px;
}

.tag {
  font-size: 10px;
  color: #ff4d4f;
  background: #fff0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.product-desc {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shop-name {
  font-size: 12px;
  color: #666;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.price-box {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.symbol,
.price {
  color: #ff4d4f;
}

.symbol {
  font-size: 12px;
}

.price {
  font-size: 18px;
  font-weight: 700;
}

.original {
  color: #999;
  font-size: 12px;
  text-decoration: line-through;
}

.buy-btn {
  min-width: 64px;
  text-align: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: #ff4d4f;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
</style>
