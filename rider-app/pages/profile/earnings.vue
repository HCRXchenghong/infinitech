<template>
  <view class="container">
    <message-popup />

    <view class="date-picker">
      <picker mode="date" fields="month" :value="monthValue" @change="onMonthChange">
        <view class="date-picker-inner">
          <text class="current-date">{{ monthLabel }}</text>
          <text class="picker-arrow">▼</text>
        </view>
      </picker>
    </view>

    <view class="stats-summary">
      <view class="summary-item">
        <text class="summary-label">总收入</text>
        <text class="summary-value primary">¥{{ monthlyTotal }}</text>
      </view>
      <view class="summary-divider"></view>
      <view class="summary-item">
        <text class="summary-label">完成单数</text>
        <text class="summary-value">{{ monthlyOrders }}单</text>
      </view>
    </view>

    <scroll-view class="earnings-scroll" scroll-y>
      <view v-if="loading" class="empty">
        <text>加载中...</text>
      </view>

      <view v-else-if="earningsList.length === 0" class="empty">
        <text>{{ errorText || '暂无收入记录' }}</text>
      </view>

      <view v-else class="earnings-list">
        <view v-for="(item, index) in earningsList" :key="index" class="earning-group">
          <view class="date-header">
            <text class="date-text">{{ item.date }}</text>
            <text class="date-total">¥{{ item.total }}</text>
          </view>
          <view class="earning-items">
            <view v-for="(log, idx) in item.logs" :key="idx" class="earning-item">
              <view class="earning-left">
                <view class="earning-icon" :class="log.type">
                  <text>{{ log.type === 'pending' ? '⏳' : '🚚' }}</text>
                </view>
                <view class="earning-info">
                  <text class="earning-title">{{ log.title }}</text>
                  <text class="earning-time">{{ log.time }}</text>
                  <text class="earning-subtitle">{{ log.subtitle }}</text>
                </view>
              </view>
              <text class="earning-amount">+{{ log.amount }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { fetchEarnings } from '../../shared-ui/api'

export default Vue.extend({
  data() {
    const now = new Date()
    const monthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return {
      monthValue,
      monthlyTotal: '0.00',
      monthlyOrders: 0,
      earningsList: [] as any[],
      loading: false,
      errorText: ''
    }
  },
  computed: {
    monthLabel(): string {
      const match = String(this.monthValue || '').match(/^(\d{4})-(\d{2})$/)
      if (!match) return String(this.monthValue || '')
      return `${match[1]}年${match[2]}月`
    }
  },
  onShow() {
    this.loadEarnings()
  },
  methods: {
    normalizeText(value: any): string {
      return String(value == null ? '' : value).trim()
    },
    toNumber(value: any, fallback = 0): number {
      const num = Number(value)
      return Number.isFinite(num) ? num : fallback
    },
    centsToYuan(value: any): string {
      return (this.toNumber(value, 0) / 100).toFixed(2)
    },
    parseDate(value: any): Date | null {
      const text = this.normalizeText(value)
      if (!text) return null
      const direct = new Date(text)
      if (!Number.isNaN(direct.getTime())) return direct
      const fallback = new Date(text.replace(/-/g, '/'))
      if (!Number.isNaN(fallback.getTime())) return fallback
      return null
    },
    pad(value: number): string {
      return String(value).padStart(2, '0')
    },
    formatTime(value: any): string {
      const date = this.parseDate(value)
      if (!date) return '--:--'
      return `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`
    },
    formatDateKey(date: Date): string {
      return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`
    },
    formatDateHeader(date: Date): string {
      const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `${this.pad(date.getMonth() + 1)}月${this.pad(date.getDate())}日 ${weekMap[date.getDay()]}`
    },
    onMonthChange(event: any) {
      const value = this.normalizeText(event?.detail?.value)
      if (!value) return
      this.monthValue = value
      this.loadEarnings()
    },
    buildEarningsList(items: any[]): any[] {
      const grouped: Record<string, any> = {}
      items.forEach((row: any) => {
        const createdAtRaw = row.createdAt || row.created_at || row.created
        const createdAt = this.parseDate(createdAtRaw)
        if (!createdAt) return

        const dateKey = this.formatDateKey(createdAt)
        if (!grouped[dateKey]) {
          grouped[dateKey] = {
            date: this.formatDateHeader(createdAt),
            totalCents: 0,
            logs: [] as any[],
            sortAt: createdAt.getTime()
          }
        }

        const amountCents = this.toNumber(row.amount, 0)
        const status = this.normalizeText(row.status).toLowerCase()
        const availableAt = row.availableAt || row.available_at
        const subtitle = status === 'pending'
          ? (availableAt ? `冻结中，预计 ${this.formatTime(availableAt)} 入账` : '冻结中，24小时后自动入账')
          : '已入账'

        grouped[dateKey].totalCents += amountCents
        grouped[dateKey].sortAt = Math.max(grouped[dateKey].sortAt, createdAt.getTime())
        grouped[dateKey].logs.push({
          type: status === 'pending' ? 'pending' : 'delivery',
          title: row.title || (row.shopName ? `配送费 - ${row.shopName}` : '订单收入'),
          time: this.formatTime(createdAtRaw),
          subtitle,
          amount: this.centsToYuan(amountCents),
          sortAt: createdAt.getTime()
        })
      })

      return Object.values(grouped)
        .map((item: any) => ({
          date: item.date,
          total: this.centsToYuan(item.totalCents),
          logs: item.logs.sort((a: any, b: any) => b.sortAt - a.sortAt),
          sortAt: item.sortAt
        }))
        .sort((a: any, b: any) => b.sortAt - a.sortAt)
    },
    async loadEarnings() {
      this.loading = true
      this.errorText = ''
      try {
        const res: any = await fetchEarnings({ month: this.monthValue, page: 1, limit: 300 })
        const summary = res?.summary || res?.data?.summary || {}
        const items = Array.isArray(res?.items)
          ? res.items
          : (Array.isArray(res?.data?.items) ? res.data.items : [])

        this.monthlyTotal = this.centsToYuan(summary.totalIncome || summary.total_income || 0)
        this.monthlyOrders = this.toNumber(summary.orderCount || summary.order_count || items.length, 0)
        this.earningsList = this.buildEarningsList(items)
      } catch (err: any) {
        this.monthlyTotal = '0.00'
        this.monthlyOrders = 0
        this.earningsList = []
        this.errorText = err?.error || '收入明细加载失败'
      } finally {
        this.loading = false
      }
    }
  }
})
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f3f4f6;
  padding-top: 88rpx;
}

.date-picker {
  background: white;
  padding: 24rpx 32rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.04);
}

.date-picker-inner {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
}

.current-date {
  font-size: 32rpx;
  font-weight: bold;
  color: #1f2937;
}

.picker-arrow {
  font-size: 20rpx;
  color: #6b7280;
}

.stats-summary {
  background: white;
  margin: 24rpx;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.summary-item {
  flex: 1;
  text-align: center;
}

.summary-label {
  font-size: 26rpx;
  color: #6b7280;
  display: block;
  margin-bottom: 12rpx;
}

.summary-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #1f2937;
  display: block;

  &.primary {
    color: #009bf5;
  }
}

.summary-divider {
  width: 2rpx;
  background: #f3f4f6;
  margin: 0 32rpx;
}

.earnings-scroll {
  height: calc(100vh - 400rpx);
  padding: 0 24rpx;
  box-sizing: border-box;
}

.earnings-list {
  padding-bottom: 120rpx;
}

.earning-group {
  background: white;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.date-header {
  background: #f9fafb;
  padding: 20rpx 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2rpx solid #f3f4f6;
}

.date-text {
  font-size: 26rpx;
  color: #6b7280;
  font-weight: 500;
}

.date-total {
  font-size: 28rpx;
  font-weight: bold;
  color: #009bf5;
}

.earning-items {
  padding: 16rpx 0;
}

.earning-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 32rpx;
}

.earning-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex: 1;
}

.earning-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;

  &.delivery {
    background: #eff6ff;
  }

  &.pending {
    background: #fff7ed;
  }
}

.earning-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.earning-title {
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 500;
}

.earning-time {
  font-size: 22rpx;
  color: #9ca3af;
}

.earning-subtitle {
  font-size: 22rpx;
  color: #6b7280;
}

.earning-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: #009bf5;
}

.empty {
  text-align: center;
  color: #9ca3af;
  padding: 120rpx 0;
  font-size: 28rpx;
}
</style>
