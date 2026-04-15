<template>
  <view class="page">
    <view class="header-card">
      <text class="balance-label">商户 IF-Pay 可用余额（元）</text>
      <text class="balance-value">{{ loading ? '--' : fen2yuan(balance) }}</text>
      <text class="balance-sub">冻结金额 ¥{{ loading ? '--' : fen2yuan(frozenBalance) }}</text>

      <view class="action-row">
        <button class="action-btn primary" :disabled="loading || !walletUserId" @tap="applyRecharge">余额充值</button>
        <button class="action-btn" :disabled="loading || !walletUserId" @tap="applyWithdraw">申请提现</button>
        <button class="action-btn minor" :disabled="loading || !walletUserId" @tap="refreshAll">刷新</button>
      </view>
    </view>

    <view class="notice-card">
      <text class="notice-title">资金规则</text>
      <text class="notice-text">
        商户端支持微信提现、支付宝提现和银行卡提现。银行卡提现到账时效为 24 小时 - 48 小时，所有提现渠道都会按后台配置收取手续费，申请提交后金额会先冻结。
      </text>
    </view>

    <view class="filter-row">
      <view
        v-for="item in typeFilters"
        :key="item.value || 'all'"
        class="chip"
        :class="{ active: activeType === item.value }"
        @tap="activeType = item.value"
      >
        {{ item.label }}
      </view>
    </view>

    <scroll-view scroll-y class="list" refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshAll">
      <view v-if="loading && transactions.length === 0" class="state">加载中...</view>
      <view v-else-if="filteredTransactions.length === 0" class="state">暂无资金流水</view>

      <view v-for="tx in filteredTransactions" :key="tx.transaction_id || tx.transactionId || tx.id" class="tx-card">
        <view class="tx-top">
          <text class="tx-title">{{ txTypeText(tx.type) }}</text>
          <text class="tx-amount" :class="amountClass(tx)">{{ amountText(tx) }}</text>
        </view>

        <view class="tx-bottom">
          <text class="tx-time">{{ formatTime(tx.created_at || tx.createdAt) }}</text>
          <text class="tx-status">{{ txStatusText(tx.status) }}</text>
        </view>

        <text v-if="tx.description" class="tx-desc">{{ tx.description }}</text>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useMerchantWalletPage } from '@/shared-ui/merchantWallet'

export default defineComponent({
  setup() {
    return useMerchantWalletPage()
  },
})
</script>

<style scoped lang="scss">
.page {
  height: 100vh;
  background: #f2f7fd;
  display: flex;
  flex-direction: column;
}

.header-card {
  margin: 14rpx 24rpx 10rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #009bf5, #0081cc);
  color: #ffffff;
  padding: 24rpx;
  box-shadow: 0 16rpx 28rpx rgba(0, 137, 214, 0.25);
}

.balance-label {
  display: block;
  font-size: 22rpx;
  opacity: 0.92;
}

.balance-value {
  display: block;
  margin-top: 10rpx;
  font-size: 58rpx;
  font-weight: 700;
}

.balance-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  opacity: 0.9;
}

.action-row {
  margin-top: 18rpx;
  display: flex;
  gap: 10rpx;
}

.action-btn {
  flex: 1;
  height: 66rpx;
  line-height: 66rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.34);
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;

  &.primary {
    background: #ffffff;
    color: #0c5b95;
    border-color: #ffffff;
  }

  &.minor {
    flex: 0.8;
  }
}

.notice-card {
  margin: 0 24rpx 12rpx;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  background: #fff7eb;
  color: #9a5d00;
}

.notice-title {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
}

.notice-text {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.7;
}

.filter-row {
  display: flex;
  gap: 10rpx;
  padding: 0 24rpx 10rpx;
  overflow-x: auto;
  white-space: nowrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 110rpx;
  height: 56rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: #e9f1fa;
  color: #67819b;
  font-size: 22rpx;

  &.active {
    background: #dff0ff;
    color: #007fd0;
    font-weight: 600;
  }
}

.list {
  flex: 1;
  min-height: 0;
  padding: 0 24rpx;
  box-sizing: border-box;
}

.state {
  text-align: center;
  font-size: 24rpx;
  color: #8da3b9;
  padding: 120rpx 0;
}

.tx-card {
  background: #ffffff;
  border-radius: 18rpx;
  padding: 22rpx;
  margin-bottom: 14rpx;
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.05);
}

.tx-top,
.tx-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tx-title {
  font-size: 28rpx;
  color: #162033;
  font-weight: 600;
}

.tx-amount {
  font-size: 30rpx;
  font-weight: 700;

  &.income {
    color: #1ea672;
  }

  &.expense {
    color: #e55858;
  }

  &.flat {
    color: #526072;
  }
}

.tx-bottom {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #7b8794;
}

.tx-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #526072;
  line-height: 1.6;
}

.bottom-space {
  height: 24rpx;
}
</style>
