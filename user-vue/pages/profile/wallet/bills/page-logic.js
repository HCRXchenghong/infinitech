import { request } from '../../../../shared-ui/api.js'

export default {
  data() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const currentDate = `${year}-${month}-${day}`

    return {
      statusBarHeight: 44,
      loading: false,
      errorText: '',
      transactions: [],
      filterType: '',
      detailVisible: false,
      detailTx: null,
      rangeMode: 'month',
      monthValue: `${year}-${month}`,
      customStartDate: currentDate,
      customEndDate: currentDate,
      incomeAmount: 0,
      expenseAmount: 0,
      filterOptions: [
        { key: 'all', label: '全部', value: '' },
        { key: 'payment', label: '支付', value: 'payment' },
        { key: 'recharge', label: '充值', value: 'recharge' },
        { key: 'refund', label: '退款', value: 'refund' },
        { key: 'withdraw', label: '提现', value: 'withdraw' }
      ]
    }
  },
  computed: {
    topPadding() {
      return Number(this.statusBarHeight || 44) + 10
    },
    monthDisplay() {
      return this.formatMonth(this.monthValue)
    },
    periodLabel() {
      if (this.rangeMode === 'all') return '全部时间'
      if (this.rangeMode === 'custom') {
        return `${this.customStartDate || '-'} 至 ${this.customEndDate || '-'}`
      }
      return this.formatMonth(this.monthValue)
    },
    detailRows() {
      const tx = this.detailTx
      if (!tx) return []
      return [
        { label: '交易类型', value: this.txTypeLabel(tx.type) },
        { label: '交易金额', value: this.amountText(tx) },
        { label: '交易状态', value: this.statusLabel(tx.status) },
        { label: '支付方式', value: this.paymentMethodLabel(tx.payment_method || tx.paymentMethod) },
        { label: '交易编号', value: tx.transaction_id || tx.transactionId || '-' },
        { label: '创建时间', value: this.formatTime(tx.created_at || tx.createdAt) || '-' },
        { label: '备注', value: tx.description || tx.remark || '-' }
      ]
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
    this.loadBills(false)
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
    extractTxItems(data) {
      if (Array.isArray(data)) return data
      if (data && Array.isArray(data.items)) return data.items
      if (data && data.data && Array.isArray(data.data.items)) return data.data.items
      if (data && data.data && Array.isArray(data.data)) return data.data
      return []
    },
    parseDateTime(value) {
      const text = this.normalizeText(value)
      if (!text) return null
      const direct = new Date(text.includes('T') ? text : text.replace(' ', 'T'))
      if (!Number.isNaN(direct.getTime())) return direct
      const fallback = new Date(text.replace(/-/g, '/'))
      if (!Number.isNaN(fallback.getTime())) return fallback
      return null
    },
    pad(num) {
      return String(Number(num || 0)).padStart(2, '0')
    },
    formatDate(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
      return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`
    },
    formatMonth(value) {
      const text = this.normalizeText(value)
      const match = text.match(/^(\d{4})-(\d{1,2})$/)
      if (!match) return text || '按月筛选'
      return `${match[1]}年${this.pad(match[2])}月`
    },
    shiftDate(dateText, days) {
      const base = this.parseDateTime(dateText)
      if (!base) return dateText
      const target = new Date(base)
      target.setDate(target.getDate() + Number(days || 0))
      return this.formatDate(target)
    },
    getMonthRange(monthText) {
      const matched = this.normalizeText(monthText).match(/^(\d{4})-(\d{1,2})$/)
      if (!matched) {
        const today = new Date()
        return {
          startDate: `${today.getFullYear()}-${this.pad(today.getMonth() + 1)}-01`,
          endDate: this.formatDate(today)
        }
      }
      const year = Number(matched[1])
      const month = Number(matched[2])
      const endDateObj = new Date(year, month, 0)
      return {
        startDate: `${year}-${this.pad(month)}-01`,
        endDate: this.formatDate(endDateObj)
      }
    },
    buildTimeParams() {
      if (this.rangeMode === 'all') return {}

      if (this.rangeMode === 'month') {
        const range = this.getMonthRange(this.monthValue)
        return {
          startTime: range.startDate,
          endTime: range.endDate,
          start_date: range.startDate,
          end_date: range.endDate
        }
      }

      if (!this.customStartDate || !this.customEndDate) return {}
      return {
        startTime: this.customStartDate,
        endTime: this.customEndDate,
        start_date: this.customStartDate,
        end_date: this.customEndDate
      }
    },
    isIncomeType(type) {
      return ['refund', 'recharge', 'compensation', 'admin_add_balance', 'income'].includes(String(type || '').toLowerCase())
    },
    isExpenseType(type) {
      return ['payment', 'withdraw', 'admin_deduct_balance'].includes(String(type || '').toLowerCase())
    },
    signedAmount(tx) {
      const amount = Math.abs(Number(tx && tx.amount ? tx.amount : 0))
      const type = tx && tx.type ? tx.type : ''
      if (this.isIncomeType(type)) return amount
      if (this.isExpenseType(type)) return -amount
      return Number(tx && tx.amount ? tx.amount : 0)
    },
    amountClass(tx) {
      return this.signedAmount(tx) >= 0 ? 'income' : 'expense'
    },
    amountText(tx) {
      const amount = this.signedAmount(tx)
      const sign = amount >= 0 ? '+' : '-'
      return `${sign}¥${this.fen2yuan(amount)}`
    },
    fen2yuan(fen) {
      return (Math.abs(Number(fen || 0)) / 100).toFixed(2)
    },
    paymentMethodLabel(method) {
      return {
        ifpay: 'IF-Pay',
        'if-pay': 'IF-Pay',
        if_pay: 'IF-Pay',
        wechat: '微信支付',
        wxpay: '微信支付',
        alipay: '支付宝',
        admin: '系统操作'
      }[String(method || '').toLowerCase()] || (method || '未知')
    },
    txTypeLabel(type) {
      return {
        payment: '订单支付',
        refund: '订单退款',
        recharge: '余额充值',
        withdraw: '余额提现',
        compensation: '平台赔付',
        admin_add_balance: '系统加款',
        admin_deduct_balance: '系统扣款'
      }[type] || (type || '资产变动')
    },
    txTypeIcon(type) {
      return {
        payment: '支',
        refund: '退',
        recharge: '充',
        withdraw: '提',
        compensation: '赔',
        admin_add_balance: '加',
        admin_deduct_balance: '扣'
      }[type] || '资'
    },
    statusLabel(status) {
      return {
        success: '成功',
        pending: '处理中',
        processing: '处理中',
        failed: '失败',
        cancelled: '已取消'
      }[status] || (status || '-')
    },
    formatTime(value) {
      const date = this.parseDateTime(value)
      if (!date) return this.normalizeText(value)
      return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())} ${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`
    },
    formatShortTime(value) {
      const date = this.parseDateTime(value)
      if (!date) return this.normalizeText(value).slice(0, 16)
      return `${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())} ${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`
    },
    txDesc(tx) {
      const method = this.paymentMethodLabel(tx.payment_method || tx.paymentMethod)
      const time = this.formatShortTime(tx.created_at || tx.createdAt)
      return `${method} · ${time || '时间未知'}`
    },
    calculateSummary(list) {
      let income = 0
      let expense = 0
      ;(list || []).forEach((item) => {
        const amount = this.signedAmount(item)
        if (amount >= 0) income += amount
        if (amount < 0) expense += Math.abs(amount)
      })
      this.incomeAmount = income
      this.expenseAmount = expense
    },
    goBack() {
      uni.navigateBack()
    },
    refresh() {
      this.loadBills(true)
    },
    changeFilter(type) {
      this.filterType = type
      this.loadBills(false)
    },
    changeRangeMode(mode) {
      if (this.rangeMode === mode) return
      this.rangeMode = mode
      if (mode === 'custom') {
        this.customEndDate = this.customEndDate || this.formatDate(new Date())
        this.customStartDate = this.customStartDate || this.shiftDate(this.customEndDate, -6)
      }
      this.loadBills(false)
    },
    onMonthChange(event) {
      const value = this.normalizeText(event && event.detail && event.detail.value)
      if (!value) return
      this.monthValue = value
      this.rangeMode = 'month'
      this.loadBills(false)
    },
    onCustomDateChange(type, event) {
      const value = this.normalizeText(event && event.detail && event.detail.value)
      if (!value) return
      if (type === 'start') {
        this.customStartDate = value
      } else {
        this.customEndDate = value
      }
    },
    applyCustomRange() {
      if (!this.customStartDate || !this.customEndDate) {
        uni.showToast({ title: '请选择时间区间', icon: 'none' })
        return
      }
      const start = this.parseDateTime(this.customStartDate)
      const end = this.parseDateTime(this.customEndDate)
      if (!start || !end || start.getTime() > end.getTime()) {
        uni.showToast({ title: '开始时间不能晚于结束时间', icon: 'none' })
        return
      }
      this.rangeMode = 'custom'
      this.loadBills(false)
    },
    async loadBills(showToast) {
      this.loading = true
      this.errorText = ''

      const { userId, token } = this.getAuth()
      if (!userId) {
        this.transactions = []
        this.calculateSummary([])
        this.errorText = '未找到登录用户，请重新登录后重试'
        this.loading = false
        if (showToast) uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      try {
        const params = {
          userId,
          userType: 'customer',
          user_id: userId,
          user_type: 'customer',
          page: 1,
          limit: 100,
          ...this.buildTimeParams()
        }
        if (this.filterType) params.type = this.filterType

        const res = await request({
          url: this.withQuery('/api/wallet/transactions', params),
          method: 'GET',
          header: this.getAuthHeader(token)
        })

        const items = this.extractTxItems(res)
        const normalizedItems = items.map((item, index) => {
          const keyCandidate = item.transaction_id || item.transactionId || item.id
          const txKey = String(keyCandidate || `tx_${index}`)
          return {
            ...item,
            txKey,
            amountClass: this.amountClass(item)
          }
        })
        this.transactions = normalizedItems
        this.calculateSummary(normalizedItems)
      } catch (error) {
        this.transactions = []
        this.calculateSummary([])
        this.errorText = error.error || '接口返回异常，请稍后再试'
        if (showToast) {
          uni.showToast({ title: '账单加载失败', icon: 'none' })
        }
      } finally {
        this.loading = false
      }
    },
    openDetail(tx) {
      this.detailTx = tx
      this.detailVisible = true
    }
  }
}
