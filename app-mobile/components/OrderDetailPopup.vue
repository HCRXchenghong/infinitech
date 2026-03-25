<template>
  <view v-if="show" class="popup-mask" @tap="handleClose">
    <view class="popup-panel" @tap.stop>
      <view class="popup-header">
        <text class="popup-title">订单详情</text>
        <text class="popup-close" @tap="handleClose">×</text>
      </view>

      <scroll-view class="popup-body" scroll-y>
        <view class="summary-card">
          <view class="summary-top">
            <text class="summary-no">#{{ orderNo }}</text>
            <text class="summary-status">{{ statusText }}</text>
          </view>
          <text class="summary-shop">{{ shopName }}</text>
          <text class="summary-amount">¥{{ amountText }}</text>
        </view>

        <view class="detail-card">
          <view
            v-for="item in detailRows"
            :key="item.label"
            class="detail-row"
          >
            <text class="detail-label">{{ item.label }}</text>
            <text class="detail-value">{{ item.value }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    show: {
      type: Boolean,
      default: false
    },
    order: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    safeOrder() {
      return this.order || {}
    },
    orderNo() {
      return this.safeOrder.orderNo ||
        this.safeOrder.order_no ||
        this.safeOrder.daily_order_id ||
        this.safeOrder.id ||
        '--'
    },
    statusText() {
      if (this.safeOrder.statusText) return this.safeOrder.statusText
      const status = this.safeOrder.status || ''
      const statusMap = {
        pending: '待接单',
        accepted: '已接单',
        delivering: '配送中',
        priced: '待付款',
        completed: '已完成',
        cancelled: '已取消'
      }
      return statusMap[status] || (status || '订单')
    },
    shopName() {
      return this.safeOrder.shopName ||
        this.safeOrder.shop_name ||
        this.safeOrder.food_shop ||
        '未命名商家'
    },
    amountText() {
      const amount = Number(
        this.safeOrder.amount !== undefined && this.safeOrder.amount !== null
          ? this.safeOrder.amount
          : this.safeOrder.price !== undefined && this.safeOrder.price !== null
            ? this.safeOrder.price
            : this.safeOrder.totalPrice !== undefined && this.safeOrder.totalPrice !== null
              ? this.safeOrder.totalPrice
              : this.safeOrder.total_price !== undefined && this.safeOrder.total_price !== null
                ? this.safeOrder.total_price
                : this.safeOrder.delivery_fee !== undefined && this.safeOrder.delivery_fee !== null
                  ? this.safeOrder.delivery_fee
                  : 0
      )
      return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
    },
    detailRows() {
      return [
        { label: '订单号', value: String(this.orderNo) },
        {
          label: '下单时间',
          value: this.safeOrder.createdAt || this.safeOrder.created_at || this.safeOrder.time || '-'
        },
        {
          label: '联系人',
          value: this.safeOrder.customer_name || this.safeOrder.customerName || '-'
        },
        {
          label: '联系电话',
          value: this.safeOrder.customer_phone || this.safeOrder.customerPhone || '-'
        },
        {
          label: '收货地址',
          value: this.safeOrder.address || this.safeOrder.customerAddress || '-'
        }
      ]
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped lang="scss">
.popup-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}

.popup-panel {
  width: 100%;
  max-height: 75vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
}

.popup-header {
  padding: 16px;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popup-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.popup-close {
  font-size: 28px;
  color: #9ca3af;
  line-height: 1;
}

.popup-body {
  max-height: calc(75vh - 58px);
  padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.summary-card {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border-radius: 14px;
  padding: 14px;
  color: #fff;
}

.summary-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-no {
  font-size: 12px;
  opacity: 0.9;
}

.summary-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
}

.summary-shop {
  display: block;
  margin-top: 10px;
  font-size: 15px;
  font-weight: 600;
}

.summary-amount {
  display: block;
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
}

.detail-card {
  margin-top: 12px;
  background: #fff;
  border: 1px solid #eef2f7;
  border-radius: 14px;
  overflow: hidden;
}

.detail-row {
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 13px;
  color: #6b7280;
  flex-shrink: 0;
}

.detail-value {
  font-size: 13px;
  color: #111827;
  text-align: right;
  word-break: break-all;
}
</style>
