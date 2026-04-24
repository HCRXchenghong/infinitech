<template>
  <view class="page">
    <!-- 当前段位 -->
    <view class="current-rank">
      <text class="current-title">当前段位</text>
      <view class="rank-display">
        <text class="rank-icon">{{ currentRank.icon }}</text>
        <text class="rank-name">{{ currentRank.name }}</text>
      </view>
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: progress + '%' }"></view>
      </view>
      <text class="progress-text">{{ progressText }}</text>
      <view class="rating-summary">
        <text class="rating-label">骑手评分</text>
        <text class="rating-value">★ {{ Number(riderData.rating || 5).toFixed(1) }} ({{ riderData.ratingCount || 0 }})</text>
      </view>
    </view>

    <!-- 段位滑动卡片 -->
    <scroll-view class="rank-cards" scroll-x>
      <view v-for="(rank, level) in rankConfig" :key="level"
            class="rank-card"
            :class="{ active: Number(level) <= riderData.level, current: Number(level) === riderData.level }">
        <text class="card-icon">{{ rank.icon }}</text>
        <text class="card-name">{{ rank.name }}</text>
        <text class="card-level">Lv.{{ level }}</text>
        <text class="card-desc">{{ rank.desc }}</text>
      </view>
    </scroll-view>

    <!-- 排行榜 -->
    <view class="tabs">
      <text class="tab" :class="{ active: activeTab === 'day' }" @tap="switchTab('day')">日榜</text>
      <text class="tab" :class="{ active: activeTab === 'week' }" @tap="switchTab('week')">周榜</text>
      <text class="tab" :class="{ active: activeTab === 'month' }" @tap="switchTab('month')">月榜</text>
    </view>

    <view class="rank-list">
      <view v-for="(item, index) in rankList" :key="index" class="rank-item">
        <view class="rank-no" :class="{ top: index < 3 }">{{ index + 1 }}</view>
        <image class="rider-avatar" :src="item.avatar || '/static/images/logo.png'" mode="aspectFill" />
        <view class="rider-info">
          <text class="rider-name">{{ item.name }}</text>
          <text class="rider-level">{{ rankName(item.level) }}</text>
        </view>
        <view class="rank-right">
          <text class="order-count">{{ Number(item.orders || 0) }}单</text>
          <text class="order-rating">★ {{ Number(item.rating || 5).toFixed(1) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { getRiderRank, getRankList } from '../../shared-ui/api'
import {
  getCachedPlatformRuntimeSettings,
  loadPlatformRuntimeSettings,
} from '../../shared-ui/platform-runtime'
import { createRiderHomePageLogic } from '../../../packages/mobile-core/src/rider-home-page.js'

export default Vue.extend(createRiderHomePageLogic({
  getRiderRank,
  getRankList,
  getCachedPlatformRuntimeSettings,
  loadPlatformRuntimeSettings,
}) as any)
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 32rpx;
}

.current-rank {
  background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
  border-radius: 24rpx;
  padding: 48rpx 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 155, 245, 0.3);
}

.current-title {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  margin-bottom: 16rpx;
}

.rank-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.rank-icon {
  font-size: 64rpx;
}

.rank-name {
  font-size: 48rpx;
  font-weight: bold;
  color: white;
}

.progress-bar {
  height: 16rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
}

.progress-fill {
  height: 100%;
  background: white;
  border-radius: 8rpx;
  transition: width 0.3s;
}

.progress-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  display: block;
  text-align: center;
}

.rating-summary {
  margin-top: 18rpx;
  display: flex;
  justify-content: center;
  gap: 12rpx;
  align-items: center;
}

.rating-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

.rating-value {
  font-size: 24rpx;
  font-weight: 700;
  color: #fff7d6;
}

.rank-cards {
  white-space: nowrap;
  margin-bottom: 32rpx;
}

.rank-card {
  display: inline-block;
  width: 200rpx;
  padding: 32rpx 24rpx;
  background: #e5e7eb;
  border-radius: 24rpx;
  text-align: center;
  margin-right: 16rpx;
  vertical-align: top;

  &.active {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);

    .card-icon, .card-name, .card-level, .card-desc {
      color: white;
    }
  }

  &.current {
    box-shadow: 0 8rpx 24rpx rgba(0, 155, 245, 0.4);
    transform: scale(1.05);
  }
}

.card-icon {
  font-size: 56rpx;
  display: block;
  margin-bottom: 16rpx;
}

.card-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #6b7280;
  display: block;
  margin-bottom: 8rpx;
}

.card-level {
  font-size: 24rpx;
  color: #9ca3af;
  display: block;
  margin-bottom: 8rpx;
}

.card-desc {
  font-size: 20rpx;
  color: #9ca3af;
  display: block;
}

.tabs {
  display: flex;
  background: white;
  border-radius: 16rpx;
  padding: 8rpx;
  margin-bottom: 32rpx;
  gap: 8rpx;
}

.tab {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 28rpx;
  color: #6b7280;
  border-radius: 12rpx;

  &.active {
    background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
    color: white;
    font-weight: 600;
  }
}

.rank-list {
  background: white;
  border-radius: 24rpx;
  overflow: hidden;
}

.rank-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
}

.rank-no {
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: bold;
  color: #6b7280;
  margin-right: 24rpx;

  &.top {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: white;
    border-radius: 50%;
  }
}

.rider-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 24rpx;
}

.rider-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.rider-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.rider-level {
  font-size: 24rpx;
  color: #6b7280;
}

.order-count {
  font-size: 32rpx;
  font-weight: bold;
  color: #009bf5;
}

.rank-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}

.order-rating {
  font-size: 22rpx;
  color: #f59e0b;
}
</style>
