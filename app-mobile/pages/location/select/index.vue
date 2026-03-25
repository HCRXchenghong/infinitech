<template>
  <view class="page location-select-page">
    <view class="header">
      <view class="back-btn" @tap="goBack">
        <text>‹</text>
      </view>
      <text class="title">选择位置</text>
      <view class="placeholder"></view>
    </view>

    <view class="content">
      <view class="action-item primary" @tap="handleRelocate">
        <image
          class="action-icon"
          src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%23009bf5%22%3E%3Cpath%20d%3D%22M21%203L3%2010.53v.98l6.84%202.65L12.48%2021h.98L21%203z%22%2F%3E%3C%2Fsvg%3E"
          mode="aspectFit"
        />
        <view class="action-info">
          <text class="action-name">重新获取定位</text>
          <text class="action-desc">刷新当前所在位置</text>
        </view>
      </view>

      <view class="action-item" @tap="handleSelectAddress">
        <image
          class="action-icon"
          src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%23f97316%22%3E%3Cpath%20d%3D%22M12%202C8.13%202%205%205.13%205%209c0%205.25%207%2013%207%2013s7-7.75%207-13c0-3.87-3.13-7-7-7zm0%209.5a2.5%202.5%200%201%201%200-5%202.5%202.5%200%200%201%200%205z%22%2F%3E%3C%2Fsvg%3E"
          mode="aspectFit"
        />
        <view class="action-info">
          <text class="action-name">切换收货地址</text>
          <text class="action-desc">选择已保存的地址</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getCurrentLocation } from '@/shared-ui/location.js'

export default {
  data() {
    return {
      loading: false
    }
  },
  methods: {
    handleRelocate() {
      if (this.loading) return
      this.loading = true

      getCurrentLocation()
        .then((data) => {
          const { latitude, longitude, address } = data
          const displayAddress =
            address || `${latitude.toFixed(6)},${longitude.toFixed(6)}`
          uni.setStorageSync('selectedAddress', displayAddress)
          uni.setStorageSync('currentLocation', { lat: latitude, lng: longitude })
          uni.showToast({ title: '定位成功', icon: 'success' })
          this.loading = false
          setTimeout(() => this.goBack(), 500)
        })
        .catch(() => {
          uni.showToast({ title: '定位失败', icon: 'none' })
          this.loading = false
        })
    },
    handleSelectAddress() {
      uni.navigateTo({ url: '/pages/profile/address-list/index?select=1' })
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped lang="scss">
.location-select-page {
  min-height: 100vh;
  background: #fff;
  padding-top: calc(env(safe-area-inset-top, 0px) + 44px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
  padding-top: calc(env(safe-area-inset-top, 0px) + 16px);
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

.title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.placeholder {
  width: 36px;
}

.content {
  padding: 24px;
  padding-top: calc(24px + 60px);
}

.action-item {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 16px;
  margin-bottom: 12px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.action-item:active {
  transform: scale(0.98);
}

.action-icon {
  width: 36px;
  height: 36px;
  margin-right: 14px;
}

.action-info {
  flex: 1;
}

.action-name {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin-bottom: 4px;
  display: block;
}

.action-desc {
  font-size: 13px;
  color: #999;
  display: block;
}

.arrow {
  font-size: 18px;
  color: #ccc;
}
</style>
