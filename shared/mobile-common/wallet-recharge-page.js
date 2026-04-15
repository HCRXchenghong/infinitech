export function createWalletRechargePageLogic({
  request,
  buildAuthorizationHeader,
  getClientPaymentErrorMessage,
  invokeClientPayment,
  isClientPaymentCancelled,
  shouldLaunchClientPayment,
  getAuth,
  userType = 'customer',
  platform = 'mini_program',
  clientPaymentPlatform = platform,
  idempotencyKeyPrefix = `${userType}_${platform}_recharge`,
  rechargeDescription = '用户端余额充值',
  presets = [20, 50, 100, 200, 500, 1000],
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
          const token = this.normalizeText(uni.getStorageSync('token') || uni.getStorageSync('access_token') || '')
          return { userId, token }
        }
  const resolvePaymentErrorMessage =
    typeof getClientPaymentErrorMessage === 'function'
      ? getClientPaymentErrorMessage
      : (_error, fallback = '充值失败') => fallback
  const canLaunchClientPayment =
    typeof shouldLaunchClientPayment === 'function'
      ? shouldLaunchClientPayment
      : () => false
  const launchClientPayment =
    typeof invokeClientPayment === 'function'
      ? invokeClientPayment
      : async () => {}
  const isPaymentCancelled =
    typeof isClientPaymentCancelled === 'function'
      ? isClientPaymentCancelled
      : () => false

  return {
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
        presets: Array.isArray(presets) && presets.length > 0 ? presets.slice() : [20, 50, 100, 200, 500, 1000],
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
                userType,
                user_id: userId,
                user_type: userType,
              }),
              method: 'GET',
              header,
            }),
            request({
              url: this.withQuery('/api/wallet/recharge/options', {
                userType,
                platform,
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
              userType,
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
          const idempotencyKey = this.createIdempotencyKey(idempotencyKeyPrefix, userId)
          const result = await request({
            url: '/api/wallet/recharge/intent',
            method: 'POST',
          data: {
            userId,
            userType,
            amount: Math.round(this.amountYuan * 100),
            platform,
              paymentMethod: this.selectedMethod,
              paymentChannel: this.selectedMethod,
              description: rechargeDescription,
              idempotencyKey,
            },
            header: Object.assign({}, this.getAuthHeader(token), {
              'Idempotency-Key': idempotencyKey,
            }),
          })

          if (canLaunchClientPayment(result)) {
            uni.showLoading({ title: '正在拉起支付', mask: true })
            try {
              await launchClientPayment(result, clientPaymentPlatform)
            } finally {
              uni.hideLoading()
            }
          }

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
          uni.showToast({
            title: isPaymentCancelled(error)
              ? '已取消支付'
              : (error.error || resolvePaymentErrorMessage(error, '充值失败')),
            icon: 'none'
          })
        } finally {
          this.submitting = false
        }
      },
    },
  }
}
