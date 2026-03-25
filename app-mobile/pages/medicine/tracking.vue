<template>
  <view class="page med-tracking">
    <view class="top">
      <view class="back" @tap="back">‹</view>
      <view class="track-card">
        <view class="row">
          <view class="moped">🛵</view>
          <view class="texts">
            <text class="title">{{ trackingState.title }}</text>
            <text class="sub">{{ trackingState.subtitle }}</text>
          </view>
        </view>
        <view class="bar">
          <view class="bar-inner" :style="{ width: trackingState.progress + '%' }" />
        </view>
      </view>
    </view>

    <view class="spacer" />

    <view class="bottom">
      <view class="rider-row">
        <view>
          <text class="mini-label">配送骑手</text>
          <view class="rider-name">
            <text>{{ riderDisplayName }}</text>
            <text v-if="order.status === 'delivering'" class="badge">配送中</text>
          </view>
        </view>
        <view class="call-btn" @tap="callRider">📞</view>
      </view>

      <view class="list-card">
        <view class="list-head">
          <text class="list-title">药品清单</text>
          <text class="list-count">共 {{ itemCount }} 件</text>
        </view>
        <text class="list-text">{{ order.item || '未获取到订单内容' }}</text>
      </view>

      <view class="list-card">
        <view class="list-head">
          <text class="list-title">送药地址</text>
        </view>
        <text class="list-text">{{ order.dropoff || '未填写地址' }}</text>
      </view>

      <view class="price-card">
        <view class="price-row">
          <text>药品预估</text>
          <text>¥{{ amountText }}</text>
        </view>
        <view class="price-row">
          <text>跑腿费</text>
          <text>¥{{ deliveryFeeText }}</text>
        </view>
        <view class="price-row total">
          <text>订单合计</text>
          <text>¥{{ totalPriceText }}</text>
        </view>
      </view>

      <view v-if="order.status === 'completed'" class="confirm" @tap="finish">返回首页</view>
      <text v-else class="hint">真实订单跟踪已接入后端，状态会随骑手履约实时更新。</text>
    </view>
  </view>
</template>

<script>
import { fetchOrderDetail } from '@/shared-ui/api.js'
import { mapErrandOrderDetail } from '@/shared-ui/errand.js'

export default {
  data() {
    return {
      order: {
        id: '',
        item: '',
        dropoff: '',
        amount: 0,
        deliveryFee: 0,
        totalPrice: 0,
        status: 'pending',
        statusText: '待接单',
        riderName: '',
        riderPhone: ''
      }
    }
  },
  computed: {
    trackingState() {
      const stateMap = {
        pending: {
          title: '正在指派最近骑手...',
          subtitle: '系统正在为您匹配附近药房与骑手',
          progress: 20
        },
        accepted: {
          title: '骑手已接单，正在前往药房',
          subtitle: '请保持电话畅通，方便骑手与您联系',
          progress: 45
        },
        delivering: {
          title: '骑手正火速送往您的位置',
          subtitle: '药品已购齐，正在配送途中',
          progress: 80
        },
        completed: {
          title: '药品已送达，请查收',
          subtitle: '订单已完成，如有问题请联系客服',
          progress: 100
        },
        cancelled: {
          title: '订单已取消',
          subtitle: '如有疑问，请联系客服处理',
          progress: 0
        }
      }
      return stateMap[this.order.status] || {
        title: this.order.statusText || '订单处理中',
        subtitle: '请稍候查看最新状态',
        progress: 30
      }
    },
    itemCount() {
      const text = (this.order.item || '').trim()
      if (!text) return 0
      return text.split(/[,，\n ]+/).filter(Boolean).length
    },
    riderDisplayName() {
      return this.order.riderName || '待系统分配'
    },
    amountText() {
      return (Number(this.order.amount) || 0).toFixed(2)
    },
    deliveryFeeText() {
      return (Number(this.order.deliveryFee) || 0).toFixed(2)
    },
    totalPriceText() {
      return (Number(this.order.totalPrice) || 0).toFixed(2)
    }
  },
  onLoad(query) {
    const id = query && query.id ? decodeURIComponent(query.id) : ''
    if (!id) {
      uni.showToast({ title: '缺少订单ID', icon: 'none' })
      return
    }
    this.loadOrder(id)
  },
  methods: {
    async loadOrder(id) {
      uni.showLoading({ title: '加载中...' })
      try {
        const data = await fetchOrderDetail(id)
        this.order = mapErrandOrderDetail(data || {})
      } catch (error) {
        const message = (error && error.data && error.data.error) || error.error || '订单加载失败'
        uni.showToast({ title: message, icon: 'none' })
        this.order.id = id
      } finally {
        uni.hideLoading()
      }
    },
    back() {
      uni.navigateBack()
    },
    finish() {
      uni.switchTab({ url: '/pages/index/index' })
    },
    callRider() {
      if (!this.order.riderPhone) {
        uni.showToast({ title: '骑手暂未接单', icon: 'none' })
        return
      }
      uni.makePhoneCall({
        phoneNumber: this.order.riderPhone
      }).catch(() => {
        uni.showToast({ title: '无法拨打电话，请检查权限', icon: 'none' })
      })
    }
  }
}
</script>

<style scoped lang="scss">
.med-tracking {
  min-height: 100vh;
  background: #ecfeff;
}

.top {
  padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: 10px;
}

.back {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.track-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(153, 246, 228, 0.6);
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 10px 25px rgba(20, 184, 166, 0.12);
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.moped {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: #ccfbf1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.texts {
  flex: 1;
}

.title {
  display: block;
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
}

.sub {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #64748b;
}

.bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.bar-inner {
  height: 100%;
  background: #14b8a6;
  border-radius: 999px;
  transition: width 0.8s ease;
}

.spacer {
  height: 240px;
}

.bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-top-left-radius: 22px;
  border-top-right-radius: 22px;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  box-shadow: 0 -10px 25px rgba(15, 23, 42, 0.06);
}

.rider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.mini-label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.rider-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
}

.badge {
  font-size: 10px;
  color: #0d9488;
  background: rgba(20, 184, 166, 0.12);
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 900;
}

.call-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(20, 184, 166, 0.12);
  color: #0d9488;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-card,
.price-card {
  margin-top: 12px;
  border-radius: 16px;
  background: #f8fafc;
  padding: 12px;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.list-title {
  font-size: 13px;
  font-weight: 900;
  color: #0f172a;
}

.list-count {
  font-size: 11px;
  color: #94a3b8;
}

.list-text {
  font-size: 13px;
  color: #334155;
  line-height: 1.6;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #334155;
  margin-bottom: 8px;
}

.price-row.total {
  margin-bottom: 0;
  font-weight: 900;
  color: #0f172a;
}

.confirm {
  margin-top: 14px;
  height: 46px;
  border-radius: 999px;
  background: #14b8a6;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 900;
}

.hint {
  display: block;
  margin-top: 14px;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}
</style>
