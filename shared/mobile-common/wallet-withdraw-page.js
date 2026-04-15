export function createWalletWithdrawPageLogic({
  request,
  buildAuthorizationHeader,
  getAuth,
  getWithdrawName,
  userType = 'customer',
  platform = 'mini_program',
  idempotencyKeyPrefix = `${userType}_${platform}_withdraw`,
  presets = [20, 50, 100, 200, 500],
  rejectedReasonFallback = '可重新申请或联系客服处理',
} = {}) {
  const resolveAuthHeader =
    typeof buildAuthorizationHeader === 'function'
      ? buildAuthorizationHeader
      : () => ({})
  const resolveAuth =
    typeof getAuth === 'function'
      ? getAuth
      : function resolveDefaultAuth() {
          const profile = uni.getStorageSync('userProfile') || {}
          const userId = this.normalizeText(
            profile.phone ||
              profile.id ||
              profile.userId ||
              uni.getStorageSync('userId') ||
              uni.getStorageSync('phone') ||
              ''
          )
          const userName = this.normalizeText(profile.nickname || profile.name || '用户')
          const token = this.normalizeText(uni.getStorageSync('token') || uni.getStorageSync('access_token') || '')
          return { userId, userName, token }
        }
  const resolveWithdrawName =
    typeof getWithdrawName === 'function'
      ? getWithdrawName
      : (auth) => auth.userName || '用户'

  return {
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
        presets: Array.isArray(presets) && presets.length > 0 ? presets.slice() : [20, 50, 100, 200, 500],
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
        return resolveAuth.call(this)
      },
      getAuthHeader(token) {
        return resolveAuthHeader(token)
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
                userType,
                user_id: userId,
                user_type: userType,
              }),
              method: 'GET',
              header,
            }),
            request({
              url: this.withQuery('/api/wallet/withdraw/options', {
                userType,
                platform,
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
                userType,
                transactionId,
              })
            : this.withQuery('/api/wallet/withdraw/status', {
                userId,
                userType,
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
        const auth = this.getAuth()
        const { userId, token } = auth
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
            userType,
            amount: Math.round(this.amountYuan * 100),
            withdrawMethod: this.selectedMethod,
            platform,
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

          const idempotencyKey = this.createIdempotencyKey(idempotencyKeyPrefix, userId)
          const result = await request({
            url: '/api/wallet/withdraw/apply',
            method: 'POST',
          data: {
            userId,
            userType,
            amount: Math.round(this.amountYuan * 100),
            platform,
            withdrawMethod: this.selectedMethod,
            withdrawAccount: this.withdrawAccount,
            withdrawName: this.withdrawName || resolveWithdrawName(auth),
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
                  content: reason || rejectedReasonFallback,
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
}
