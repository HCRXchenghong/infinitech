<template>
  <view class="container">
    <view class="page-padding">
      <!-- 接单范围 -->
      <view class="section">
        <view class="section-title">接单范围</view>
        <view class="settings-card">
          <view class="setting-item">
            <text class="setting-label">接单距离</text>
            <view class="setting-right">
              <text class="setting-value">{{ orderSettings.distance }}公里</text>
              <text class="arrow">›</text>
            </view>
          </view>
          <view class="divider"></view>
          <view class="setting-item">
            <text class="setting-label">自动接单</text>
            <switch :checked="orderSettings.autoAccept" @change="toggleAuto" color="#009bf5" />
          </view>
        </view>
      </view>

      <!-- 偏好设置 -->
      <view class="section">
        <view class="section-title">偏好设置</view>
        <view class="settings-card">
          <view class="setting-item">
            <text class="setting-label">优先顺路单</text>
            <switch :checked="orderSettings.preferRoute" color="#009bf5" />
          </view>
          <view class="divider"></view>
          <view class="setting-item">
            <text class="setting-label">优先高价单</text>
            <switch :checked="orderSettings.preferHighPrice" color="#009bf5" />
          </view>
          <view class="divider"></view>
          <view class="setting-item">
            <text class="setting-label">优先近距离</text>
            <switch :checked="orderSettings.preferNearby" color="#009bf5" />
          </view>
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="tip-box">
        <text class="tip-icon">💡</text>
        <text class="tip-text">合理设置接单偏好，可提升接单效率和收入</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data() {
    return {
      orderSettings: {
        distance: 3,
        autoAccept: false,
        preferRoute: true,
        preferHighPrice: true,
        preferNearby: false
      }
    }
  },
  methods: {
    toggleAuto() {
      this.orderSettings.autoAccept = !this.orderSettings.autoAccept
      
      if (this.orderSettings.autoAccept) {
        uni.showModal({
          title: '开启自动接单',
          content: '开启后将自动接受符合条件的订单，确定开启吗？',
          success: (res) => {
            if (!res.confirm) {
              this.orderSettings.autoAccept = false
            }
          }
        })
      }
    }
  }
})
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f3f4f6;
  padding-top: 88rpx;
}

.page-padding {
  padding: 24rpx;
  box-sizing: border-box;
}

.section {
  margin-bottom: 48rpx;
}

.section-title {
  font-size: 26rpx;
  color: #6b7280;
  padding: 0 16rpx 16rpx;
  font-weight: 500;
}

.settings-card {
  background: white;
  border-radius: 24rpx;
  padding: 0 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 0;
}

.setting-label {
  font-size: 28rpx;
  color: #1f2937;
}

.setting-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.setting-value {
  font-size: 28rpx;
  color: #6b7280;
}

.arrow {
  font-size: 32rpx;
  color: #d1d5db;
}

.divider {
  height: 2rpx;
  background: #f9fafb;
}

.tip-box {
  background: #fffbeb;
  border: 2rpx solid #fef3c7;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.tip-icon {
  font-size: 32rpx;
  line-height: 1;
}

.tip-text {
  flex: 1;
  font-size: 24rpx;
  color: #92400e;
  line-height: 1.5;
}
</style>
