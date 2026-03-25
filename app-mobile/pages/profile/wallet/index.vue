<template>
  <view class="wallet-page">
    <view class="hero-shell" :style="{ paddingTop: topPadding + 'px' }">
      <view class="hero-top">
        <view class="hero-title-group">
          <text class="hero-title">我的资产</text>
          <text class="hero-subtitle">IF-Pay 账户</text>
        </view>
        <view class="bill-entry" @tap="goBills">
          <text class="bill-entry-text">账单明细</text>
          <text class="bill-entry-arrow">›</text>
        </view>
      </view>

      <view class="hero-card">
        <view class="hero-glow glow-left"></view>
        <view class="hero-glow glow-right"></view>
        <text class="asset-label">IF-Pay 账户余额（元）</text>
        <text class="asset-value">{{ loading ? '--' : fen2yuan(balance) }}</text>

        <view class="asset-grid">
          <view class="asset-item">
            <text class="asset-item-label">可用余额</text>
            <text class="asset-item-value">¥{{ loading ? '--' : fen2yuan(balance) }}</text>
          </view>
          <view class="asset-item">
            <text class="asset-item-label">冻结金额</text>
            <text class="asset-item-value">¥{{ loading ? '--' : fen2yuan(frozenBalance) }}</text>
          </view>
          <view class="asset-item">
            <text class="asset-item-label">账户总资产</text>
            <text class="asset-item-value">¥{{ loading ? '--' : fen2yuan(balance + frozenBalance) }}</text>
          </view>
        </view>

        <view class="action-row">
          <view class="action-btn primary" @tap="goRecharge">充值</view>
          <view class="action-btn ghost" @tap="goWithdraw">提现</view>
        </view>
      </view>
    </view>

    <view class="content-shell">
      <view class="hint-card">
        <text class="hint-title">账户说明</text>
        <text class="hint-text">我的资产中的金额就是你的 IF-Pay 账户资金，可用于下单支付、退款回流与提现结算。</text>
        <view class="hint-action" @tap="goBills">
          <text class="hint-action-text">查看账单明细</text>
          <text class="hint-action-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../../shared-ui/api.js'

