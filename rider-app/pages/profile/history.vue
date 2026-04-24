<template>
  <view class="page">
    <message-popup />

    <view class="order-list">
      <view
        v-for="order in orders"
        :key="order.id"
        class="order-card"
        @click="openOrderDetail(order)"
      >
        <view class="order-header">
          <text class="order-num">订单号 {{ order.orderNum }}</text>
          <text class="order-status">{{ getStatusText(order.status) }}</text>
        </view>
        <view class="order-info">
          <text class="shop-name">{{ order.shopName }}</text>
          <text class="address">{{ order.customerAddress }}</text>
        </view>
        <view class="order-footer">
          <text class="time">{{ order.createTime }}</text>
          <text class="price">¥{{ order.price }}</text>
        </view>
      </view>

      <view v-if="loading" class="empty">
        <text>加载中...</text>
      </view>
      <view v-else-if="orders.length === 0" class="empty">
        <text>暂无历史订单</text>
      </view>
    </view>

    <OrderDetailPopup
      :show="showOrderDetailPopup"
      :order="currentOrderDetail"
      @close="showOrderDetailPopup = false"
    />
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { fetchRiderOrders } from '../../shared-ui/api'
import { readRiderAuthIdentity } from '../../shared-ui/auth-session.js'
import OrderDetailPopup from '../../components/OrderDetailPopup.vue'
import { createRiderHistoryOrdersPageLogic } from '../../../packages/mobile-core/src/rider-history-orders-page.js'

export default Vue.extend(createRiderHistoryOrdersPageLogic({
  fetchRiderOrders,
  readRiderAuthIdentity,
  uniApp: uni,
  components: {
    OrderDetailPopup
  }
}))
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 24rpx;
}

.order-card {
  background: white;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.order-num {
  font-size: 24rpx;
  color: #6b7280;
}

.order-status {
  font-size: 24rpx;
  color: #10b981;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.shop-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
}

.address {
  font-size: 24rpx;
  color: #6b7280;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time {
  font-size: 22rpx;
  color: #9ca3af;
}

.price {
  font-size: 32rpx;
  font-weight: bold;
  color: #009bf5;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #9ca3af;
}
</style>
