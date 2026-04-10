<template>
  <view class="page med-tracking">
    <view class="top">
      <view class="back" @tap="back">‹</view>
      <view class="track-card">
        <view class="row">
          <view class="moped">DEL</view>
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
          <text class="mini-label">{{ texts.riderLabel }}</text>
          <view class="rider-name">
            <text>{{ riderDisplayName }}</text>
            <text v-if="order.status === 'delivering'" class="badge">{{ texts.deliveringBadge }}</text>
          </view>
        </view>
        <view class="call-btn" @tap="callRider">TEL</view>
      </view>

      <view class="list-card">
        <view class="list-head">
          <text class="list-title">{{ texts.itemListTitle }}</text>
          <text class="list-count">{{ itemCountLabel }}</text>
        </view>
        <text class="list-text">{{ order.item || texts.emptyItem }}</text>
      </view>

      <view class="list-card">
        <view class="list-head">
          <text class="list-title">{{ texts.addressTitle }}</text>
        </view>
        <text class="list-text">{{ order.dropoff || texts.emptyAddress }}</text>
      </view>

      <view class="price-card">
        <view class="price-row">
          <text>{{ texts.amountLabel }}</text>
          <text>¥{{ amountText }}</text>
        </view>
        <view class="price-row">
          <text>{{ texts.deliveryFeeLabel }}</text>
          <text>¥{{ deliveryFeeText }}</text>
        </view>
        <view class="price-row total">
          <text>{{ texts.totalLabel }}</text>
          <text>¥{{ totalPriceText }}</text>
        </view>
      </view>

      <view v-if="order.status === 'completed'" class="confirm" @tap="finish">{{ texts.backHome }}</view>
      <text v-else class="hint">{{ texts.trackingHint }}</text>
    </view>
  </view>
</template>

<script>
import { fetchOrderDetail, recordPhoneContactClick } from '@/shared-ui/api.js'
import { mapErrandOrderDetail } from '@/shared-ui/errand.js'
import { createPhoneContactHelper } from '../../../shared/mobile-common/phone-contact.js'

const phoneContactHelper = createPhoneContactHelper({ recordPhoneContactClick })

const TEXTS = {
  riderLabel: '\u914d\u9001\u9a91\u624b',
  deliveringBadge: '\u914d\u9001\u4e2d',
  itemListTitle: '\u836f\u54c1\u6e05\u5355',
  emptyItem: '\u672a\u83b7\u53d6\u5230\u8ba2\u5355\u5185\u5bb9',
  addressTitle: '\u9001\u836f\u5730\u5740',
  emptyAddress: '\u672a\u586b\u5199\u5730\u5740',
  amountLabel: '\u836f\u54c1\u9884\u8ba1',
  deliveryFeeLabel: '\u8dd1\u817f\u8d39',
  totalLabel: '\u8ba2\u5355\u5408\u8ba1',
  backHome: '\u8fd4\u56de\u9996\u9875',
  trackingHint:
    '\u771f\u5b9e\u8ba2\u5355\u8f68\u8ff9\u5df2\u63a5\u5165\u540e\u7aef\uff0c\u72b6\u6001\u4f1a\u968f\u9a91\u624b\u5c65\u7ea6\u5b9e\u65f6\u66f4\u65b0\u3002',
  pendingStatus: '\u5f85\u63a5\u5355',
  missingOrderId: '\u7f3a\u5c11\u8ba2\u5355ID',
  loading: '\u52a0\u8f7d\u4e2d...',
  loadFailed: '\u8ba2\u5355\u52a0\u8f7d\u5931\u8d25',
  riderUnavailable: '\u9a91\u624b\u6682\u672a\u63a5\u5355',
  callFailed: '\u65e0\u6cd5\u62e8\u6253\u7535\u8bdd\uff0c\u8bf7\u68c0\u67e5\u6743\u9650',
  riderUnassigned: '\u5f85\u7cfb\u7edf\u5206\u914d',
  progressStates: {
    pending: {
      title: '\u6b63\u5728\u6307\u6d3e\u6700\u8fd1\u9a91\u624b',
      subtitle: '\u7cfb\u7edf\u6b63\u5728\u4e3a\u60a8\u5339\u914d\u9644\u8fd1\u836f\u623f\u4e0e\u9a91\u624b',
      progress: 20
    },
    accepted: {
      title: '\u9a91\u624b\u5df2\u63a5\u5355\uff0c\u6b63\u5728\u524d\u5f80\u836f\u623f',
      subtitle: '\u8bf7\u4fdd\u6301\u7535\u8bdd\u7545\u901a\uff0c\u65b9\u4fbf\u9a91\u624b\u4e0e\u60a8\u8054\u7cfb',
      progress: 45
    },
    delivering: {
      title: '\u9a91\u624b\u6b63\u5728\u914d\u9001\u9014\u4e2d',
      subtitle: '\u836f\u54c1\u5df2\u5907\u9f50\uff0c\u6b63\u5728\u9001\u5f80\u60a8\u7684\u4f4d\u7f6e',
      progress: 80
    },
    completed: {
      title: '\u836f\u54c1\u5df2\u9001\u8fbe\uff0c\u8bf7\u53ca\u65f6\u67e5\u6536',
      subtitle: '\u8ba2\u5355\u5df2\u5b8c\u6210\uff0c\u5982\u6709\u95ee\u9898\u8bf7\u8054\u7cfb\u5e73\u53f0\u5ba2\u670d',
      progress: 100
    },
    cancelled: {
      title: '\u8ba2\u5355\u5df2\u53d6\u6d88',
      subtitle: '\u5982\u6709\u7591\u95ee\uff0c\u8bf7\u8054\u7cfb\u5e73\u53f0\u5ba2\u670d\u5904\u7406',
      progress: 0
    },
    fallback: {
      title: '\u8ba2\u5355\u5904\u7406\u4e2d',
      subtitle: '\u8bf7\u7a0d\u540e\u67e5\u770b\u6700\u65b0\u72b6\u6001',
      progress: 30
    }
  }
}

