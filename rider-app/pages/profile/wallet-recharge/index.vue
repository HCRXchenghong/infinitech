<template>
  <view class="recharge-page">
    <view class="top-shell" :style="{ paddingTop: topPadding + 'px' }">
      <view class="top-bar">
        <view class="back-btn" @tap="goBack"><</view>
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
        <view v-else-if="paymentOptions.length === 0" class="state-text">后台暂未开放骑手充值渠道</view>
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
              <text class="method-tip">{{ method.description || '按后台配置动态生效' }}</text>
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
import { request } from '../../../shared-ui/api'

export default {
  data() {
    return {
      statusBarHeight: 44,
      loadingBalance: false,
      loadingOptions: false,
      submitting: false,
      balance: 0,
      amountCustom: '',
      selectedAmount: 100,
      selectedMethod: '',
      paymentOptions: [],
      presets: [20, 50, 100, 200, 500, 1000],
    }
  },
  computed: {
    topPadding() {
      return Number(this.statusBarHeight || 44) + 8
    },
    amountYuan() {
      const custom = parseFloat(this.amountCustom)
      if (!Number.isNaN(custom) && custom > 0) return custom
      return Number(this.selectedAmount || 0)
    },
    canSubmit() {
      return this.amountYuan > 0 && !!this.selectedMethod && !this.submitting
    },
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
    this.loadPageData()
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
    normalizeOptions(payload) {
      if (Array.isArray(payload)) return payload
      if (Array.isArray(payload && payload.options)) return payload.options
      if (Array.isArray(payload && payload.data && payload.data.options)) return payload.data.options
      return []
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
      this.selectedAmount = amount
      this.amountCustom = ''
    },
    async loadPageData() {
      const { userId, token } = this.getAuth()
      if (!userId) return

      const header = this.getAuthHeader(token)
      this.loadingBalance = true
      this.loadingOptions = true
      try {
        const [balanceRes, optionsRes] = await Promise.all([
          request({
            url: this.withQuery('/api/wallet/balance', {
              userId,
              userType: 'rider',
              user_id: userId,
              user_type: 'rider',
            }),
            method: 'GET',
            header,
          }),
          request({
            url: this.withQuery('/api/wallet/recharge/options', {
              userType: 'rider',
              platform: 'app',
              scene: 'wallet_recharge',
            }),
            method: 'GET',
            header,
          }),
        ])

        this.balance = Number(this.resolveField(balanceRes, 'balance', 0))
        this.paymentOptions = this.normalizeOptions(optionsRes)
        if (!this.selectedMethod && this.paymentOptions.length > 0) {
          this.selectedMethod = this.paymentOptions[0].channel
        }
      } catch (error) {
        uni.showToast({ title: error.error || '充值页面加载失败', icon: 'none' })
      } finally {
        this.loadingBalance = false
        this.loadingOptions = false
      }
    },
    async submitRecharge() {
      const { userId, token } = this.getAuth()
      if (!userId) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      if (!this.canSubmit) {
        uni.showToast({ title: '请输入有效金额并选择充值渠道', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const idempotencyKey = this.createIdempotencyKey('rider_recharge', userId)
        const res = await request({
          url: '/api/wallet/recharge/intent',
          method: 'POST',
          data: {
            userId,
            userType: 'rider',
            amount: Math.round(this.amountYuan * 100),
            platform: 'app',
            paymentMethod: this.selectedMethod,
            paymentChannel: this.selectedMethod,
            description: '骑手钱包充值',
            idempotencyKey,
          },
          header: Object.assign({}, this.getAuthHeader(token), {
            'Idempotency-Key': idempotencyKey,
          }),
        })

        const status = String((res && res.status) || '')
        if (status === 'pending' || status === 'processing' || status === 'awaiting_client_pay') {
          uni.showToast({ title: '充值请求已提交', icon: 'none' })
        } else {
          uni.showToast({ title: '充值成功', icon: 'success' })
        }
        setTimeout(() => {
          uni.navigateBack()
        }, 320)
      } catch (error) {
        uni.showToast({ title: error.error || '充值失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    },
    normalizeFlowStatus(payload, nestedKey) {
      return String((payload && payload.status) || (payload && payload[nestedKey] && payload[nestedKey].status) || '').trim().toLowerCase()
    },
    isRechargeSuccessStatus(status) {
      return ['success', 'completed', 'paid'].includes(String(status || '').trim().toLowerCase())
    },
    isRechargeFailureStatus(status) {
      return ['failed', 'rejected', 'cancelled', 'closed'].includes(String(status || '').trim().toLowerCase())
    },
    async pollRechargeStatus(rechargeOrderId, transactionId, token) {
      const { userId } = this.getAuth()
      let latest = null
      for (let attempt = 0; attempt < 8; attempt += 1) {
        latest = await request({
          url: this.withQuery('/api/wallet/recharge/status', {
            userId,
            userType: 'rider',
            rechargeOrderId,
            transactionId,
          }),
          method: 'GET',
          header: this.getAuthHeader(token),
        })
        const status = this.normalizeFlowStatus(latest, 'recharge')
        if (this.isRechargeSuccessStatus(status) || this.isRechargeFailureStatus(status)) {
          return latest
        }
        await this.sleep(1500)
      }
      return latest
    },
    async submitRecharge() {
      const { userId, token } = this.getAuth()
      if (!userId) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      if (!this.canSubmit) {
        uni.showToast({ title: '请输入有效金额并选择充值渠道', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const idempotencyKey = this.createIdempotencyKey('rider_recharge', userId)
        const result = await request({
          url: '/api/wallet/recharge/intent',
          method: 'POST',
          data: {
            userId,
            userType: 'rider',
            amount: Math.round(this.amountYuan * 100),
            platform: 'app',
            paymentMethod: this.selectedMethod,
            paymentChannel: this.selectedMethod,
            description: '骑手钱包充值',
            idempotencyKey,
          },
          header: Object.assign({}, this.getAuthHeader(token), {
            'Idempotency-Key': idempotencyKey,
          }),
        })

        let latest = result
        let status = this.normalizeFlowStatus(latest, 'recharge')
        if (!this.isRechargeSuccessStatus(status) && !this.isRechargeFailureStatus(status) && ((result && result.rechargeOrderId) || (result && result.transactionId))) {
          uni.showLoading({ title: '正在确认充值状态', mask: true })
          try {
            latest = await this.pollRechargeStatus(result && result.rechargeOrderId, result && result.transactionId, token)
          } finally {
            uni.hideLoading()
          }
          status = this.normalizeFlowStatus(latest, 'recharge')
        }

        if (this.isRechargeSuccessStatus(status)) {
          uni.showToast({ title: '充值成功', icon: 'success' })
        } else if (this.isRechargeFailureStatus(status)) {
          uni.showToast({ title: '充值失败，请稍后重试', icon: 'none' })
        } else {
          uni.showToast({ title: '充值请求已提交，可在钱包明细查看状态', icon: 'none' })
        }
        setTimeout(() => {
          uni.navigateBack()
        }, 360)
      } catch (error) {
        uni.showToast({ title: error.error || '充值失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  },
}
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
