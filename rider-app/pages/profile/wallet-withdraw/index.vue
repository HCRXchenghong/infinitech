<template>
  <view class="withdraw-page">
    <view class="top-shell" :style="{ paddingTop: topPadding + 'px' }">
      <view class="top-bar">
        <view class="back-btn" @tap="goBack">‹</view>
        <text class="top-title">提现</text>
        <view class="right-holder"></view>
      </view>
    </view>

    <view class="content-shell">
      <view class="section-card">
        <text class="section-title">到账账户</text>
        <input class="normal-input" v-model="withdrawAccount" placeholder="输入银行卡或支付宝账号" />
        <input class="normal-input" v-model="withdrawName" placeholder="收款人姓名（选填）" />
        <text class="section-tip">预计 2 小时内到账，具体以通道处理结果为准</text>
      </view>

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
          <view
            v-for="item in presets"
            :key="item"
            class="preset-item"
            @tap="selectPreset(item)"
          >
            ¥{{ item }}
          </view>
        </view>
      </view>

      <view class="tip-card">
        <text class="tip-title">提现提示</text>
        <text class="tip-text">仅保留必要功能：到账账户、提现金额、提交申请。提交后可在账单明细查看状态。</text>
      </view>
    </view>

    <view class="bottom-bar">
      <button class="submit-btn" :loading="submitting" :disabled="!canSubmit" @tap="submitWithdraw">
        提现
      </button>
    </view>
  </view>
</template>

<script>
import { request } from '../../../shared-ui/api'

export default {
  data() {
    return {
      statusBarHeight: 44,
      loadingBalance: false,
      submitting: false,
      balance: 0,
      withdrawAmount: '',
      withdrawAccount: '',
      withdrawName: '',
      presets: [50, 100, 200]
    }
  },
  computed: {
    topPadding() {
      return Number(this.statusBarHeight || 44) + 8
    },
    amountYuan() {
      const value = parseFloat(this.withdrawAmount)
      return Number.isNaN(value) ? 0 : value
    },
    balanceYuan() {
      return Number(this.balance || 0) / 100
    },
    canSubmit() {
      const accountOk = String(this.withdrawAccount || '').trim().length > 0
      return accountOk && this.amountYuan > 0 && this.amountYuan <= this.balanceYuan && !this.submitting
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
      const profile = uni.getStorageSync('riderProfile') || {}
      const userId = this.normalizeText(
        profile.id ||
        profile.userId ||
        profile.riderId ||
        uni.getStorageSync('riderId') ||
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
    createIdempotencyKey(prefix, userId) {
      const seed = `${Date.now()}${Math.floor(Math.random() * 1000000)}`
      return `${prefix}_${String(userId || 'guest')}_${seed}`
    },
    goBack() {
      uni.navigateBack()
    },
    selectPreset(amount) {
      this.withdrawAmount = String(amount)
    },
    withdrawAll() {
      this.withdrawAmount = this.balanceYuan > 0 ? this.balanceYuan.toFixed(2) : ''
    },
    async loadBalance() {
      const { userId, token } = this.getAuth()
      if (!userId) return

      this.loadingBalance = true
      try {
        const res = await request({
          url: this.withQuery('/api/wallet/balance', {
            userId,
            userType: 'rider',
            user_id: userId,
            user_type: 'rider'
          }),
          method: 'GET',
          header: this.getAuthHeader(token)
        })
        this.balance = Number(this.resolveField(res, 'balance', 0))
      } catch (error) {
        uni.showToast({ title: '余额加载失败', icon: 'none' })
      } finally {
        this.loadingBalance = false
      }
    },
    async submitWithdraw() {
      const { userId, token } = this.getAuth()
      if (!userId) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      if (!String(this.withdrawAccount || '').trim()) {
        uni.showToast({ title: '请输入收款账号', icon: 'none' })
        return
      }
      if (!this.amountYuan || this.amountYuan <= 0) {
        uni.showToast({ title: '请输入提现金额', icon: 'none' })
        return
      }
      if (this.amountYuan > this.balanceYuan) {
        uni.showToast({ title: '提现金额不能超过可用余额', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const idempotencyKey = this.createIdempotencyKey('withdraw', userId)
        await request({
          url: '/api/wallet/withdraw',
          method: 'POST',
          data: {
            userId,
            userType: 'rider',
            amount: Math.round(this.amountYuan * 100),
            withdrawMethod: 'bank',
            withdrawAccount: this.withdrawAccount,
            withdrawName: this.withdrawName,
            idempotencyKey
          },
          header: Object.assign({}, this.getAuthHeader(token), {
            'Idempotency-Key': idempotencyKey
          })
        })

        uni.showToast({ title: '提现申请已提交', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 320)
      } catch (error) {
        uni.showToast({ title: error.error || '提现失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    }
  }
}
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

.section-card,
.tip-card {
  background: #ffffff;
  border-radius: 22rpx;
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.06);
}

.section-card {
  padding: 22rpx;
  margin-bottom: 14rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
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

.section-tip {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #6b7280;
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

.tip-card {
  padding: 22rpx;
}

.tip-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2937;
}

.tip-text {
  display: block;
  margin-top: 10rpx;
  font-size: 23rpx;
  line-height: 1.65;
  color: #6b7280;
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
  background: linear-gradient(135deg, #6aa8ff 0%, #8cbcff 100%);
}

.submit-btn:not([disabled]) {
  background: linear-gradient(135deg, #1f6dff 0%, #3486ff 100%);
}

.submit-btn::after {
  border: none;
}

.submit-btn[disabled] {
  opacity: 0.56;
}
</style>
