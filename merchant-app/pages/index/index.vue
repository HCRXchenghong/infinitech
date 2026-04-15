<template>
  <view class="page">
    <scroll-view scroll-y class="content" refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshAll">
      <view class="hero">
        <view class="hero-left" @tap="selectShop">
          <text class="shop-name">{{ currentShopView.name }}</text>
          <text class="shop-meta">{{ currentShopView.businessCategory }} 路 {{ currentShopView.phone }}</text>
        </view>

        <view class="hero-right">
          <text class="switch-label">{{ currentShopView.isActive ? '营业中' : '暂停营业' }}</text>
          <switch
            :checked="currentShopView.isActive"
            color="#009bf5"
            :disabled="switching || !currentShop"
            @change="toggleBusiness"
          />
        </view>
      </view>

      <view class="chat-entry" @tap="openSupportChat">
        <text class="chat-entry-title">{{ supportTitle }}</text>
        <text class="chat-entry-desc">商家端与客服工作台实时同步</text>
      </view>

      <view class="stats-grid">
        <view class="stat-card revenue">
          <text class="stat-label">今日营业额</text>
          <text class="stat-value">¥{{ stats.todayRevenue }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">待处理订单</text>
          <text class="stat-value">{{ stats.todoCount }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">配送中</text>
          <text class="stat-value">{{ stats.deliveringCount }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">售后申请</text>
          <text class="stat-value">{{ stats.afterSalesCount }}</text>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">最新订单</text>
          <text class="panel-link" @tap="goTab('/pages/orders/list')">全部订单</text>
        </view>

        <view v-if="recentOrders.length === 0" class="empty">暂无订单数据</view>
        <view v-for="item in recentOrders" :key="item.id" class="order-item" @tap="openOrder(item.id)">
          <view class="order-top">
            <text class="order-no">#{{ item.daily_order_id || item.id }}</text>
            <text class="order-status" :class="`status-${item.status}`">{{ orderStatusText(item.status) }}</text>
          </view>
          <text class="order-desc">{{ item.food_request || item.items || '无商品明细' }}</text>
          <view class="order-bottom">
            <text class="order-time">{{ formatTime(item.created_at) }}</text>
            <text class="order-price">¥{{ Number(item.total_price || 0).toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <view class="page-bottom-space" />
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useMerchantDashboardPage } from '@/shared-ui/merchantOrders'

export default defineComponent({
  setup() {
    return useMerchantDashboardPage()
  },
})
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background: linear-gradient(180deg, #f2f8ff 0%, #f7fbff 40%, #f5f7fa 100%);
  overflow: hidden;
}

.content {
  height: 100%;
  padding: calc(var(--status-bar-height) + 16rpx) 24rpx 24rpx;
  box-sizing: border-box;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  background: linear-gradient(135deg, #009bf5, #0079c8);
  border-radius: 24rpx;
  padding: 28rpx;
  color: #fff;
  box-shadow: 0 14rpx 30rpx rgba(0, 123, 201, 0.28);
}

.chat-entry {
  margin-top: 16rpx;
  background: linear-gradient(145deg, #fff7ed, #ffffff);
  border: 1rpx solid #fde6cc;
  border-radius: 18rpx;
  padding: 18rpx 22rpx;
}

.chat-entry-title {
  display: block;
  font-size: 28rpx;
  color: #9a3412;
  font-weight: 700;
}

.chat-entry-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #c26018;
}

.hero-left {
  flex: 1;
  min-width: 0;
}

.shop-name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shop-meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  opacity: 0.9;
}

.hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
}

.switch-label {
  font-size: 22rpx;
  margin-bottom: 8rpx;
}

.stats-grid {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14rpx;
}

.stat-card {
  background: #fff;
  border: 1rpx solid #e5eef8;
  border-radius: 18rpx;
  padding: 20rpx;

  &.revenue {
    background: linear-gradient(150deg, #fff7ec, #fff);
    border-color: #ffe0b8;
  }
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: #6a819b;
}

.stat-value {
  display: block;
  margin-top: 8rpx;
  font-size: 38rpx;
  font-weight: 700;
  color: #0f2942;
}

.panel {
  margin-top: 20rpx;
  background: #fff;
  border: 1rpx solid #e6eef7;
  border-radius: 20rpx;
  padding: 22rpx;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.panel-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #112e4a;
}

.panel-link {
  font-size: 24rpx;
  color: #007ecf;
}

.empty {
  text-align: center;
  font-size: 24rpx;
  color: #8da0b5;
  padding: 32rpx 0;
}

.order-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f1f5f9;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.order-top,
.order-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-no {
  font-size: 26rpx;
  font-weight: 600;
  color: #12324f;
}

.order-status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #edf2f7;
  color: #4d647d;

  &.status-pending {
    background: #fff1f2;
    color: #dc2626;
  }

  &.status-accepted {
    background: #fff7ed;
    color: #ea580c;
  }

  &.status-delivering {
    background: #eff6ff;
    color: #2563eb;
  }

  &.status-completed {
    background: #ecfdf5;
    color: #16a34a;
  }
}

.order-desc {
  display: block;
  margin: 8rpx 0;
  font-size: 24rpx;
  color: #4a607a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-time {
  font-size: 22rpx;
  color: #7a90a8;
}

.order-price {
  font-size: 28rpx;
  font-weight: 700;
  color: #0f2942;
}

.page-bottom-space {
  height: calc(140rpx + env(safe-area-inset-bottom));
}
</style>
