<template>
  <view class="page coupon-page">
    <view class="page-header">
      <text class="page-title">选择优惠券</text>
    </view>

    <scroll-view scroll-y class="coupon-list">
      <view v-if="coupons.length === 0" class="empty-state">
        <text class="empty-text">暂无可用优惠券</text>
      </view>

      <view
        v-for="coupon in coupons"
        :key="coupon.id"
        class="coupon-card"
        :class="{ selected: selectedCoupon && selectedCoupon.id === coupon.id, disabled: !canUseCoupon(coupon) }"
        @tap="selectCoupon(coupon)"
      >
        <view class="coupon-left">
          <view class="coupon-amount-area">
            <text class="coupon-symbol">¥</text>
            <text class="coupon-amount">{{ formatAmount(coupon.coupon) }}</text>
          </view>
          <text class="coupon-condition">{{ getConditionText(coupon.coupon) }}</text>
        </view>

        <view class="coupon-right">
          <text class="coupon-name">{{ coupon.coupon.name }}</text>
          <text class="coupon-desc">{{ coupon.coupon.description }}</text>
          <text class="coupon-time">{{ formatTime(coupon.coupon) }}</text>
        </view>

        <view v-if="selectedCoupon && selectedCoupon.id === coupon.id" class="check-icon">✓</view>
      </view>

      <view class="not-use-option" @tap="selectNoCoupon">
        <text class="option-text">不使用优惠券</text>
        <view v-if="!selectedCoupon" class="check-icon">✓</view>
      </view>
    </scroll-view>

    <view class="bottom-bar">
      <button class="confirm-btn" @tap="confirmSelection">确认</button>
    </view>
  </view>
</template>

<script>
import { request } from '@/shared-ui/api.js'

export default {
  data() {
    return {
      shopId: '',
      orderAmount: 0,
      coupons: [],
      selectedCoupon: null,
      loading: true
    }
  },
  onLoad(query) {
    this.shopId = String(query.shopId || '').trim()
    this.orderAmount = Number(query.amount)
    this.loadCoupons()
  },
  methods: {
    async loadCoupons() {
      try {
        const profile = uni.getStorageSync('userProfile') || {}
        const userId = profile.phone || profile.id || profile.userId
        if (!userId) {
          uni.showToast({ title: '请先登录', icon: 'none' })
          setTimeout(() => uni.navigateBack(), 1500)
          return
        }

        uni.showLoading({ title: '加载中...' })

        const res = await request({
          url: '/api/coupons/available',
          method: 'GET',
          data: {
            userId: String(userId),
            shopId: this.shopId,
            orderAmount: this.orderAmount
          }
        })

        uni.hideLoading()

        if (res && Array.isArray(res.data)) {
          this.coupons = res.data
        }
      } catch (err) {
        uni.hideLoading()
        console.error('加载优惠券失败:', err)
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },

    canUseCoupon(userCoupon) {
      const coupon = userCoupon.coupon
      if (!coupon) return false
      return this.orderAmount >= coupon.minAmount
    },

    selectCoupon(coupon) {
      if (!this.canUseCoupon(coupon)) {
        uni.showToast({
          title: `需满${coupon.coupon.minAmount}元可用`,
          icon: 'none'
        })
        return
      }
      this.selectedCoupon = coupon
    },

    selectNoCoupon() {
      this.selectedCoupon = null
    },

    confirmSelection() {
      // 将选中的优惠券信息传回订单确认页
      const pages = getCurrentPages()
      const prevPage = pages[pages.length - 2]
      if (prevPage) {
        prevPage.$vm.selectedCoupon = this.selectedCoupon ? this.selectedCoupon.coupon : null
        prevPage.$vm.selectedUserCouponId = this.selectedCoupon ? this.selectedCoupon.id : null
      }
      uni.navigateBack()
    },

    formatAmount(coupon) {
      if (coupon.type === 'fixed') {
        return coupon.amount.toFixed(0)
      } else {
        return `${(100 - coupon.amount).toFixed(0)}折`
      }
    },

    getConditionText(coupon) {
      if (coupon.minAmount > 0) {
        return `满${coupon.minAmount}元可用`
      }
      return '无门槛'
    },

    formatTime(coupon) {
      const start = new Date(coupon.validFrom)
      const end = new Date(coupon.validUntil)
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    }
  }
}
</script>

<style scoped lang="scss">
.coupon-page {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.page-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding-top: calc(var(--status-bar-height, 0px) + 16px);
  padding-bottom: 16px;
  padding-left: 16px;
  padding-right: 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f1f1f;
}

.coupon-list {
  flex: 1;
  margin-top: calc(var(--status-bar-height, 0px) + 60px);
  margin-bottom: 80px;
  padding: 12px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
}

.empty-text {
  font-size: 14px;
  color: #9ca3af;
}

.coupon-card {
  position: relative;
  display: flex;
  background: linear-gradient(135deg, #fff 0%, #fef9f5 100%);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.coupon-card.selected {
  border-color: #0095ff;
  box-shadow: 0 4px 12px rgba(0, 149, 255, 0.2);
}

.coupon-card.disabled {
  opacity: 0.5;
}

.coupon-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-right: 16px;
  border-right: 1px dashed #e5e7eb;
  min-width: 100px;
}

.coupon-amount-area {
  display: flex;
  align-items: baseline;
}

.coupon-symbol {
  font-size: 16px;
  font-weight: 700;
  color: #ef4444;
}

.coupon-amount {
  font-size: 32px;
  font-weight: 700;
  color: #ef4444;
  line-height: 1;
}

.coupon-condition {
  font-size: 12px;
  color: #6b7280;
  margin-top: 8px;
}

.coupon-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-left: 16px;
  justify-content: center;
}

.coupon-name {
  font-size: 15px;
  font-weight: 700;
  color: #1f1f1f;
  margin-bottom: 4px;
}

.coupon-desc {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}

.coupon-time {
  font-size: 11px;
  color: #9ca3af;
}

.check-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  background: #0095ff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

.not-use-option {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 12px;
  border: 2px solid #e5e7eb;
}

.option-text {
  font-size: 15px;
  color: #6b7280;
  font-weight: 600;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.confirm-btn {
  width: 100%;
  height: 48px;
  background: #0095ff;
  color: #fff;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 700;
  border: none;

  &::after {
    border: none;
  }
}
</style>
