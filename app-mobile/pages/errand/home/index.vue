<template>
  <view class="page errand-home">
    <PageHeader :title="pageTitle" />

    <scroll-view scroll-y class="content">
      <view class="hero-card">
        <text class="hero-title">{{ heroTitle }}</text>
        <text class="hero-desc">{{ heroDesc }}</text>
      </view>

      <view v-if="!featureEnabled" class="empty-card">
        <text class="empty-title">当前服务暂未开放</text>
        <text class="empty-desc">跑腿服务已在后台关闭，请稍后再试</text>
      </view>

      <view v-else class="service-list">
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

      <view v-if="featureEnabled && detailTip" class="detail-tip">
        <text>{{ detailTip }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import PageHeader from '@/components/PageHeader.vue'
import { fetchOrders } from '@/shared-ui/api.js'
import { getCurrentUserIdentity, isErrandOrder, mapErrandOrderSummary } from '@/shared-ui/errand.js'
import { isRuntimeRouteEnabled, loadPlatformRuntimeSettings } from '@/shared-ui/platform-runtime.js'
import { buildErrandHomeViewModel } from '../../../../packages/domain-core/src/errand-settings.js'

export default {
  components: { PageHeader },
  data() {
    const errandHome = buildErrandHomeViewModel()
    return {
      featureEnabled: true,
      pageTitle: errandHome.pageTitle,
      heroTitle: errandHome.heroTitle,
      heroDesc: errandHome.heroDesc,
      detailTip: errandHome.detailTip,
      services: errandHome.services,
      recentOrders: [],
      loadingRecent: false
    }
  },
  onLoad() {
    this.loadRuntime()
    this.loadRecentOrders()
  },
  onShow() {
    this.loadRuntime()
    this.loadRecentOrders()
  },
  methods: {
    async loadRuntime() {
      try {
        const runtime = await loadPlatformRuntimeSettings()
        this.featureEnabled = isRuntimeRouteEnabled(runtime, 'feature', 'errand', 'app-mobile')
        const errandHome = buildErrandHomeViewModel(runtime.errandSettings || {})
        this.pageTitle = errandHome.pageTitle
        this.heroTitle = errandHome.heroTitle
        this.heroDesc = errandHome.heroDesc
        this.detailTip = errandHome.detailTip
        this.services = errandHome.services
      } catch (error) {
        console.error('加载跑腿 runtime 失败:', error)
      }
    },
    goService(item) {
      if (!this.featureEnabled) {
        uni.showToast({ title: '当前服务暂未开放', icon: 'none' })
        return
      }
      if (item.serviceFeeHint) {
        uni.showToast({ title: item.serviceFeeHint, icon: 'none' })
      }
      const url = item.route
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

.detail-tip {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #eef6ff;
  color: #4b5563;
  font-size: 12px;
  line-height: 1.6;
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
