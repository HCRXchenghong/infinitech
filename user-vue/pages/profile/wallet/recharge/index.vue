<template>
  <view class="recharge-page">
    <view class="top-shell" :style="{ paddingTop: topPadding + 'px' }">
      <view class="top-bar">
        <view class="back-btn" @tap="goBack">&#x2039;</view>
        <text class="top-title">余额充值</text>
        <view class="right-holder"></view>
      </view>
    </view>

    <view class="content-shell">
      <view class="balance-card">
        <text class="balance-label">当前可用余额</text>
        <text class="balance-value">¥{{ loadingBalance ? '--' : fen2yuan(balance) }}</text>
      </view>

      <view class="section-card">
        <text class="section-title">充值金额</text>
        <view class="amount-input-wrap">
          <text class="amount-prefix">¥</text>
          <input class="amount-input" type="digit" v-model="amountCustom" placeholder="输入充值金额" />
        </view>
        <view class="preset-grid">
          <view
            v-for="amount in presets"
            :key="amount"
            class="preset-item"
            :class="{ active: selectedAmount === amount && !amountCustom }"
            @tap="selectPreset(amount)"
          >
            ¥{{ amount }}
          </view>
        </view>
      </view>

      <view class="section-card">
        <text class="section-title">充值方式</text>
        <view v-if="loadingOptions" class="state-text">正在加载渠道...</view>
        <view v-else-if="paymentOptions.length === 0" class="state-text">后台暂未开放当前端的充值渠道</view>
        <view v-else class="method-list">
          <view
            v-for="method in paymentOptions"
            :key="method.channel"
            class="method-item"
            :class="{ active: selectedMethod === method.channel }"
            @tap="selectedMethod = method.channel"
          >
            <view class="method-main">
              <text class="method-name">{{ method.label || method.channel }}</text>
              <text class="method-tip">{{ method.description || '按后台支付中心配置动态生效' }}</text>
            </view>
            <text class="method-check">{{ selectedMethod === method.channel ? '✓' : '' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-bar">
      <button class="submit-btn" :loading="submitting" :disabled="!canSubmit" @tap="submitRecharge">
        确认充值
      </button>
    </view>
  </view>
</template>

<script>
import { buildAuthorizationHeader, request } from '../../../../shared-ui/api.js'
import {
  getClientPaymentErrorMessage,
  invokeClientPayment,
  isClientPaymentCancelled,
  shouldLaunchClientPayment
} from '../../../../shared-ui/client-payment.js'
import { createWalletRechargePageLogic } from '../../../../../shared/mobile-common/wallet-recharge-page.js'

export default createWalletRechargePageLogic({
  request,
  buildAuthorizationHeader,
  getClientPaymentErrorMessage,
  invokeClientPayment,
  isClientPaymentCancelled,
  shouldLaunchClientPayment,
})
</script>

<style scoped lang="scss">
.recharge-page {
  min-height: 100vh;
  background: #f3f6fb;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.top-shell {
  padding: 0 20rpx;
  background: linear-gradient(180deg, #0d6eff 0%, #2a87ff 72%, #f3f6fb 100%);
}

.top-bar {
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-btn,
.right-holder {
  width: 84rpx;
  height: 52rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.2);
}

.back-btn {
  font-size: 36rpx;
}

.top-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}

.content-shell {
  padding: 14rpx 20rpx 0;
}

.balance-card,
.section-card {
  background: #ffffff;
  border-radius: 22rpx;
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.06);
}

.balance-card {
  padding: 24rpx;
}

.balance-label {
  font-size: 24rpx;
  color: #64748b;
}

.balance-value {
  display: block;
  margin-top: 8rpx;
  font-size: 48rpx;
  font-weight: 700;
  color: #111827;
}

.section-card {
  margin-top: 14rpx;
  padding: 22rpx;
}

.section-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2937;
}

.amount-input-wrap {
  margin-top: 14rpx;
  height: 92rpx;
  border-radius: 16rpx;
  border: 1rpx solid #dbe2ec;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
}

.amount-prefix {
  font-size: 42rpx;
  color: #111827;
  margin-right: 8rpx;
}

.amount-input {
  flex: 1;
  font-size: 40rpx;
  color: #111827;
  font-weight: 600;
}

.preset-grid {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
}

.preset-item {
  height: 68rpx;
  border-radius: 14rpx;
  border: 1rpx solid #dbe2ec;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  color: #334155;
}

.preset-item.active {
  border-color: #1f6dff;
  background: #edf4ff;
  color: #1f6dff;
}

.state-text {
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #64748b;
}

.method-list {
  margin-top: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.method-item {
  border-radius: 14rpx;
  border: 1rpx solid #dbe2ec;
  padding: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.method-item.active {
  border-color: #1f6dff;
  background: #edf4ff;
}

.method-name {
  display: block;
  font-size: 27rpx;
  font-weight: 600;
  color: #111827;
}

.method-tip {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #6b7280;
}

.method-check {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f6dff;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 14rpx 20rpx calc(14rpx + env(safe-area-inset-bottom));
  background: rgba(243, 246, 251, 0.96);
  backdrop-filter: blur(8px);
}

.submit-btn {
  height: 84rpx;
  border: none;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #1f6dff 0%, #3486ff 100%);
}

.submit-btn[disabled] {
  opacity: 0.5;
}

.submit-btn::after {
  border: none;
}
</style>
