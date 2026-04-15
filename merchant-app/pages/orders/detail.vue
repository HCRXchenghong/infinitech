<template>
  <view class="page">
    <scroll-view scroll-y class="content">
      <view class="card top-card">
        <view class="row between">
          <text class="order-no">#{{ detailView.orderNo }}</text>
          <text class="status" :class="`status-${detailView.status}`">{{ orderStatusText(detailView.status, detailView.bizType) }}</text>
        </view>
        <text class="meta">业务类型：{{ detailView.bizType === 'groupbuy' ? '团购到店核销' : '外卖配送' }}</text>
        <text class="meta">支付状态：{{ paymentStatusText(detailView.paymentStatus) }}</text>
        <text class="meta">创建时间：{{ formatDate(detailView.createdAt) }}</text>
      </view>

      <view class="card">
        <text class="title">顾客信息</text>
        <text class="line">姓名：{{ detailView.customerName }}</text>
        <text class="line">电话：{{ detailView.customerPhone }}</text>
        <text class="line">地址：{{ detailView.address }}</text>
      </view>

      <view class="card action-card">
        <text class="title">在线沟通</text>
        <view class="action-row">
          <button class="chat-btn user" @tap="openUserChat">联系用户</button>
          <button v-if="isTakeoutOrder" class="chat-btn rider" @tap="openRiderChat">联系骑手</button>
          <button class="chat-btn support" @tap="openSupportChat">{{ supportTitle }}</button>
        </view>
      </view>

      <view class="card">
        <text class="title">商品信息</text>
        <view v-if="items.length === 0" class="line">无商品明细</view>
        <view v-for="(item, idx) in items" :key="idx" class="item-row">
          <text class="item-name">{{ item.name }}</text>
          <text class="item-qty">x{{ item.qty }}</text>
        </view>
        <text class="amount">合计：¥{{ detailView.totalPrice }}</text>
      </view>

      <view class="card" v-if="isTakeoutOrder">
        <text class="title">配送信息</text>
        <text class="line">骑手：{{ detailView.riderName }}</text>
        <text class="line">骑手电话：{{ detailView.riderPhone }}</text>
        <text class="line">接单时间：{{ formatDate(detailView.acceptedAt) }}</text>
        <text class="line">完成时间：{{ formatDate(detailView.completedAt) }}</text>
      </view>

      <view class="card" v-else>
        <text class="title">核销信息</text>
        <text class="line">核销状态：{{ orderStatusText(detailView.status, 'groupbuy') }}</text>
        <text class="line">核销时间：{{ formatDate(detailView.updatedAt) }}</text>
        <text class="line">说明：团购订单仅支持到店验券，不参与骑手配送。</text>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useMerchantOrderDetailPage } from '@/shared-ui/merchantOrders'

export default defineComponent({
  setup() {
    return useMerchantOrderDetailPage()
  },
})
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background: #f4f7fb;
}

.content {
  height: 100%;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border: 1rpx solid #e7eef6;
  border-radius: 18rpx;
  padding: 20rpx;
  margin-bottom: 14rpx;
}

.top-card {
  background: linear-gradient(145deg, #eff7ff, #ffffff);
}

.row {
  display: flex;
  align-items: center;
}

.between {
  justify-content: space-between;
}

.order-no {
  font-size: 34rpx;
  font-weight: 700;
  color: #10304d;
}

.status {
  font-size: 22rpx;
  padding: 6rpx 14rpx;
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

  &.status-paid_unused {
    background: #eff6ff;
    color: #2563eb;
  }

  &.status-redeemed {
    background: #ecfdf5;
    color: #16a34a;
  }

  &.status-refunding {
    background: #fff7ed;
    color: #c2410c;
  }

  &.status-refunded,
  &.status-expired,
  &.status-cancelled {
    background: #f3f4f6;
    color: #6b7280;
  }
}

.meta {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #5c7591;
}

.title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #143351;
  margin-bottom: 8rpx;
}

.line {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #48617e;
}

.action-card {
  background: linear-gradient(145deg, #f6fbff, #ffffff);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 12rpx;
}

.chat-btn {
  min-width: 180rpx;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 12rpx;
  border: none;
  font-size: 24rpx;
  padding: 0 18rpx;

  &.user {
    background: #e7f4ff;
    color: #0f5fa6;
  }

  &.rider {
    background: #ecfdf5;
    color: #0f766e;
  }

  &.support {
    background: #fff7ed;
    color: #b45309;
  }
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
  font-size: 25rpx;
  color: #2f4966;
}

.item-name {
  flex: 1;
  margin-right: 12rpx;
}

.item-qty {
  color: #6d859f;
}

.amount {
  display: block;
  margin-top: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #102d49;
}

.bottom-space {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
