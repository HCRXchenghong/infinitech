<template>
  <view class="page shop-list">
    <scroll-view scroll-y class="list">
      <view
        v-for="shop in shops"
        :key="shop.id"
        class="card"
        @tap="goDetail(shop.id)"
      >
        <view class="logo">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="#FFF7ED"/>
            <path d="M9 22V12H15V22" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </view>
        <view class="info">
          <text class="name">{{ shop.name }}</text>
          <view class="meta">
            <text class="rating">评分 {{ shop.rating }}</text>
            <text class="sales">月售 {{ shop.monthlySales }}</text>
          </view>
          <view class="meta">
            <text>起送 ¥{{ shop.minPrice }}</text>
            <text class="dot">·</text>
            <text>配送 ¥{{ shop.deliveryPrice }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchShops } from '@/shared-ui/api.js'

export default {
  data() {
    return {
      shops: [],
      loading: false
    }
  },
  onLoad() {
    this.loadShops()
  },
  methods: {
    async loadShops() {
      this.loading = true
      try {
        const data = await fetchShops()
        if (Array.isArray(data)) {
          this.shops = data
        }
      } catch (error) {
        console.error('加载商家列表失败:', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    goDetail(id) {
      uni.navigateTo({ url: '/pages/shop/detail/index?id=' + id })
    }
  }
}
</script>

<style scoped lang="scss">
.shop-list {
  min-height: 100vh;
  background: #f4f4f4;
}

.list {
  height: 100%;
  padding: 10px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  margin-bottom: 10px;
}

.logo {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: #FFF7ED;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
}

.logo svg {
  width: 100%;
  height: 100%;
}

.info {
  flex: 1;
}

.name {
  font-size: 15px;
  font-weight: 600;
}

.meta {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.rating {
  margin-right: 6px;
}

.dot {
  margin: 0 4px;
}
</style>

