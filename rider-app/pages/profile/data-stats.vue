<template>
  <view class="container">
    <view class="page-padding">
      <!-- 时间选择 -->
      <view class="time-tabs">
        <view
          v-for="(tab, index) in timeTabs"
          :key="index"
          class="time-tab"
          :class="{ active: currentTab === index }"
          @click="selectTab(index)"
        >
          {{ tab }}
        </view>
      </view>

      <!-- 总览数据 -->
      <view class="overview-card">
        <view class="overview-item">
          <text class="overview-value">¥{{ stats.totalEarnings }}</text>
          <text class="overview-label">总收入</text>
        </view>
        <view class="overview-divider"></view>
        <view class="overview-item">
          <text class="overview-value">{{ stats.totalOrders }}</text>
          <text class="overview-label">总单数</text>
        </view>
        <view class="overview-divider"></view>
        <view class="overview-item">
          <text class="overview-value">{{ stats.avgPrice }}</text>
          <text class="overview-label">单均</text>
        </view>
      </view>

      <!-- 详细统计 -->
      <view class="stats-card">
        <view class="card-title">详细数据</view>
        <view class="stats-grid">
          <view class="stat-box">
            <text class="stat-label">在线时长</text>
            <text class="stat-value">{{ stats.onlineHours }}h</text>
          </view>
          <view class="stat-box">
            <text class="stat-label">时均收入</text>
            <text class="stat-value">¥{{ stats.hourlyEarnings }}</text>
          </view>
          <view class="stat-box">
            <text class="stat-label">准时率</text>
            <text class="stat-value success">{{ stats.onTimeRate }}%</text>
          </view>
          <view class="stat-box">
            <text class="stat-label">好评率</text>
            <text class="stat-value success">{{ stats.goodRate }}%</text>
          </view>
          <view class="stat-box">
            <text class="stat-label">平均配送时长</text>
            <text class="stat-value">{{ stats.avgDeliveryTime }}分钟</text>
          </view>
          <view class="stat-box">
            <text class="stat-label">超时次数</text>
            <text class="stat-value danger">{{ stats.timeoutCount }}次</text>
          </view>
        </view>
      </view>

      <!-- 收入趋势图 -->
      <view class="chart-card">
        <view class="card-title">收入趋势</view>
        <view class="chart-area">
          <view
            v-for="(item, index) in chartData"
            :key="index"
            class="chart-column"
          >
            <view class="chart-bar" :style="{ height: item.percent + '%' }"></view>
            <text class="chart-label">{{ item.label }}</text>
            <text class="chart-value">{{ item.value }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { createRiderDataStatsPageLogic } from '../../../packages/mobile-core/src/rider-data-stats-page.js'

export default Vue.extend(createRiderDataStatsPageLogic() as any)
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f3f4f6;
  padding-top: 88rpx;
}

.page-padding {
  padding: 24rpx;
  padding-bottom: 120rpx;
  box-sizing: border-box;
}

.time-tabs {
  display: flex;
  background: white;
  border-radius: 16rpx;
  padding: 8rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.time-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #6b7280;
  font-weight: 500;
  transition: all 0.3s;
  
  &.active {
    background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
    color: white;
    font-weight: bold;
  }
}

.overview-card {
  background: white;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.overview-item {
  flex: 1;
  text-align: center;
}

.overview-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #009bf5;
  display: block;
  margin-bottom: 8rpx;
}

.overview-label {
  font-size: 24rpx;
  color: #6b7280;
}

.overview-divider {
  width: 2rpx;
  background: #f3f4f6;
  margin: 0 24rpx;
}

.stats-card,
.chart-card {
  background: white;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 24rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.stat-box {
  background: #f9fafb;
  border-radius: 16rpx;
  padding: 24rpx;
  text-align: center;
}

.stat-label {
  font-size: 24rpx;
  color: #6b7280;
  display: block;
  margin-bottom: 12rpx;
}

.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #1f2937;
  display: block;
  
  &.success {
    color: #16a34a;
  }
  
  &.danger {
    color: #ef4444;
  }
}

.chart-area {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 320rpx;
  gap: 8rpx;
}

.chart-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.chart-bar {
  width: 100%;
  background: linear-gradient(to top, #009bf5, #60a5fa);
  border-radius: 8rpx 8rpx 0 0;
  min-height: 40rpx;
  transition: all 0.5s;
}

.chart-label {
  font-size: 20rpx;
  color: #9ca3af;
}

.chart-value {
  font-size: 22rpx;
  color: #1f2937;
  font-weight: 500;
}
</style>
