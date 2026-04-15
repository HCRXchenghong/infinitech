export function createWalletOverviewPageLogic({
  request,
  buildAuthorizationHeader,
} = {}) {
  const resolveAuthHeader =
    typeof buildAuthorizationHeader === 'function'
      ? buildAuthorizationHeader
      : () => ({})

  return {
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
          this.frozenBalance = Number(
            this.resolveField(
              res,
              'frozenBalance',
              this.resolveField(res, 'frozen_balance', 0)
            )
          )
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
}
