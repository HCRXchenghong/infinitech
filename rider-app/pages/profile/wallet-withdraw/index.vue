<template>
  <view class="withdraw-page">
    <view class="top-shell" :style="{ paddingTop: topPadding + 'px' }">
      <view class="top-bar">
        <view class="back-btn" @tap="goBack"><</view>
        <text class="top-title">余额提现</text>
        <view class="right-holder"></view>
      </view>
    </view>

    <view class="content-shell">
      <view class="section-card amount-card">
        <text class="section-title">提现金额</text>
        <view class="amount-input-wrap">
          <text class="amount-prefix">¥</text>
          <input class="amount-input" type="digit" v-model="withdrawAmount" placeholder="0.00" />
        </view>
        <view class="amount-meta">
          <text class="meta-text">可用余额 ¥{{ loadingBalance ? '--' : fen2yuan(balance) }}</text>
          <text class="meta-action" @tap="withdrawAll">全部提现</text>
        </view>

        <view class="preset-row">
          <view v-for="item in presets" :key="item" class="preset-item" @tap="selectPreset(item)">
            ¥{{ item }}
          </view>
        </view>
      </view>

      <view class="section-card">
        <text class="section-title">提现方式</text>
        <view v-if="loadingOptions" class="state-text">正在加载提现渠道...</view>
        <view v-else-if="withdrawOptions.length === 0" class="state-text">后台暂未开放骑手端提现渠道</view>
        <view v-else class="method-list">
          <view
            v-for="method in withdrawOptions"
            :key="method.channel"
            class="method-item"
            :class="{ active: selectedMethod === method.channel }"
            @tap="selectMethod(method.channel)"
          >
            <view class="method-main">
              <text class="method-name">{{ method.label || method.channel }}</text>
              <text class="method-tip">{{ method.arrivalText || method.description || '到账时间以通道处理为准' }}</text>
            </view>
            <text class="method-check">{{ selectedMethod === method.channel ? '✓' : '' }}</text>
          </view>
        </view>
      </view>

      <view class="section-card">
        <text class="section-title">收款账户</text>
        <input class="normal-input" v-model="withdrawAccount" :placeholder="accountPlaceholder" />
        <input class="normal-input" v-model="withdrawName" :placeholder="namePlaceholder" />
        <input
          v-if="requiresBankName"
          class="normal-input"
          v-model="bankName"
          :placeholder="bankNamePlaceholder"
        />
        <input
          v-if="requiresBankBranch"
          class="normal-input"
          v-model="bankBranch"
          :placeholder="bankBranchPlaceholder"
        />
        <text v-if="selectedOption && selectedOption.accountHint" class="helper-text">{{ selectedOption.accountHint }}</text>
        <text v-if="selectedOption && selectedOption.reviewNotice" class="notice-text">{{ selectedOption.reviewNotice }}</text>
      </view>
    </view>

    <view class="bottom-bar">
      <button class="submit-btn" :loading="submitting" :disabled="!canSubmit" @tap="submitWithdraw">
        预览手续费并提交
      </button>
    </view>
  </view>
</template>

<script>
import { buildAuthorizationHeader, request } from '../../../shared-ui/api'
import { readRiderAuthIdentity } from '../../../shared-ui/auth-session.js'
import { createWalletWithdrawPageLogic } from '../../../../packages/mobile-core/src/wallet-withdraw-page.js'

function getRiderWalletAuth() {
  const auth = readRiderAuthIdentity({ uniApp: uni })
  const userId = this.normalizeText(auth.userId)
  const riderName = this.normalizeText(auth.riderName || '骑手')
  const token = this.normalizeText(auth.token)
  return { userId, riderName, token }
}

function getRiderWithdrawName(auth) {
  return auth.riderName || '骑手'
}

export default createWalletWithdrawPageLogic({
  request,
  buildAuthorizationHeader,
  getAuth: getRiderWalletAuth,
  getWithdrawName: getRiderWithdrawName,
  userType: 'rider',
  platform: 'app',
  idempotencyKeyPrefix: 'rider_withdraw',
  presets: [50, 100, 200, 500],
  rejectedReasonFallback: '可重新申请或联系平台处理',
})
</script>

<style scoped lang="scss">
.withdraw-page {
  min-height: 100vh;
  background: #edf1f6;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.top-shell {
  padding: 0 20rpx;
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
  color: #111827;
  background: rgba(255, 255, 255, 0.86);
}

.back-btn {
  font-size: 36rpx;
}

.top-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #111827;
}

.content-shell {
  padding: 10rpx 20rpx 0;
}

.section-card {
  padding: 22rpx;
  margin-bottom: 14rpx;
  border-radius: 22rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.06);
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
}

.state-text,
.helper-text,
.notice-text {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #6b7280;
}

.notice-text {
  color: #b45309;
}

.normal-input {
  width: 100%;
  margin-top: 12rpx;
  height: 82rpx;
  border-radius: 14rpx;
  border: 1rpx solid #dbe2ec;
  padding: 0 20rpx;
  font-size: 27rpx;
  box-sizing: border-box;
}

.amount-card {
  background: #fcfcfd;
}

.amount-input-wrap {
  margin-top: 16rpx;
  height: 100rpx;
  border-bottom: 1rpx solid #e5e7eb;
  display: flex;
  align-items: center;
}

.amount-prefix {
  font-size: 54rpx;
  color: #111827;
  margin-right: 8rpx;
}

.amount-input {
  flex: 1;
  font-size: 54rpx;
  color: #111827;
  font-weight: 700;
}

.amount-meta {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meta-text {
  font-size: 24rpx;
  color: #6b7280;
}

.meta-action {
  font-size: 24rpx;
  color: #1f6dff;
}

.preset-row {
  margin-top: 14rpx;
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}

.preset-item {
  min-width: 120rpx;
  height: 64rpx;
  border-radius: 12rpx;
  border: 1rpx solid #dbe2ec;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #334155;
  background: #ffffff;
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
  background: rgba(237, 241, 246, 0.96);
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
  opacity: 0.56;
}

.submit-btn::after {
  border: none;
}
</style>
