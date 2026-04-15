<template>
  <view class="page coupon-list">
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value || 'all'"
        class="tab-item"
        :class="{ active: status === tab.value }"
        @tap="changeStatus(tab.value)"
      >
        {{ tab.label }}
      </view>
    </view>

    <view v-if="loading" class="state-text">加载中...</view>
    <view v-else-if="coupons.length === 0" class="state-text">暂无优惠券</view>

    <view
      v-else
      v-for="c in coupons"
      :key="c.id"
      class="card"
      :class="`status-${c.status}`"
    >
      <view class="left">
        <text class="amount">{{ c.amountText }}</text>
        <text class="cond">{{ c.condition }}</text>
      </view>
      <view class="right">
        <view class="top-row">
          <text class="name">{{ c.name }}</text>
          <text class="status-tag" :class="`tag-${c.status}`">{{ c.statusText }}</text>
        </view>
        <text class="time">有效期：{{ c.validity }}</text>
        <text class="time">领取时间：{{ c.receivedAtText }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchUserCoupons } from '@/shared-ui/api'
import { extractEnvelopeData } from '../../../../packages/contracts/src/http.js'

export default {
  data() {
    return {
      loading: false,
      status: '',
      userId: '',
      coupons: [],
      tabs: [
        { label: '全部', value: '' },
        { label: '未使用', value: 'unused' },
        { label: '已使用', value: 'used' },
        { label: '已过期', value: 'expired' }
      ]
    }
  },
  onShow() {
    this.initUserAndLoad()
  },
  methods: {
    changeStatus(status) {
      if (this.status === status) return
      this.status = status
      this.loadCoupons()
    },
    initUserAndLoad() {
      const profile = uni.getStorageSync('userProfile') || {}
      const candidates = [
        profile.phone,
        profile.userId,
        profile.id,
        uni.getStorageSync('phone'),
        uni.getStorageSync('userId')
      ]

      this.userId = ''
      for (const item of candidates) {
        const value = String(item || '').trim()
        if (value) {
          this.userId = value
          break
        }
      }

      this.loadCoupons()
    },
    async loadCoupons() {
      if (!this.userId) {
        this.coupons = []
        return
      }

      this.loading = true
      try {
        const params = { userId: this.userId }
        if (this.status) {
          params.status = this.status
        }
        const res = await fetchUserCoupons(params)

        const payload = extractEnvelopeData(res)
        const list = Array.isArray(payload) ? payload : []
        this.coupons = list.map(this.normalizeCoupon)
      } catch (error) {
        this.coupons = []
        const errorMessage =
          (error && error.error) ||
          (error && error.data && error.data.error) ||
          '加载优惠券失败'
        uni.showToast({
          title: errorMessage,
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    normalizeCoupon(item) {
      const row = item || {}
      const coupon = row.coupon || {}
      const status = String(row.status || 'unused')
      return {
        id: row.id || `${row.couponId || ''}_${row.receivedAt || Date.now()}`,
        status,
        statusText: this.getStatusText(status),
        name: coupon.name || '优惠券',
        amountText: this.getAmountText(coupon),
        condition: this.getConditionText(coupon),
        validity: this.getValidityText(coupon.validFrom, coupon.validUntil),
        receivedAtText: this.formatDate(row.receivedAt)
      }
    },
    getStatusText(status) {
      if (status === 'used') return '已使用'
      if (status === 'expired') return '已过期'
      return '未使用'
    },
    getAmountText(coupon) {
      const row = coupon || {}
      const type = String(row.type || '').toLowerCase()
      const amount = Number(row.amount || 0)

      if (type === 'percent') {
        const discount = Math.max(0, 100 - amount)
        return `${discount.toFixed(0)}折`
      }

      return `¥${this.formatMoney(amount)}`
    },
    getConditionText(coupon) {
      const row = coupon || {}
      const minAmount = Number(row.minAmount || 0)
      const noThreshold = String(row.conditionType || '') === 'no_threshold' || minAmount <= 0
      if (noThreshold) {
        return '无门槛可用'
      }
      return `满¥${this.formatMoney(minAmount)}可用`
    },
    getValidityText(start, end) {
      const startText = this.formatDate(start)
      const endText = this.formatDate(end)
      if (!startText && !endText) return '-'
      return `${startText || '-'} 至 ${endText || '-'}`
    },
    formatMoney(value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num)) return '0.00'
      return num.toFixed(2).replace(/\.00$/, '')
    },
    formatDate(raw) {
      if (!raw) return ''
      const date = new Date(raw)
      if (Number.isNaN(date.getTime())) return String(raw)
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
}
</script>

<style scoped lang="scss">
.coupon-list {
  min-height: 100vh;
  background: #f4f6fb;
  padding: 12px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  border-radius: 999px;
  font-size: 12px;
  color: #475569;
  background: #e2e8f0;
}

.tab-item.active {
  color: #fff;
  background: #2563eb;
}

.state-text {
  margin-top: 56px;
  text-align: center;
  color: #64748b;
  font-size: 13px;
}

.card {
  background: linear-gradient(100deg, #fee2e2, #fffbeb);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  display: flex;
  align-items: stretch;
}

.card.status-used,
.card.status-expired {
  background: linear-gradient(100deg, #e2e8f0, #f8fafc);
}

.left {
  width: 104px;
  border-right: 1px dashed rgba(148, 163, 184, 0.7);
  padding-right: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.amount {
  font-size: 24px;
  font-weight: 700;
  color: #ef4444;
}

.card.status-used .amount,
.card.status-expired .amount {
  color: #64748b;
}

.cond {
  margin-top: 4px;
  font-size: 11px;
  color: #b91c1c;
}

.card.status-used .cond,
.card.status-expired .cond {
  color: #64748b;
}

.right {
  flex: 1;
  padding-left: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.status-tag {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
}

.tag-unused {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

.tag-used {
  background: rgba(100, 116, 139, 0.16);
  color: #475569;
}

.tag-expired {
  background: rgba(148, 163, 184, 0.2);
  color: #64748b;
}

.time {
  font-size: 11px;
  color: #64748b;
}
</style>