export default {
  data() {
    return {
      statusBarHeight: 44,
      loading: false,
      balance: 0,
      frozenBalance: 0
    }
  },
  computed: {
    topPadding() {
      return Number(this.statusBarHeight || 44) + 12
    }
  },
  onLoad() {
    try {
      const systemInfo = uni.getSystemInfoSync() || {}
      this.statusBarHeight = Number(systemInfo.statusBarHeight || 44)
    } catch (error) {
      this.statusBarHeight = 44
    }
  },
  onShow() {
    this.loadBalance()
  },
  methods: {
    normalizeText(value) {
      return String(value == null ? '' : value).trim()
    },
    getAuth() {
      const profile = uni.getStorageSync('userProfile') || {}
      const userId = this.normalizeText(
        profile.phone ||
        profile.id ||
        profile.userId ||
        uni.getStorageSync('userId') ||
        uni.getStorageSync('phone') ||
        ''
      )
      const token = this.normalizeText(uni.getStorageSync('token') || uni.getStorageSync('access_token') || '')
      return { userId, token }
    },
    getAuthHeader(token) {
      if (!token) return {}
      return { Authorization: `Bearer ${token}` }
    },
    withQuery(path, params) {
      const query = Object.keys(params || {})
        .filter((key) => params[key] !== '' && params[key] !== undefined && params[key] !== null)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&')
      return query ? `${path}?${query}` : path
    },
    resolveField(data, key, fallback = 0) {
      if (data && data[key] !== undefined && data[key] !== null) return data[key]
      if (data && data.data && data.data[key] !== undefined && data.data[key] !== null) return data.data[key]
      return fallback
    },
    fen2yuan(fen) {
      return (Math.abs(Number(fen || 0)) / 100).toFixed(2)
    },
    async loadBalance() {
      this.loading = true
      const { userId, token } = this.getAuth()
      if (!userId) {
        this.loading = false
        return
      }

      try {
        const res = await request({
          url: this.withQuery('/api/wallet/balance', {
            userId,
            userType: 'customer',
            user_id: userId,
            user_type: 'customer'
          }),
          method: 'GET',
          header: this.getAuthHeader(token)
        })

        this.balance = Number(this.resolveField(res, 'balance', 0))
        this.frozenBalance = Number(this.resolveField(res, 'frozenBalance', this.resolveField(res, 'frozen_balance', 0)))
      } catch (error) {
        uni.showToast({ title: '资产加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    goBills() {
      uni.navigateTo({ url: '/pages/profile/wallet/bills/index' })
    },
    goRecharge() {
      uni.navigateTo({ url: '/pages/profile/wallet/recharge/index' })
    },
    goWithdraw() {
      uni.navigateTo({ url: '/pages/profile/wallet/withdraw/index' })
    }
  }
}
</script>

<style scoped lang="scss">
.wallet-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #edf2fb 0%, #f5f7fc 45%, #f8fafc 100%);
}

.hero-shell {
  padding: 0 24rpx 20rpx;
  background: linear-gradient(160deg, #0c2f78 0%, #0f52ca 54%, #2f79e8 100%);
}

.hero-top {
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #f8fbff;
}

.hero-subtitle {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: rgba(232, 242, 255, 0.82);
}

.bill-entry {
  display: flex;
  align-items: center;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
}

.bill-entry-text {
  font-size: 24rpx;
  color: #ffffff;
}

.bill-entry-arrow {
  margin-left: 6rpx;
  font-size: 24rpx;
  color: #ffffff;
}

.hero-card {
  position: relative;
  overflow: hidden;
  margin-top: 16rpx;
  padding: 30rpx 28rpx;
  border-radius: 28rpx;
  background: linear-gradient(145deg, rgba(5, 20, 56, 0.92) 0%, rgba(19, 72, 170, 0.85) 60%, rgba(50, 118, 220, 0.8) 100%);
  box-shadow: 0 18rpx 42rpx rgba(10, 41, 104, 0.34);
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.glow-left {
  width: 220rpx;
  height: 220rpx;
  top: -120rpx;
  left: -70rpx;
  background: radial-gradient(circle, rgba(134, 189, 255, 0.56) 0%, rgba(134, 189, 255, 0) 72%);
}

.glow-right {
  width: 280rpx;
  height: 280rpx;
  right: -100rpx;
  bottom: -140rpx;
  background: radial-gradient(circle, rgba(177, 230, 255, 0.4) 0%, rgba(177, 230, 255, 0) 70%);
}

.asset-label {
  position: relative;
  z-index: 1;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.84);
}

.asset-value {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: 12rpx;
  font-size: 68rpx;
  font-weight: 700;
  line-height: 1.1;
  color: #ffffff;
  letter-spacing: 1rpx;
}

.asset-grid {
  position: relative;
  z-index: 1;
  margin-top: 22rpx;
  padding: 16rpx 10rpx;
  border-radius: 18rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  background: rgba(255, 255, 255, 0.13);
}

.asset-item {
  text-align: center;
}

.asset-item-label {
  font-size: 21rpx;
  color: rgba(255, 255, 255, 0.86);
}

.asset-item-value {
  margin-top: 6rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #ffffff;
}

.action-row {
  position: relative;
  z-index: 1;
  margin-top: 22rpx;
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  height: 78rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 700;
}

.action-btn.primary {
  color: #123d93;
  background: #ffffff;
  box-shadow: 0 8rpx 20rpx rgba(3, 17, 48, 0.24);
}

.action-btn.ghost {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.18);
  border: 1rpx solid rgba(255, 255, 255, 0.42);
}

.content-shell {
  margin-top: 16rpx;
  padding: 0 24rpx calc(24rpx + env(safe-area-inset-bottom));
}

.hint-card {
  padding: 24rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 14rpx 30rpx rgba(15, 23, 42, 0.08);
}

.hint-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
}

.hint-text {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.65;
  color: #4b5563;
}

.hint-action {
  margin-top: 16rpx;
  height: 70rpx;
  padding: 0 18rpx;
  border-radius: 16rpx;
  background: #f1f5ff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hint-action-text {
  font-size: 24rpx;
  color: #1f4db3;
  font-weight: 600;
}

.hint-action-arrow {
  font-size: 28rpx;
  color: #1f4db3;
}
</style>
