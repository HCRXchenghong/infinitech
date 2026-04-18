<template>
  <view class="page med-tracking">
    <view class="top">
      <view class="back" @tap="back">&lt;</view>
      <view class="track-card">
        <view class="row">
          <view class="moped">DEL</view>
          <view class="texts">
            <text class="title">{{ trackingState.title }}</text>
            <text class="sub">{{ trackingState.subtitle }}</text>
          </view>
        </view>
        <view class="bar">
          <view class="bar-inner" :style="{ width: trackingState.progress + '%' }" />
        </view>
      </view>
    </view>

    <view class="spacer" />

    <view class="bottom">
      <view class="rider-row">
        <view>
          <text class="mini-label">{{ texts.riderLabel }}</text>
          <view class="rider-name">
            <text>{{ riderDisplayName }}</text>
            <text v-if="order.status === 'delivering'" class="badge">{{ texts.deliveringBadge }}</text>
          </view>
        </view>
        <view class="call-btn" @tap="callRider">TEL</view>
      </view>

      <view class="list-card">
        <view class="list-head">
          <text class="list-title">{{ texts.itemListTitle }}</text>
          <text class="list-count">{{ itemCountLabel }}</text>
        </view>
        <text class="list-text">{{ order.item || texts.emptyItem }}</text>
      </view>

      <view class="list-card">
        <view class="list-head">
          <text class="list-title">{{ texts.addressTitle }}</text>
        </view>
        <text class="list-text">{{ order.dropoff || texts.emptyAddress }}</text>
      </view>

      <view class="price-card">
        <view class="price-row">
          <text>{{ texts.amountLabel }}</text>
          <text>¥{{ amountText }}</text>
        </view>
        <view class="price-row">
          <text>{{ texts.deliveryFeeLabel }}</text>
          <text>¥{{ deliveryFeeText }}</text>
        </view>
        <view class="price-row total">
          <text>{{ texts.totalLabel }}</text>
          <text>¥{{ totalPriceText }}</text>
        </view>
      </view>

      <view v-if="order.status === 'completed'" class="confirm" @tap="finish">{{ texts.backHome }}</view>
      <text v-else class="hint">{{ texts.trackingHint }}</text>
    </view>
  </view>
</template>

<script>
import { fetchOrderDetail, recordPhoneContactClick } from '@/shared-ui/api.js'
import { mapErrandOrderDetail } from '@/shared-ui/errand.js'
import { createMedicineTrackingPage } from '../../../packages/mobile-core/src/medicine-order.js'

export default createMedicineTrackingPage({
  fetchOrderDetail,
  mapErrandOrderDetail,
  recordPhoneContactClick
})
</script>

<style scoped lang="scss">
.med-tracking {
  min-height: 100vh;
  background: #ecfeff;
}

.top {
  padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: 10px;
}

.back {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.track-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(153, 246, 228, 0.6);
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 10px 25px rgba(20, 184, 166, 0.12);
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.moped {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: #ccfbf1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.texts {
  flex: 1;
}

.title {
  display: block;
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
}

.sub {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #64748b;
}

.bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.bar-inner {
  height: 100%;
  background: #14b8a6;
  border-radius: 999px;
  transition: width 0.8s ease;
}

.spacer {
  height: 240px;
}

.bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-top-left-radius: 22px;
  border-top-right-radius: 22px;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  box-shadow: 0 -10px 25px rgba(15, 23, 42, 0.06);
}

.rider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.mini-label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.rider-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
}

.badge {
  font-size: 10px;
  color: #0d9488;
  background: rgba(20, 184, 166, 0.12);
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 900;
}

.call-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(20, 184, 166, 0.12);
  color: #0d9488;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.list-card,
.price-card {
  margin-top: 12px;
  border-radius: 16px;
  background: #f8fafc;
  padding: 12px;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.list-title {
  font-size: 13px;
  font-weight: 900;
  color: #0f172a;
}

.list-count {
  font-size: 11px;
  color: #94a3b8;
}

.list-text {
  font-size: 13px;
  color: #334155;
  line-height: 1.6;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #334155;
  margin-bottom: 8px;
}

.price-row.total {
  margin-bottom: 0;
  font-weight: 900;
  color: #0f172a;
}

.confirm {
  margin-top: 14px;
  height: 46px;
  border-radius: 999px;
  background: #14b8a6;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 900;
}

.hint {
  display: block;
  margin-top: 14px;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}
</style>
