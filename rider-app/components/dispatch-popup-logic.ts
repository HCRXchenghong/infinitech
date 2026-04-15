import Vue from 'vue'
import { extractRiderPreferenceSettings } from '../../packages/client-sdk/src/mobile-capabilities.js'
import riderOrderStore, { grabOrder, loadAvailableOrders, loadRiderData } from '../shared-ui/riderOrderStore'
import { fetchRiderPreferences } from '../shared-ui/api'

const REJECT_POLICY_STORAGE_KEY = 'dispatch_reject_policy_v1'
const MAX_REJECTS_PER_DAY = 5
const AUTO_ACCEPT_SECONDS = 30
const POLL_INTERVAL_MS = 4000
const STATUS_SYNC_INTERVAL_MS = 20000

export default Vue.extend({
  name: 'DispatchPopup',
  data() {
    return {
      showModal: false,
      currentOrder: null as any,
      dispatchQueue: [] as any[],
      handledOrderIds: [] as string[],
      countdown: AUTO_ACCEPT_SECONDS,
      countdownTimer: null as any,
      pollTimer: null as any,
      polling: false,
      isAccepting: false,
      rejectCount: 0,
      rejectDateKey: '',
      lastStatusSyncAt: 0,
      riderPreferences: {
        autoAcceptEnabled: false
      } as any
    }
  },
  computed: {
    isOnline() {
      return riderOrderStore.isOnline
    },
    rejectRemaining(): number {
      return Math.max(0, MAX_REJECTS_PER_DAY - this.rejectCount)
    },
    rejectLimitReached(): boolean {
      return this.rejectRemaining <= 0
    },
    rejectButtonText(): string {
      if (this.rejectLimitReached) return '拒绝次数已用尽'
      return `拒绝（剩余${this.rejectRemaining}次）`
    },
    dispatchSubtitle(): string {
      if (this.riderPreferences?.autoAcceptEnabled) {
        return `${this.countdown} 秒后自动接单`
      }
      return '自动接单已关闭，请手动处理当前订单'
    }
  },
  watch: {
    isOnline(newValue: boolean) {
      if (!newValue) {
        this.resetDispatchState()
        return
      }
      this.resetSessionTracking()
      void this.loadRiderPreferences()
      this.pollDispatchOrders(true)
    }
  },
  mounted() {
    this.restoreRejectPolicy()
    void this.loadRiderPreferences()
    this.pollDispatchOrders(true)
    this.startPolling()
  },
  beforeDestroy() {
    this.stopCountdown()
    this.stopPolling()
  },
  methods: {
    getTodayKey(date = new Date()): string {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },

    ensureRejectPolicyDate() {
      const todayKey = this.getTodayKey()
      if (this.rejectDateKey === todayKey) return
      this.rejectDateKey = todayKey
      this.rejectCount = 0
      this.persistRejectPolicy()
    },

    restoreRejectPolicy() {
      const todayKey = this.getTodayKey()
      const raw = uni.getStorageSync(REJECT_POLICY_STORAGE_KEY)
      let parsed: any = null

      if (raw) {
        if (typeof raw === 'string') {
          try {
            parsed = JSON.parse(raw)
          } catch (err) {
            parsed = null
          }
        } else if (typeof raw === 'object') {
          parsed = raw
        }
      }

      if (parsed && parsed.dateKey === todayKey) {
        this.rejectDateKey = todayKey
        this.rejectCount = Number(parsed.count) || 0
        return
      }

      this.rejectDateKey = todayKey
      this.rejectCount = 0
      this.persistRejectPolicy()
    },

    persistRejectPolicy() {
      uni.setStorageSync(REJECT_POLICY_STORAGE_KEY, {
        dateKey: this.rejectDateKey,
        count: this.rejectCount
      })
    },

    incrementRejectCount() {
      this.ensureRejectPolicyDate()
      this.rejectCount = Math.min(MAX_REJECTS_PER_DAY, this.rejectCount + 1)
      this.persistRejectPolicy()
    },

    resetSessionTracking() {
      this.dispatchQueue = []
      this.handledOrderIds = []
      this.showModal = false
      this.currentOrder = null
      this.stopCountdown()
    },

    resetDispatchState() {
      this.showModal = false
      this.currentOrder = null
      this.dispatchQueue = []
      this.stopCountdown()
    },

    normalizeOrderId(value: any): string {
      return String(value || '').trim()
    },

    markHandled(orderId: string) {
      if (!orderId || this.handledOrderIds.includes(orderId)) return
      this.handledOrderIds.push(orderId)
    },

    startPolling() {
      this.stopPolling()
      this.pollTimer = setInterval(() => {
        this.pollDispatchOrders(false)
      }, POLL_INTERVAL_MS)
    },

    stopPolling() {
      if (!this.pollTimer) return
      clearInterval(this.pollTimer)
      this.pollTimer = null
    },

    startCountdown() {
      this.stopCountdown()
      this.countdown = AUTO_ACCEPT_SECONDS
      if (!this.riderPreferences?.autoAcceptEnabled) {
        return
      }
      this.countdownTimer = setInterval(() => {
        if (!this.showModal || !this.currentOrder) {
          this.stopCountdown()
          return
        }

        this.countdown -= 1
        if (this.countdown > 0) return

        this.stopCountdown()
        this.handleAccept('auto')
      }, 1000)
    },

    stopCountdown() {
      if (!this.countdownTimer) return
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    },

    enqueueAvailableOrders(orders: any[]) {
      const queuedIds = new Set(this.dispatchQueue.map((item: any) => this.normalizeOrderId(item.id)))
      const handledIds = new Set(this.handledOrderIds)
      const currentId = this.currentOrder ? this.normalizeOrderId(this.currentOrder.id) : ''

      orders.forEach((order: any) => {
        const orderId = this.normalizeOrderId(order.id)
        if (!orderId) return
        if (orderId === currentId) return
        if (queuedIds.has(orderId)) return
        if (handledIds.has(orderId)) return
        this.dispatchQueue.push(order)
        queuedIds.add(orderId)
      })
    },

    syncQueueWithAvailable(orders: any[]) {
      const availableIdSet = new Set(orders.map((item: any) => this.normalizeOrderId(item.id)))

      this.dispatchQueue = this.dispatchQueue.filter((item: any) => {
        const orderId = this.normalizeOrderId(item.id)
        return orderId && availableIdSet.has(orderId)
      })

      if (this.currentOrder) {
        const currentId = this.normalizeOrderId(this.currentOrder.id)
        if (currentId && !availableIdSet.has(currentId)) {
          this.markHandled(currentId)
          this.consumeCurrentOrder(false)
        }
      }

      this.enqueueAvailableOrders(orders)

      if (!this.showModal) {
        this.showNextOrder()
      }
    },

    showNextOrder() {
      const nextOrder = this.dispatchQueue.shift()
      if (!nextOrder) {
        this.showModal = false
        this.currentOrder = null
        this.stopCountdown()
        return
      }
      this.currentOrder = nextOrder
      this.showModal = true
      this.startCountdown()
    },

    consumeCurrentOrder(showNext = true) {
      this.showModal = false
      this.currentOrder = null
      this.stopCountdown()
      if (showNext) {
        this.$nextTick(() => {
          this.showNextOrder()
        })
      }
    },

    async pollDispatchOrders(forceStatusSync: boolean) {
      if (this.polling) return
      this.polling = true

      try {
        this.ensureRejectPolicyDate()

        const now = Date.now()
        const needSyncStatus = forceStatusSync || now - this.lastStatusSyncAt >= STATUS_SYNC_INTERVAL_MS
        if (needSyncStatus) {
          await Promise.all([loadRiderData(), this.loadRiderPreferences()])
          this.lastStatusSyncAt = now
        }

        if (!this.isOnline) {
          this.resetDispatchState()
          return
        }

        await loadAvailableOrders()
        this.syncQueueWithAvailable(riderOrderStore.newOrders || [])
      } catch (err) {
        console.error('[DispatchPopup] 同步派单失败:', err)
      } finally {
        this.polling = false
      }
    },

    isOrderUnavailableError(err: any): boolean {
      const statusCode = Number(err && err.statusCode)
      if (statusCode === 404 || statusCode === 409) return true
      const rawMessage = String(
        (err && (err.error || err.message || err.data?.error || err.data?.message)) || ''
      )
      return /已接|已被抢|不存在|状态异常|不可接单|冲突/.test(rawMessage)
    },

    async handleAccept(trigger: 'manual' | 'auto') {
      if (!this.currentOrder || this.isAccepting) return

      const activeOrder = this.currentOrder
      const orderId = this.normalizeOrderId(activeOrder.id)
      if (!orderId) return

      this.isAccepting = true
      this.stopCountdown()

      try {
        await grabOrder(orderId)
        this.markHandled(orderId)
        uni.showToast({ title: '接单成功', icon: 'success' })
        this.consumeCurrentOrder(true)
      } catch (err) {
        if (this.isOrderUnavailableError(err)) {
          this.markHandled(orderId)
          uni.showToast({ title: '订单已被其他骑手接单', icon: 'none' })
          this.consumeCurrentOrder(true)
          return
        }

        console.error('[DispatchPopup] 接单失败:', err)
        uni.showToast({
          title: trigger === 'auto' ? '自动接单失败，请手动重试' : '接单失败，请重试',
          icon: 'none'
        })

        if (this.currentOrder && this.normalizeOrderId(this.currentOrder.id) === orderId) {
          this.startCountdown()
        }
      } finally {
        this.isAccepting = false
      }
    },

    handleReject() {
      if (!this.currentOrder || this.isAccepting) return
      this.ensureRejectPolicyDate()

      if (this.rejectLimitReached) {
        uni.showToast({ title: '今日无责拒绝已达上限，将自动接单', icon: 'none' })
        return
      }

      const orderId = this.normalizeOrderId(this.currentOrder.id)
      this.markHandled(orderId)
      this.incrementRejectCount()
      uni.showToast({ title: '已拒绝本单', icon: 'none' })
      this.consumeCurrentOrder(true)
    },

    getDispatchDistanceText(order: any) {
      if (!order) return '--'
      if (order.totalDistanceText) return order.totalDistanceText
      if (order.totalDistance || order.totalDistance === 0) return `${order.totalDistance}km`
      return '--'
    },

    async loadRiderPreferences() {
      try {
        const response: any = await fetchRiderPreferences()
        const payload = extractRiderPreferenceSettings(response)
        this.riderPreferences = {
          autoAcceptEnabled: payload.autoAcceptEnabled
        }
      } catch (_error) {
        this.riderPreferences = {
          autoAcceptEnabled: false
        }
      }
    }
  }
})
