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
import { request } from '../../../shared-ui/api'

export default {
  data() {
    return {
      statusBarHeight: 44,
      loadingBalance: false,
      loadingOptions: false,
      submitting: false,
      balance: 0,
      withdrawAmount: '',
      withdrawAccount: '',
      withdrawName: '',
      bankName: '',
      bankBranch: '',
      selectedMethod: '',
      withdrawOptions: [],
      presets: [50, 100, 200, 500],
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
    selectedOption() {
      return this.withdrawOptions.find((item) => item.channel === this.selectedMethod) || null
    },
    requiresName() {
      return !!(this.selectedOption && this.selectedOption.requiresName)
    },
    requiresBankName() {
      return !!(this.selectedOption && this.selectedOption.requiresBankName)
    },
    requiresBankBranch() {
      return !!(this.selectedOption && this.selectedOption.requiresBankBranch)
    },
    accountPlaceholder() {
      return (this.selectedOption && this.selectedOption.accountPlaceholder) || '请输入收款账号'
    },
    namePlaceholder() {
      return (this.selectedOption && this.selectedOption.namePlaceholder) || '请输入收款人姓名（选填）'
    },
    bankNamePlaceholder() {
      return (this.selectedOption && this.selectedOption.bankNamePlaceholder) || '请输入开户银行'
    },
    bankBranchPlaceholder() {
      return (this.selectedOption && this.selectedOption.bankBranchPlaceholder) || '请输入开户支行'
    },
    canSubmit() {
      if (!this.selectedMethod || this.amountYuan <= 0 || this.amountYuan > this.balanceYuan || this.submitting) {
        return false
      }
      if (!String(this.withdrawAccount || '').trim()) return false
      if (this.requiresName && !String(this.withdrawName || '').trim()) return false
      if (this.requiresBankName && !String(this.bankName || '').trim()) return false
      if (this.requiresBankBranch && !String(this.bankBranch || '').trim()) return false
      return true
    },
  },
  onLoad() {
    try {
      const systemInfo = uni.getSystemInfoSync() || {}
      this.statusBarHeight = Number(systemInfo.statusBarHeight || 44)
    } catch (_error) {
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
      const userId = this.normalizeText(profile.id || profile.userId || profile.riderId || uni.getStorageSync('riderId') || '')
      const riderName = this.normalizeText(profile.name || profile.realName || profile.nickname || '骑手')
      const token = this.normalizeText(uni.getStorageSync('token') || uni.getStorageSync('access_token') || '')
      return { userId, riderName, token }
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
      this.withdrawAmount = String(amount)
    },
    withdrawAll() {
      this.withdrawAmount = this.balanceYuan > 0 ? this.balanceYuan.toFixed(2) : ''
    },
    selectMethod(channel) {
      this.selectedMethod = channel
      if (channel !== 'bank_card') {
        this.bankName = ''
        this.bankBranch = ''
      }
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
            url: this.withQuery('/api/wallet/withdraw/options', {
              userType: 'rider',
              platform: 'app',
            }),
            method: 'GET',
            header,
          }),
        ])

        this.balance = Number(this.resolveField(balanceRes, 'balance', 0))
        this.withdrawOptions = this.normalizeOptions(optionsRes)
        if (!this.selectedMethod && this.withdrawOptions.length > 0) {
          this.selectedMethod = this.withdrawOptions[0].channel
        }
      } catch (error) {
        uni.showToast({ title: error.error || '提现页面加载失败', icon: 'none' })
      } finally {
        this.loadingBalance = false
        this.loadingOptions = false
      }
    },
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    },
    normalizeFlowStatus(payload, nestedKey) {
      return String((payload && payload.status) || (payload && payload[nestedKey] && payload[nestedKey].status) || '')
        .trim()
        .toLowerCase()
    },
    normalizeArrivalText(payload, nestedKey) {
      return String((payload && payload.arrivalText) || (payload && payload[nestedKey] && payload[nestedKey].arrivalText) || '')
        .trim()
    },
    normalizeWithdrawFailureReason(payload, nestedKey) {
      return String(
        (payload && payload.rejectReason) ||
        (payload && payload.reason) ||
        (payload && payload.transferResult) ||
        (payload && payload[nestedKey] && (
          payload[nestedKey].rejectReason ||
          payload[nestedKey].reason ||
          payload[nestedKey].transferResult ||
          (payload[nestedKey].responseData && (
            payload[nestedKey].responseData.rejectReason ||
            payload[nestedKey].responseData.reason ||
            payload[nestedKey].responseData.transferResult
          ))
        )) ||
        ''
      ).trim()
    },
    isWithdrawSuccessStatus(status) {
      return ['success', 'completed'].includes(String(status || '').trim().toLowerCase())
    },
    isWithdrawFailureStatus(status) {
      return ['failed', 'rejected', 'cancelled', 'closed'].includes(String(status || '').trim().toLowerCase())
    },
    flowStatusLabel(status) {
      const normalized = String(status || '').trim().toLowerCase()
      const map = {
        pending: '处理中',
        pending_review: '待审核',
        pending_transfer: '待打款',
        processing: '处理中',
        transferring: '转账中',
        success: '成功',
        completed: '成功',
        failed: '失败',
        rejected: '已驳回',
        cancelled: '已取消',
        closed: '已关闭',
      }
      return map[normalized] || '处理中'
    },
    async pollWithdrawStatus(requestId, transactionId, token) {
      const { userId } = this.getAuth()
      let latest = null
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const statusUrl = requestId
          ? this.withQuery(`/api/wallet/withdraw/status/${encodeURIComponent(String(requestId))}`, {
              userId,
              userType: 'rider',
              transactionId,
            })
          : this.withQuery('/api/wallet/withdraw/status', {
              userId,
              userType: 'rider',
              transactionId,
            })
        latest = await request({
          url: statusUrl,
          method: 'GET',
          header: this.getAuthHeader(token),
        })
        const status = this.normalizeFlowStatus(latest, 'withdraw')
        if (this.isWithdrawSuccessStatus(status) || this.isWithdrawFailureStatus(status)) {
          return latest
        }
        await this.sleep(1500)
      }
      return latest
    },
    async submitWithdraw() {
      const { userId, riderName, token } = this.getAuth()
      if (!userId) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      if (!this.canSubmit) {
        uni.showToast({ title: '请完整填写提现信息', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const preview = await request({
          url: '/api/wallet/withdraw/fee-preview',
          method: 'POST',
          data: {
            userId,
            userType: 'rider',
            amount: Math.round(this.amountYuan * 100),
            withdrawMethod: this.selectedMethod,
            platform: 'app',
          },
          header: this.getAuthHeader(token),
        })

        const confirmed = await new Promise((resolve) => {
          uni.showModal({
            title: '确认提现',
            content: `手续费 ¥${this.fen2yuan(preview.fee)}，预计到账 ¥${this.fen2yuan(preview.actualAmount)}，到账时效：${preview.arrivalText || '以通道处理为准'}`,
            success: (res) => resolve(!!res.confirm),
            fail: () => resolve(false),
          })
        })
        if (!confirmed) return

        const idempotencyKey = this.createIdempotencyKey('rider_withdraw', userId)
        const result = await request({
          url: '/api/wallet/withdraw/apply',
          method: 'POST',
          data: {
            userId,
            userType: 'rider',
            amount: Math.round(this.amountYuan * 100),
            platform: 'app',
            withdrawMethod: this.selectedMethod,
            withdrawAccount: this.withdrawAccount,
            withdrawName: this.withdrawName || riderName || '骑手',
            bankName: this.bankName,
            bankBranch: this.bankBranch,
            idempotencyKey,
          },
          header: Object.assign({}, this.getAuthHeader(token), {
            'Idempotency-Key': idempotencyKey,
          }),
        })

        let latest = result
        let status = this.normalizeFlowStatus(latest, 'withdraw')
        if (!this.isWithdrawSuccessStatus(status) && !this.isWithdrawFailureStatus(status) && ((result && result.withdrawRequestId) || (result && result.transactionId))) {
          uni.showLoading({ title: '正在确认提现状态', mask: true })
          try {
            latest = await this.pollWithdrawStatus(result && result.withdrawRequestId, result && result.transactionId, token)
          } finally {
            uni.hideLoading()
          }
          status = this.normalizeFlowStatus(latest, 'withdraw')
        }

        if (this.isWithdrawSuccessStatus(status)) {
          uni.showToast({ title: '提现成功', icon: 'success' })
        } else if (this.isWithdrawFailureStatus(status)) {
          const reason = this.normalizeWithdrawFailureReason(latest, 'withdraw')
          if (status === 'rejected') {
            await new Promise((resolve) => {
              uni.showModal({
                title: '提现已驳回',
                content: reason || '可重新申请或联系平台处理',
                showCancel: false,
                success: () => resolve(true),
                fail: () => resolve(true),
              })
            })
          } else {
            uni.showToast({ title: reason ? `提现失败：${reason}` : '提现失败，请稍后重试', icon: 'none' })
          }
        } else {
          const arrivalText = this.normalizeArrivalText(latest, 'withdraw')
          uni.showToast({
            title: arrivalText ? `提现处理中，${arrivalText}` : `提现已提交，当前状态：${this.flowStatusLabel(status)}`,
            icon: 'none',
          })
        }
        setTimeout(() => {
          uni.navigateBack()
        }, 360)
      } catch (error) {
        uni.showToast({ title: error.error || '提现失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  },
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