export default {
  data() {
    return {
      texts: TEXTS,
      order: {
        id: '',
        item: '',
        dropoff: '',
        amount: 0,
        deliveryFee: 0,
        totalPrice: 0,
        status: 'pending',
        statusText: TEXTS.pendingStatus,
        riderName: '',
        riderPhone: '',
        serviceType: ''
      }
    }
  },
  computed: {
    trackingState() {
      return this.texts.progressStates[this.order.status] || {
        title: this.order.statusText || this.texts.progressStates.fallback.title,
        subtitle: this.texts.progressStates.fallback.subtitle,
        progress: this.texts.progressStates.fallback.progress
      }
    },
    itemCount() {
      const text = String(this.order.item || '').trim()
      if (!text) return 0
      return text.split(/[,，\n ]+/).filter(Boolean).length
    },
    itemCountLabel() {
      return `\u5171 ${this.itemCount} \u4ef6`
    },
    riderDisplayName() {
      return this.order.riderName || this.texts.riderUnassigned
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
      uni.showToast({ title: this.texts.missingOrderId, icon: 'none' })
      return
    }
    void this.loadOrder(id)
  },
  methods: {
    async loadOrder(id) {
      uni.showLoading({ title: this.texts.loading })
      try {
        const data = await fetchOrderDetail(id)
        this.order = mapErrandOrderDetail(data || {})
      } catch (error) {
        const message = (error && error.data && error.data.error) || error.error || this.texts.loadFailed
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
        uni.showToast({ title: this.texts.riderUnavailable, icon: 'none' })
        return
      }

      phoneContactHelper
        .makePhoneCall({
          targetRole: 'rider',
          targetPhone: this.order.riderPhone,
          entryPoint: 'medicine_tracking',
          scene: 'medicine_order_contact',
          orderId: String(this.order.id || ''),
          roomId: this.order.id ? `rider_${this.order.id}` : '',
          pagePath: '/pages/medicine/tracking',
          metadata: {
            status: this.order.status || '',
            serviceType: this.order.serviceType || '',
            riderName: this.order.riderName || ''
          }
        })
        .catch(() => {
          uni.showToast({
            title: this.texts.callFailed,
            icon: 'none'
          })
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
  font-size: 12px;
  font-weight: 700;
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
  font-size: 12px;
  font-weight: 700;
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
