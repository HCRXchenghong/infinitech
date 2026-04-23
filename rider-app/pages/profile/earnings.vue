<template>
  <view class="container">
    <message-popup />

    <view class="date-picker">
      <picker mode="date" fields="month" :value="monthValue" @change="onMonthChange">
        <view class="date-picker-inner">
          <text class="current-date">{{ monthLabel }}</text>
          <text class="picker-arrow">▼</text>
        </view>
      </picker>
    </view>

    <view class="stats-summary">
      <view class="summary-item">
        <text class="summary-label">总收入</text>
        <text class="summary-value primary">¥{{ monthlyTotal }}</text>
      </view>
      <view class="summary-divider"></view>
      <view class="summary-item">
        <text class="summary-label">完成单数</text>
        <text class="summary-value">{{ monthlyOrders }}单</text>
      </view>
    </view>

    <scroll-view class="earnings-scroll" scroll-y>
      <view v-if="loading" class="empty">
        <text>加载中...</text>
      </view>

      <view v-else-if="earningsList.length === 0" class="empty">
        <text>{{ errorText || '暂无收入记录' }}</text>
      </view>

      <view v-else class="earnings-list">
        <view v-for="(item, index) in earningsList" :key="index" class="earning-group">
          <view class="date-header">
            <text class="date-text">{{ item.date }}</text>
            <text class="date-total">¥{{ item.total }}</text>
          </view>
          <view class="earning-items">
            <view v-for="(log, idx) in item.logs" :key="idx" class="earning-item">
              <view class="earning-left">
                <view class="earning-icon" :class="log.type">
                  <text>{{ log.type === 'pending' ? '⏳' : '🚚' }}</text>
                </view>
                <view class="earning-info">
                  <text class="earning-title">{{ log.title }}</text>
                  <text class="earning-time">{{ log.time }}</text>
                  <text class="earning-subtitle">{{ log.subtitle }}</text>
                </view>
              </view>
              <text class="earning-amount">+{{ log.amount }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { fetchEarnings } from '../../shared-ui/api'
import { createRiderEarningsPageLogic } from '../../../packages/mobile-core/src/rider-earnings-page.js'

export default Vue.extend(createRiderEarningsPageLogic({
  fetchEarnings,
}) as any)
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f3f4f6;
  padding-top: 88rpx;
}

.date-picker {
  background: white;
  padding: 24rpx 32rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.04);
}

.date-picker-inner {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
}

.current-date {
  font-size: 32rpx;
  font-weight: bold;
  color: #1f2937;
}

.picker-arrow {
  font-size: 20rpx;
  color: #6b7280;
}

.stats-summary {
  background: white;
  margin: 24rpx;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.summary-item {
  flex: 1;
  text-align: center;
}

.summary-label {
  font-size: 26rpx;
  color: #6b7280;
  display: block;
  margin-bottom: 12rpx;
}

.summary-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #1f2937;
  display: block;

  &.primary {
    color: #009bf5;
  }
}

.summary-divider {
  width: 2rpx;
  background: #f3f4f6;
  margin: 0 32rpx;
}

.earnings-scroll {
  height: calc(100vh - 400rpx);
  padding: 0 24rpx;
  box-sizing: border-box;
}

.earnings-list {
  padding-bottom: 120rpx;
}

.earning-group {
  background: white;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.date-header {
  background: #f9fafb;
  padding: 20rpx 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2rpx solid #f3f4f6;
}

.date-text {
  font-size: 26rpx;
  color: #6b7280;
  font-weight: 500;
}

.date-total {
  font-size: 28rpx;
  font-weight: bold;
  color: #009bf5;
}

.earning-items {
  padding: 16rpx 0;
}

.earning-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 32rpx;
}

.earning-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex: 1;
}

.earning-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;

  &.delivery {
    background: #eff6ff;
  }

  &.pending {
    background: #fff7ed;
  }
}

.earning-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.earning-title {
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 500;
}

.earning-time {
  font-size: 22rpx;
  color: #9ca3af;
}

.earning-subtitle {
  font-size: 22rpx;
  color: #6b7280;
}

.earning-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: #009bf5;
}

.empty {
  text-align: center;
  color: #9ca3af;
  padding: 120rpx 0;
  font-size: 28rpx;
}
</style>
