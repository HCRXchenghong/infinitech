<template>
    <view class="page">
    <view class="header">
      <view class="shop-area">
        <text class="shop-name">{{ currentShopName }}</text>
        <text class="shop-hint">店铺切换请前往「店铺」页</text>
      </view>
      <input
        v-model="keyword"
        class="search"
        placeholder="搜索订单号/手机号"
        @confirm="handleSearch"
      />
    </view>

    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @tap="activeTab = tab.key"
      >
        {{ tab.label }}
      </view>
    </view>

    <scroll-view scroll-y class="list" refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshAll">
      <view v-if="filteredOrders.length === 0" class="empty">暂无订单</view>

      <view v-for="item in filteredOrders" :key="item.id" class="card" @tap="openDetail(item.id)">
        <view class="card-top">
          <text class="order-no">#{{ item.daily_order_id || item.id }}</text>
          <text class="status" :class="`status-${item.status}`">{{ orderStatusText(item.status, item.bizType || item.biz_type) }}</text>
        </view>

        <text class="line">业务：{{ isGroupbuy(item) ? '团购到店核销' : '外卖配送' }}</text>
        <text class="line">顾客：{{ item.customer_phone || item.customer_name || '-' }}</text>
        <text class="line ellipsis">商品：{{ item.food_request || item.items || '-' }}</text>
        <text class="line">支付：{{ paymentStatusText(item.payment_status) }}</text>

        <view class="card-bottom">
          <text class="time">{{ formatTime(item.created_at) }}</text>
          <text class="amount">¥{{ Number(item.total_price || 0).toFixed(2) }}</text>
        </view>

        <view class="actions" @tap.stop>
          <button
            class="btn chat"
            @tap="openUserChat(item)"
          >
            联系用户
          </button>

          <button
            v-if="!isGroupbuy(item)"
            class="btn chat rider"
            @tap="openRiderChat(item)"
          >
            联系骑手
          </button>

          <button
            v-if="!isGroupbuy(item) && item.status === 'pending'"
            class="btn primary"
            :disabled="item.payment_status !== 'paid' || actionLoading[item.id]"
            @tap="handleDispatch(item)"
          >
            {{ item.payment_status === 'paid' ? '接单并派骑手' : '待支付' }}
          </button>

          <button
            v-if="!isGroupbuy(item) && item.status === 'accepted'"
            class="btn success"
            :disabled="actionLoading[item.id]"
            @tap="handlePickup(item)"
          >
            出餐完成（骑手取货）
          </button>

          <button
            v-if="!isGroupbuy(item) && item.status === 'delivering'"
            class="btn ghost"
            :disabled="actionLoading[item.id]"
            @tap="handleDeliver(item)"
          >
            标记已送达
          </button>
          <button
            v-if="isGroupbuy(item) && item.status === 'paid_unused'"
            class="btn primary"
            :disabled="actionLoading[item.id]"
            @tap="handleRedeem(item)"
          >
            扫码核销
          </button>
          <button
            v-if="isGroupbuy(item) && item.status === 'redeemed'"
            class="btn warning"
            :disabled="actionLoading[item.id]"
            @tap="handleGroupbuyRefund(item)"
          >
            发起退款
          </button>
        </view>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useMerchantOrdersPage } from '@/shared-ui/merchantOrders'

export default defineComponent({
  setup() {
    return useMerchantOrdersPage()
  },
})
</script>

<style scoped lang="scss" src="./list.scss"></style>
