<template>
  <view class="page points-mall-page">
    <view class="header">
      <view class="back-btn" @tap="goBack">
        <text>‹</text>
      </view>
      <text class="title">积分商城</text>
      <view class="placeholder"></view>
    </view>

    <scroll-view scroll-y class="content">
      <view class="summary-card">
        <view class="summary-left">
          <text class="summary-label">可用积分</text>
          <text class="summary-value">{{ points }}</text>
        </view>
        <view class="summary-right">
          <view class="summary-rule">消费 1 元 = 1 积分</view>
          <view class="summary-rule">积分有效期 3 个月，过期清零</view>
          <view class="summary-rule">退款订单积分将自动扣回</view>
        </view>
      </view>

      <view class="section-title">推荐兑换</view>
      <view class="goods-list">
        <view v-for="(item, idx) in goods" :key="idx" class="goods-card">
          <view class="goods-icon" :class="item.colorClass">
            <text class="goods-emoji">{{ item.emoji }}</text>
          </view>
          <view class="goods-info">
            <view class="goods-title-row">
              <text class="goods-title">{{ item.name }}</text>
              <view v-if="item.tag" class="goods-tag">{{ item.tag }}</view>
            </view>
            <text class="goods-desc">{{ item.desc }}</text>
            <view class="goods-meta">
              <text class="goods-points">{{ item.points }} 积分</text>
              <text v-if="item.shipFee > 0" class="goods-ship">运费 ¥{{ item.shipFee }}</text>
              <text v-else class="goods-ship">免运费</text>
            </view>
          </view>
          <button
            class="exchange-btn"
            :class="{ disabled: points < item.points }"
            :disabled="points < item.points"
            @tap="exchange(item)"
          >
            {{ points < item.points ? '积分不足' : '立即兑换' }}
          </button>
        </view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchPointsBalance, fetchPointsGoods, redeemPoints } from '@/shared-ui/api.js'

export default {
  data() {
    return {
      points: 0,
      goods: []
    }
  },
  onLoad() {
    const stored = uni.getStorageSync('pointsBalance')
    if (typeof stored === 'number') this.points = stored
    this.loadPoints()
    this.loadGoods()
  },
  onShow() {
    this.loadPoints()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    loadPoints() {
      const profile = uni.getStorageSync('userProfile') || {}
      const userId = profile.id || profile.userId || profile.phone || ''
      if (!userId) return
      fetchPointsBalance(userId)
        .then((res) => {
          if (res && typeof res.balance === 'number') {
            this.points = res.balance
            uni.setStorageSync('pointsBalance', res.balance)
          }
        })
        .catch(() => {})
    },
    loadGoods() {
      fetchPointsGoods()
        .then((list) => {
          if (Array.isArray(list)) {
            this.goods = list.map((item) => ({
              id: item.id,
              name: item.name,
              points: item.points,
              shipFee: Number(item.ship_fee || item.shipFee || 0),
              emoji: item.type === 'vip' ? '👑' : '🎁',
              colorClass: item.type === 'vip' ? 'gold-bg' : 'blue-bg',
              tag: item.tag || (item.type === 'vip' ? 'VIP' : '实物'),
              desc: item.desc || ''
            }))
          }
        })
        .catch(() => {})
    },
    exchange(item) {
      if (this.points < item.points) {
        uni.showToast({ title: '积分不足', icon: 'none' })
        return
      }
      uni.showModal({
        title: '确认兑换',
        content: `确认使用 ${item.points} 积分兑换「${item.name}」吗？`,
        confirmText: '立即兑换',
        cancelText: '取消',
        success: (res) => {
          if (!res.confirm) return
          const profile = uni.getStorageSync('userProfile') || {}
          const payload = {
            userId: profile.id || profile.userId || profile.phone || '',
            phone: profile.phone || '',
            goodId: item.id
          }
          uni.showLoading({ title: '兑换中...' })
          redeemPoints(payload)
            .then((resp) => {
              uni.hideLoading()
              if (resp && resp.success) {
                const balance = typeof resp.balance === 'number' ? resp.balance : this.points
                this.points = balance
                uni.setStorageSync('pointsBalance', balance)
                uni.showToast({ title: '兑换成功', icon: 'success' })
              } else {
                uni.showToast({ title: (resp && resp.error) || '兑换失败', icon: 'none' })
              }
            })
            .catch((err) => {
              uni.hideLoading()
              uni.showToast({ title: (err && err.error) || '兑换失败', icon: 'none' })
            })
        }
      })
    }
  }
}
</script>

<style scoped lang="scss">
.points-mall-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
  background: #fff;
  border-bottom: 1px solid #f1f2f4;
  box-sizing: border-box;
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #111827;
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.placeholder {
  width: 36px;
}

.content {
  padding: 20px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 76px);
  box-sizing: border-box;
  min-height: 100vh;
}

.summary-card {
  background: #111827;
  color: #fff;
  padding: 18px;
  border-radius: 16px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.summary-label {
  font-size: 12px;
  opacity: 0.8;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  margin-top: 6px;
}

.summary-right {
  font-size: 11px;
  line-height: 1.6;
  opacity: 0.85;
  text-align: right;
}

.section-title {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 12px;
  font-weight: 600;
}

.goods-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goods-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
}

.goods-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.goods-emoji {
  font-size: 26px;
}

.goods-info {
  flex: 1;
  min-width: 0;
}

.goods-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.goods-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.goods-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #fef3c7;
  color: #b45309;
}

.goods-desc {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.goods-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: #9ca3af;
  margin-top: 6px;
}

.goods-points {
  font-weight: 600;
  color: #111827;
}

.exchange-btn {
  background: #111827;
  color: #fff;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 10px;
}

.exchange-btn.disabled {
  background: #e5e7eb;
  color: #9ca3af;
}

.red-bg { background: #fee2e2; }
.blue-bg { background: #dbeafe; }
.purple-bg { background: #f3e8ff; }
.green-bg { background: #dcfce7; }
.gold-bg { background: #fef3c7; }
.black-bg { background: #e5e7eb; }

.bottom-space {
  height: 20px;
}
</style>
