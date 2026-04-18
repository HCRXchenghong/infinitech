<template>
  <view class="page coupon-list">
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value || 'all'"
        class="tab-item"
        :class="{ active: status === tab.value }"
        @tap="changeStatus(tab.value)"
      >
        {{ tab.label }}
      </view>
    </view>

    <view v-if="loading" class="state-text">加载中...</view>
    <view v-else-if="coupons.length === 0" class="state-text">暂无优惠券</view>

    <view
      v-else
      v-for="c in coupons"
      :key="c.id"
      class="card"
      :class="`status-${c.status}`"
    >
      <view class="left">
        <text class="amount">{{ c.amountText }}</text>
        <text class="cond">{{ c.condition }}</text>
      </view>
      <view class="right">
        <view class="top-row">
          <text class="name">{{ c.name }}</text>
          <text class="status-tag" :class="`tag-${c.status}`">{{ c.statusText }}</text>
        </view>
        <text class="time">有效期：{{ c.validity }}</text>
        <text class="time">领取时间：{{ c.receivedAtText }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchUserCoupons } from '@/shared-ui/api'
import { createProfileCouponListPage } from '../../../../packages/mobile-core/src/profile-coupon-list.js'

export default createProfileCouponListPage({
  fetchUserCoupons
})
</script>

<style scoped lang="scss">
.coupon-list {
  min-height: 100vh;
  background: #f4f6fb;
  padding: 12px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  border-radius: 999px;
  font-size: 12px;
  color: #475569;
  background: #e2e8f0;
}

.tab-item.active {
  color: #fff;
  background: #2563eb;
}

.state-text {
  margin-top: 56px;
  text-align: center;
  color: #64748b;
  font-size: 13px;
}

.card {
  background: linear-gradient(100deg, #fee2e2, #fffbeb);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  display: flex;
  align-items: stretch;
}

.card.status-used,
.card.status-expired {
  background: linear-gradient(100deg, #e2e8f0, #f8fafc);
}

.left {
  width: 104px;
  border-right: 1px dashed rgba(148, 163, 184, 0.7);
  padding-right: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.amount {
  font-size: 24px;
  font-weight: 700;
  color: #ef4444;
}

.card.status-used .amount,
.card.status-expired .amount {
  color: #64748b;
}

.cond {
  margin-top: 4px;
  font-size: 11px;
  color: #b91c1c;
}

.card.status-used .cond,
.card.status-expired .cond {
  color: #64748b;
}

.right {
  flex: 1;
  padding-left: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.status-tag {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
}

.tag-unused {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

.tag-used {
  background: rgba(100, 116, 139, 0.16);
  color: #475569;
}

.tag-expired {
  background: rgba(148, 163, 184, 0.2);
  color: #64748b;
}

.time {
  font-size: 11px;
  color: #64748b;
}
</style>
