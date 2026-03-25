<template>
  <view class="recharge-page">
    <view class="top-shell" :style="{ paddingTop: topPadding + 'px' }">
      <view class="top-bar">
        <view class="back-btn" @tap="goBack">‹</view>
        <text class="top-title">充值</text>
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
      </view>

      <view class="section-card">
        <text class="section-title">支付方式</text>
        <view class="method-list">
          <view
            v-for="method in methods"
            :key="method.value"
            class="method-item"
            :class="{ active: selectedMethod === method.value }"
            @tap="selectedMethod = method.value"
          >
            <view class="method-main">
              <text class="method-name">{{ method.label }}</text>
              <text class="method-tip">{{ method.tip }}</text>
            </view>
            <text class="method-check">{{ selectedMethod === method.value ? '✓' : '' }}</text>
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
import { request } from '../../../../shared-ui/api.js'

export default {
  data() {
    return {
      statusBarHeight: 44,
      loadingBalance: false,
      submitting: false,
      balance: 0,
      amountCustom: '',
      selectedMethod: 'wechat',
      methods: [
        { value: 'wechat', label: '微信支付', tip: '推荐微信用户使用' },
        { value: 'alipay', label: '支付宝', tip: '支付宝官方渠道' }
      ]
    }
  },
  computed: {
    topPadding() {
      return Number(this.statusBarHeight || 44) + 8
    },
    amountYuan() {
      const custom = parseFloat(this.amountCustom)
      return !Number.isNaN(custom) && custom > 0 ? custom : 0
    },
    canSubmit() {
      return this.amountYuan > 0 && !this.submitting
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
    createIdempotencyKey(prefix, userId) {
      const seed = `${Date.now()}${Math.floor(Math.random() * 1000000)}`
      return `${prefix}_${String(userId || 'guest')}_${seed}`
    },
    goBack() {
      uni.navigateBack()
    },
    async loadBalance() {
      const { userId, token } = this.getAuth()
      if (!userId) return

      this.loadingBalance = true
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
      } catch (error) {
        uni.showToast({ title: '余额加载失败', icon: 'none' })
      } finally {
        this.loadingBalance = false
      }
    },
    async submitRecharge() {
      const { userId, token } = this.getAuth()
      if (!userId) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      if (!this.canSubmit) {
        uni.showToast({ title: '请输入有效金额', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const idempotencyKey = this.createIdempotencyKey('recharge', userId)
        const res = await request({
          url: '/api/wallet/recharge',
          method: 'POST',
          data: {
            userId,
            userType: 'customer',
            amount: Math.round(this.amountYuan * 100),
            paymentMethod: this.selectedMethod,
            paymentChannel: this.selectedMethod === 'wechat' ? 'wxpay' : this.selectedMethod,
            idempotencyKey
          },
          header: Object.assign({}, this.getAuthHeader(token), {
            'Idempotency-Key': idempotencyKey
          })
        })

        const status = String((res && res.status) || '')
        if (status === 'pending' || status === 'processing') {
          uni.showToast({ title: '充值处理中', icon: 'none' })
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
    }
  }
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
