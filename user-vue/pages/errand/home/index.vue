<template>
  <view class="page errand-home">
    <PageHeader title="跑腿" />

    <scroll-view scroll-y class="content">
      <view class="hero-card">
        <text class="hero-title">同城跑腿</text>
        <text class="hero-desc">帮买、帮送、帮取、帮办统一走真实订单链路</text>
      </view>

      <view class="service-list">
        <view
          v-for="item in services"
          :key="item.id"
          class="service-item"
          @tap="goService(item)"
        >
          <view class="service-icon" :style="{ background: item.color }">
            <text>{{ item.icon }}</text>
          </view>
          <view class="service-info">
            <text class="service-name">{{ item.name }}</text>
            <text class="service-desc">{{ item.desc }}</text>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="recent-section">
        <view class="section-head">
          <text class="section-title">最近订单</text>
          <text v-if="loadingRecent" class="section-meta">加载中...</text>
        </view>

        <view v-if="recentOrders.length === 0" class="empty-card">
          <text class="empty-title">还没有跑腿订单</text>
          <text class="empty-desc">下单后会在这里显示最近记录</text>
        </view>

        <view
          v-for="order in recentOrders"
          :key="order.id"
          class="recent-item"
          @tap="goOrderDetail(order)"
        >
          <view class="recent-main">
            <text class="recent-service">{{ order.serviceName }}</text>
            <text class="recent-item-text">{{ order.item }}</text>
          </view>
          <view class="recent-side">
            <text class="recent-status">{{ order.status }}</text>
            <text class="recent-price">¥{{ formatPrice(order.totalPrice) }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import PageHeader from '@/components/PageHeader.vue'
import { fetchOrders } from '@/shared-ui/api.js'
import { getCurrentUserIdentity, isErrandOrder, mapErrandOrderSummary } from '@/shared-ui/errand.js'

export default {
  components: { PageHeader },
  data() {
    return {
      services: [
        { id: 'buy', name: '帮我买', desc: '代买商品', icon: '购', color: '#ff6b00' },
        { id: 'deliver', name: '帮我送', desc: '同城配送', icon: '送', color: '#009bf5' },
        { id: 'pickup', name: '帮我取', desc: '快递代取', icon: '取', color: '#10b981' },
        { id: 'do', name: '帮我办', desc: '排队代办', icon: '办', color: '#8b5cf6' }
      ],
      recentOrders: [],
      loadingRecent: false
    }
  },
  onLoad() {
    this.loadRecentOrders()
  },
  onShow() {
    this.loadRecentOrders()
  },
  methods: {
    goService(item) {
      const routes = {
        buy: '/pages/errand/buy/index',
        deliver: '/pages/errand/deliver/index',
        pickup: '/pages/errand/pickup/index',
        do: '/pages/errand/do/index'
      }
      const url = routes[item.id]
      if (url) {
        uni.navigateTo({ url })
      }
    },
    async loadRecentOrders() {
      const identity = getCurrentUserIdentity()
      if (!identity.userId) {
        this.recentOrders = []
        return
      }
      this.loadingRecent = true
      try {
        const data = await fetchOrders(identity.userId)
        const list = Array.isArray(data) ? data : []
        this.recentOrders = list.filter(isErrandOrder).slice(0, 5).map(mapErrandOrderSummary)
      } catch (error) {
        console.error('加载跑腿订单失败:', error)
        this.recentOrders = []
      } finally {
        this.loadingRecent = false
      }
    },
    goOrderDetail(order) {
      uni.navigateTo({ url: `/pages/errand/detail/index?id=${encodeURIComponent(order.id)}` })
    },
    formatPrice(value) {
      return (Number(value) || 0).toFixed(2)
    }
  }
}
</script>

<style scoped lang="scss">
.errand-home {
  min-height: 100vh;
  background: #f5f5f5;
}

.content {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 0 12px 16px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 54px);
}

.hero-card {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #009bf5 0%, #4ec5ff 100%);
  color: #fff;
}

.hero-title {
  display: block;
  font-size: 20px;
  font-weight: 600;
}

.hero-desc {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.88);
}

.service-list {
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
}

.service-item {
  display: flex;
  align-items: center;
  padding: 14px 12px;
  border-bottom: 1px solid #f3f4f6;
}

.service-item:last-child {
  border-bottom: none;
}

.service-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  color: #fff;
  font-weight: 600;
}

.service-info {
  flex: 1;
  margin-left: 12px;
}

.service-name {
  display: block;
  font-size: 15px;
  color: #111827;
}

.service-desc {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.arrow {
  font-size: 18px;
  color: #cbd5e1;
}

.recent-section {
  margin-top: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-title {
  font-size: 14px;
  color: #4b5563;
}

.section-meta {
  font-size: 12px;
  color: #9ca3af;
}

.empty-card {
  padding: 18px 14px;
  border-radius: 12px;
  background: #fff;
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 14px;
  color: #111827;
}

.empty-desc {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 14px 12px;
  border-radius: 12px;
  background: #fff;
}

.recent-main {
  flex: 1;
  min-width: 0;
}

.recent-service {
  display: block;
  font-size: 13px;
  color: #009bf5;
  font-weight: 600;
}

.recent-item-text {
  display: block;
  margin-top: 6px;
  font-size: 14px;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-side {
  margin-left: 12px;
  text-align: right;
}

.recent-status {
  display: block;
  font-size: 12px;
  color: #f97316;
}

.recent-price {
  display: block;
  margin-top: 6px;
  font-size: 14px;
  color: #111827;
  font-weight: 600;
}
</style>
