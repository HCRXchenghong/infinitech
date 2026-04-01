<template>
  <view class="wallet-page">
    <view class="hero-shell" :style="{ paddingTop: topPadding + 'px' }">
      <view class="hero-top">
        <view class="hero-title-group">
          <text class="hero-title">我的钱包</text>
          <text class="hero-subtitle">骑手 IF-Pay 账户</text>
        </view>
        <view class="bill-entry" @tap="goBills">
          <text class="bill-entry-text">账单明细</text>
          <text class="bill-entry-arrow">></text>
        </view>
      </view>

      <view class="hero-card">
        <text class="asset-label">可用余额</text>
        <text class="asset-value">¥{{ loading ? '--' : fen2yuan(balance) }}</text>

        <view class="asset-grid">
          <view class="asset-item">
            <text class="asset-item-label">可用</text>
            <text class="asset-item-value">¥{{ loading ? '--' : fen2yuan(balance) }}</text>
          </view>
          <view class="asset-item">
            <text class="asset-item-label">冻结</text>
            <text class="asset-item-value">¥{{ loading ? '--' : fen2yuan(frozenBalance) }}</text>
          </view>
          <view class="asset-item">
            <text class="asset-item-label">保证金</text>
            <text class="asset-item-value">¥{{ depositStatus ? fen2yuan(depositAmount) : '--' }}</text>
          </view>
        </view>

        <view class="action-row">
          <view class="action-btn primary" @tap="goRecharge">余额充值</view>
          <view class="action-btn ghost" @tap="goWithdraw">余额提现</view>
          <view class="action-btn minor" @tap="loadAll">刷新</view>
        </view>
      </view>
    </view>

    <view class="content-shell">
      <view class="section-card">
        <view class="section-head">
          <text class="section-title">接单保证金</text>
          <text class="status-badge" :class="statusClass">{{ depositStatusText }}</text>
        </view>

        <text class="deposit-amount">保证金金额 ¥{{ depositStatus ? fen2yuan(depositAmount) : '50.00' }}</text>
        <text class="deposit-tip">{{ depositTip }}</text>

        <view class="meta-grid">
          <view class="meta-item">
            <text class="meta-label">接单资格</text>
            <text class="meta-value">{{ canAcceptOrders ? '已解锁' : '未解锁' }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">解锁周期</text>
            <text class="meta-value">{{ unlockDays }} 天</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">最近接单</text>
            <text class="meta-value">{{ formatTime(depositStatus && depositStatus.lastAcceptedAt) }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">可提现时间</text>
            <text class="meta-value">{{ formatTime(depositStatus && depositStatus.withdrawableAt) }}</text>
          </view>
        </view>

        <view class="deposit-actions">
          <button v-if="canPayDeposit" class="deposit-btn primary" @tap="payDeposit">立即缴纳 50 元</button>
          <button v-if="canWithdrawDeposit" class="deposit-btn" @tap="withdrawDeposit">提取保证金</button>
        </view>

        <text class="deposit-note">规则：骑手想接单必须先缴纳 50 元保证金。7 日内无接单且当前没有进行中订单时，可提现吗。</text>
      </view>

      <view class="section-card">
        <text class="section-title">支持渠道</text>
        <text class="support-text">余额充值与保证金缴纳按后台配置动态生效，关闭的渠道前端不会显示。</text>
        <view class="channel-list">
          <view v-for="item in depositPayOptions" :key="item.channel" class="channel-chip">
            {{ item.label || item.channel }}
          </view>
          <view v-if="depositPayOptions.length === 0" class="channel-empty">暂未开启保证金缴纳渠道</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../../shared-ui/api'

export default {
  data() {
    return {
      statusBarHeight: 44,
      loading: false,
      balance: 0,
      frozenBalance: 0,
      depositStatus: null,
      depositPayOptions: [],
      withdrawOptions: [],
    }
  },
  computed: {
    topPadding() {
      return Number(this.statusBarHeight || 44) + 12
    },
    depositAmount() {
      return Number((this.depositStatus && this.depositStatus.amount) || 5000)
    },
    unlockDays() {
      return Number((this.depositStatus && this.depositStatus.unlockDays) || 7)
    },
    canAcceptOrders() {
      return !!(this.depositStatus && this.depositStatus.canAcceptOrders)
    },
    statusValue() {
      return String((this.depositStatus && this.depositStatus.status) || 'unpaid')
    },
    statusClass() {
      return `status-${this.statusValue}`
    },
    depositStatusText() {
      const map = {
        unpaid: '待缴纳',
        paid_locked: '已锁定',
        withdrawable: '可提现',
        withdrawing: '提现中',
        refunded: '已退回',
      }
      return map[this.statusValue] || '处理中'
    },
    depositTip() {
      if (this.statusValue === 'withdrawable') {
        return '当前满足 7 天未接单且无进行中订单，可发起保证金提现吗。'
      }
      if (this.statusValue === 'withdrawing') {
        return '保证金提现正在处理中，到账后将失去接单资格。'
      }
      if (this.statusValue === 'paid_locked') {
        return '保证金已生效，可正常接单。最近 7 天内有接单或仍有进行中订单时，暂不可提现吗。'
      }
      if (this.statusValue === 'refunded') {
        return '保证金已退回，如需继续接单，请重新缴纳 50 元保证金。'
      }
      return '缴纳 50 元保证金后才可接单。'
    },
    canPayDeposit() {
      return this.statusValue === 'unpaid' || this.statusValue === 'refunded'
    },
    canWithdrawDeposit() {
      return this.statusValue === 'withdrawable'
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
    this.loadAll()
  },
  methods: {
    normalizeText(value) {
      return String(value == null ? '' : value).trim()
    },
    getAuth() {
      const profile = uni.getStorageSync('riderProfile') || {}
      const riderId = this.normalizeText(
        profile.id ||
        profile.userId ||
        profile.riderId ||
        uni.getStorageSync('riderId') ||
        ''
      )
      const riderName = this.normalizeText(profile.name || profile.realName || profile.nickname || '骑手')
      const token = this.normalizeText(uni.getStorageSync('token') || uni.getStorageSync('access_token') || '')
      return { riderId, riderName, token }
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
    formatTime(value) {
      if (!value) return '--'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '--'
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hour}:${minute}`
    },
    createIdempotencyKey(prefix, riderId) {
      const seed = `${Date.now()}${Math.floor(Math.random() * 1000000)}`
      return `${prefix}_${String(riderId || 'guest')}_${seed}`
    },
    async loadAll() {
      const { riderId, token } = this.getAuth()
      if (!riderId) {
        this.depositStatus = null
        this.depositPayOptions = []
        this.withdrawOptions = []
        this.balance = 0
        this.frozenBalance = 0
        return
      }

      this.loading = true
      try {
        const header = this.getAuthHeader(token)
        const [balanceRes, depositRes, payOptionsRes, withdrawOptionsRes] = await Promise.all([
          request({
            url: this.withQuery('/api/wallet/balance', {
              userId: riderId,
              userType: 'rider',
              user_id: riderId,
              user_type: 'rider',
            }),
            method: 'GET',
            header,
          }),
          request({
            url: this.withQuery('/api/rider/deposit/status', { riderId }),
            method: 'GET',
            header,
          }),
          request({
            url: this.withQuery('/api/wallet/payment-options', {
              userType: 'rider',
              platform: 'app',
              scene: 'rider_deposit',
            }),
            method: 'GET',
            header,
          }),
          request({
            url: this.withQuery('/api/wallet/withdraw/options', {
              userType: 'rider',
              platform: 'app',
            }),
            method: 'GET',
            header,
          }),
        ])

        this.balance = Number(this.resolveField(balanceRes, 'balance', 0))
        this.frozenBalance = Number(this.resolveField(balanceRes, 'frozenBalance', this.resolveField(balanceRes, 'frozen_balance', 0)))
        this.depositStatus = depositRes || null
        this.depositPayOptions = this.normalizeOptions(payOptionsRes)
        this.withdrawOptions = this.normalizeOptions(withdrawOptionsRes)
      } catch (error) {
        uni.showToast({ title: error.error || '钱包信息加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    goBills() {
      uni.navigateTo({ url: '/pages/profile/wallet-bills/index' })
    },
    goRecharge() {
      uni.navigateTo({ url: '/pages/profile/wallet-recharge/index' })
    },
    goWithdraw() {
      uni.navigateTo({ url: '/pages/profile/wallet-withdraw/index' })
    },
    pickOption(options, emptyMessage) {
      return new Promise((resolve) => {
        if (!options.length) {
          uni.showToast({ title: emptyMessage, icon: 'none' })
          resolve(null)
          return
        }
        uni.showActionSheet({
          itemList: options.map((item) => item.label || item.channel || '未命名渠道'),
          success: (res) => resolve(options[res.tapIndex] || null),
          fail: () => resolve(null),
        })
      })
    },
    promptText(title, placeholderText) {
      return new Promise((resolve) => {
        uni.showModal({
          title,
          editable: true,
          placeholderText,
          success: (res) => {
            if (!res.confirm) {
              resolve(null)
              return
            }
            resolve(this.normalizeText(res.content))
          },
          fail: () => resolve(null),
        })
      })
    },
    async payDeposit() {
      const { riderId, token } = this.getAuth()
      if (!riderId) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      const selected = await this.pickOption(this.depositPayOptions, '暂未开启保证金缴纳渠道')
      if (!selected) return

      try {
        const idempotencyKey = this.createIdempotencyKey('rider_deposit', riderId)
        const res = await request({
          url: '/api/rider/deposit/pay-intent',
          method: 'POST',
          data: {
            riderId,
            paymentMethod: selected.channel,
            paymentChannel: selected.channel,
            description: '骑手保证金缴纳',
            idempotencyKey,
          },
          header: Object.assign({}, this.getAuthHeader(token), {
            'Idempotency-Key': idempotencyKey,
          }),
        })

        if (res && res.duplicated) {
          uni.showToast({ title: '当前已有有效保证金', icon: 'none' })
        } else if (String((res && res.status) || '') === 'awaiting_client_pay') {
          uni.showToast({ title: '保证金缴纳请求已提交，请继续完成支付', icon: 'none' })
        } else {
          uni.showToast({ title: '保证金已缴纳', icon: 'success' })
        }
        await this.loadAll()
      } catch (error) {
        uni.showToast({ title: error.error || '保证金缴纳失败', icon: 'none' })
      }
    },
    async withdrawDeposit() {
      const { riderId, riderName, token } = this.getAuth()
      if (!riderId || !this.canWithdrawDeposit) {
        uni.showToast({ title: '当前保证金不可提现吗', icon: 'none' })
        return
      }
      const selected = await this.pickOption(this.withdrawOptions, '暂未开启保证金提现吗渠道')
      if (!selected) return

      const title = selected.channel === 'bank_card' ? '输入银行卡号' : '输入收款账号'
      const placeholder = selected.channel === 'bank_card' ? '请输入银行卡号' : '请输入提现收款账号'
      const withdrawAccount = await this.promptText(title, placeholder)
      if (!withdrawAccount) return

      let bankName = ''
      if (selected.channel === 'bank_card') {
        bankName = (await this.promptText('输入开户银行', '请输入开户银行名称（选填）')) || ''
      }

      try {
        const preview = await request({
          url: '/api/wallet/withdraw/fee-preview',
          method: 'POST',
          data: {
            userId: riderId,
            userType: 'rider',
            amount: this.depositAmount,
            withdrawMethod: selected.channel,
            platform: 'app',
          },
          header: this.getAuthHeader(token),
        })

        const confirmed = await new Promise((resolve) => {
          uni.showModal({
            title: '确认保证金提现吗',
            content: `手续费 ¥${this.fen2yuan(preview.fee)}，预计到账 ¥${this.fen2yuan(preview.actualAmount)}，到账时效：${preview.arrivalText || '以通道处理为准'}`,
            success: (res) => resolve(!!res.confirm),
            fail: () => resolve(false),
          })
        })
        if (!confirmed) return

        const idempotencyKey = this.createIdempotencyKey('rider_deposit_withdraw', riderId)
        await request({
          url: '/api/rider/deposit/withdraw',
          method: 'POST',
          data: {
            riderId,
            withdrawMethod: selected.channel,
            withdrawAccount,
            withdrawName: riderName || '骑手',
            bankName,
            idempotencyKey,
          },
          header: Object.assign({}, this.getAuthHeader(token), {
            'Idempotency-Key': idempotencyKey,
          }),
        })

        uni.showToast({ title: '保证金提现吗申请已提交', icon: 'success' })
        await this.loadAll()
      } catch (error) {
        uni.showToast({ title: error.error || '保证金提现吗失败', icon: 'none' })
      }
    },
  },
}
</script>

<style scoped lang="scss">
.wallet-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #edf2fb 0%, #f5f7fc 48%, #f8fafc 100%);
}

.hero-shell {
  padding: 0 24rpx 20rpx;
  background: linear-gradient(160deg, #0d2e78 0%, #0f52ca 54%, #2f79e8 100%);
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

.bill-entry-text,
.bill-entry-arrow {
  font-size: 24rpx;
  color: #ffffff;
}

.bill-entry-arrow {
  margin-left: 6rpx;
}

.hero-card {
  margin-top: 16rpx;
  padding: 30rpx 28rpx;
  border-radius: 28rpx;
  background: linear-gradient(145deg, rgba(5, 20, 56, 0.92) 0%, rgba(19, 72, 170, 0.85) 60%, rgba(50, 118, 220, 0.8) 100%);
  box-shadow: 0 18rpx 42rpx rgba(10, 41, 104, 0.34);
}

.asset-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.84);
}

.asset-value {
  display: block;
  margin-top: 12rpx;
  font-size: 68rpx;
  font-weight: 700;
  line-height: 1.1;
  color: #ffffff;
}

.asset-grid {
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
  font-size: 28rpx;
  font-weight: 700;
}

.action-btn.primary {
  color: #123d93;
  background: #ffffff;
}

.action-btn.ghost,
.action-btn.minor {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.18);
  border: 1rpx solid rgba(255, 255, 255, 0.42);
}

.action-btn.minor {
  flex: 0.82;
}

.content-shell {
  margin-top: 16rpx;
  padding: 0 24rpx calc(24rpx + env(safe-area-inset-bottom));
}

.section-card {
  margin-bottom: 16rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 14rpx 30rpx rgba(15, 23, 42, 0.08);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
}

.status-badge {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.status-unpaid {
  color: #c2410c;
  background: #ffedd5;
}

.status-paid_locked {
  color: #1d4ed8;
  background: #dbeafe;
}

.status-withdrawable {
  color: #047857;
  background: #d1fae5;
}

.status-withdrawing {
  color: #6d28d9;
  background: #ede9fe;
}

.status-refunded {
  color: #475569;
  background: #e2e8f0;
}

.deposit-amount {
  display: block;
  margin-top: 14rpx;
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
}

.deposit-tip,
.deposit-note,
.support-text {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #4b5563;
}

.meta-grid {
  margin-top: 18rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.meta-item {
  padding: 18rpx;
  border-radius: 18rpx;
  background: #f8fafc;
}

.meta-label {
  display: block;
  font-size: 22rpx;
  color: #64748b;
}

.meta-value {
  display: block;
  margin-top: 6rpx;
  font-size: 25rpx;
  font-weight: 600;
  color: #0f172a;
}

.deposit-actions {
  margin-top: 18rpx;
  display: flex;
  gap: 12rpx;
}

.deposit-btn {
  flex: 1;
  height: 78rpx;
  border: none;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #1d4ed8;
  background: #e0ecff;
}

.deposit-btn.primary {
  color: #ffffff;
  background: linear-gradient(135deg, #1f6dff 0%, #3486ff 100%);
}

.deposit-btn::after {
  border: none;
}

.channel-list {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.channel-chip,
.channel-empty {
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: #eef4ff;
  color: #1d4ed8;
  font-size: 22rpx;
}

.channel-empty {
  background: #f1f5f9;
  color: #64748b;
}
</style>
