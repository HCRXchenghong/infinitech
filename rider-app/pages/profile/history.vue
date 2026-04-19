<template>
  <view class="page">
    <message-popup />

    <view class="order-list">
      <view
        v-for="order in orders"
        :key="order.id"
        class="order-card"
        @click="openOrderDetail(order)"
      >
        <view class="order-header">
          <text class="order-num">订单号 {{ order.orderNum }}</text>
          <text class="order-status">{{ getStatusText(order.status) }}</text>
        </view>
        <view class="order-info">
          <text class="shop-name">{{ order.shopName }}</text>
          <text class="address">{{ order.customerAddress }}</text>
        </view>
        <view class="order-footer">
          <text class="time">{{ order.createTime }}</text>
          <text class="price">¥{{ order.price }}</text>
        </view>
      </view>

      <view v-if="loading" class="empty">
        <text>加载中...</text>
      </view>
      <view v-else-if="orders.length === 0" class="empty">
        <text>暂无历史订单</text>
      </view>
    </view>

    <OrderDetailPopup
      :show="showOrderDetailPopup"
      :order="currentOrderDetail"
      @close="showOrderDetailPopup = false"
    />
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { fetchRiderOrders } from '../../shared-ui/api'
import { readRiderAuthIdentity } from '../../shared-ui/auth-session.js'
import OrderDetailPopup from '../../components/OrderDetailPopup.vue'

export default Vue.extend({
  components: {
    OrderDetailPopup
  },
  data() {
    return {
      orders: [] as any[],
      loading: false,
      showOrderDetailPopup: false,
      currentOrderDetail: null as any
    }
  },
  onShow() {
    this.loadHistoryOrders()
  },
  onPullDownRefresh() {
    this.loadHistoryOrders(true)
  },
  methods: {
    extractOrderList(data: any): any[] {
      if (Array.isArray(data)) return data
      if (Array.isArray(data?.orders)) return data.orders
      if (Array.isArray(data?.data)) return data.data
      if (Array.isArray(data?.data?.orders)) return data.data.orders
      return []
    },

    formatTime(value: any): string {
      if (!value) return '--'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '--'
      const MM = String(date.getMonth() + 1).padStart(2, '0')
      const DD = String(date.getDate()).padStart(2, '0')
      const HH = String(date.getHours()).padStart(2, '0')
      const mm = String(date.getMinutes()).padStart(2, '0')
      return `${MM}-${DD} ${HH}:${mm}`
    },

    formatPrice(order: any): string {
      const raw = order.rider_income > 0
        ? Number(order.rider_income) / 100
        : order.delivery_fee ??
          order.deliveryFee ??
          order.rider_quoted_price ??
          order.riderQuotedPrice ??
          order.total_price ??
          order.totalPrice ??
          order.price
      const amount = Number(raw)
      return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
    },

    normalizeOrder(order: any) {
      if (!order || typeof order !== 'object') return null
      const status = String(order.status || '').toLowerCase()
      const sourceTime = order.completed_at ||
        order.completedAt ||
        order.updated_at ||
        order.updatedAt ||
        order.created_at ||
        order.createdAt
      const customerPhone = String(
        order.customer_phone ||
        order.customerPhone ||
        order.delivery_phone ||
        order.deliveryPhone ||
        ''
      )
      return {
        id: String(order.id || `${status}-${sourceTime || Date.now()}`),
        orderNo: String(order.daily_order_id || order.dailyOrderId || order.order_num || order.orderNum || order.id || '--'),
        orderNum: String(order.daily_order_id || order.dailyOrderId || order.order_num || order.orderNum || order.id || '--'),
        status: status || 'completed',
        shopName: order.shop_name || order.shopName || order.food_shop || order.merchant_name || order.merchantName || '商家信息缺失',
        customerAddress: order.address || order.customer_address || order.customerAddress || order.delivery_request || order.deliveryRequest || '配送地址缺失',
        createTime: this.formatTime(sourceTime),
        createdAt: this.formatTime(sourceTime),
        sortAt: Number(new Date(sourceTime || 0).getTime()) || 0,
        customerName: order.customer_name || order.customerName || '',
        customerPhone,
        customer_phone: customerPhone,
        address: order.address || order.customer_address || order.customerAddress || order.delivery_request || order.deliveryRequest || '配送地址缺失',
        statusText: this.getStatusText(status || 'completed'),
        amount: this.formatPrice(order),
        price: this.formatPrice(order)
      }
    },

    mergeAndSetOrders(orderList: any[]) {
      const uniqueMap: Record<string, any> = {}
      orderList.forEach((item: any) => {
        if (!item || !item.id) return
        uniqueMap[String(item.id)] = item
      })
      this.orders = Object.values(uniqueMap).sort((a: any, b: any) => Number(b.sortAt) - Number(a.sortAt))
    },

    async loadHistoryOrders(fromPullDown = false) {
      const riderId = readRiderAuthIdentity({ uniApp: uni }).riderId
      if (!riderId) {
        this.orders = []
        if (fromPullDown) uni.stopPullDownRefresh()
        return
      }

      this.loading = true
      try {
        const [completedRes, cancelledRes] = await Promise.all([
          fetchRiderOrders('completed'),
          fetchRiderOrders('cancelled')
        ])

        const normalizedOrders = [
          ...this.extractOrderList(completedRes),
          ...this.extractOrderList(cancelledRes)
        ]
          .map((item: any) => this.normalizeOrder(item))
          .filter((item: any) => item && (item.status === 'completed' || item.status === 'cancelled'))

        this.mergeAndSetOrders(normalizedOrders)
      } catch (err) {
        console.error('加载历史订单失败:', err)
        this.orders = []
        uni.showToast({ title: '历史订单加载失败', icon: 'none' })
      } finally {
        this.loading = false
        if (fromPullDown) uni.stopPullDownRefresh()
      }
    },

    getStatusText(status: string) {
      const map: any = {
        completed: '已完成',
        cancelled: '已取消'
      }
      return map[status] || status
    },

    openOrderDetail(order: any) {
      if (!order) return
      this.currentOrderDetail = { ...order }
      this.showOrderDetailPopup = true
    }
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 24rpx;
}

.order-card {
  background: white;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.order-num {
  font-size: 24rpx;
  color: #6b7280;
}

.order-status {
  font-size: 24rpx;
  color: #10b981;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.shop-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
}

.address {
  font-size: 24rpx;
  color: #6b7280;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time {
  font-size: 22rpx;
  color: #9ca3af;
}

.price {
  font-size: 32rpx;
  font-weight: bold;
  color: #009bf5;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #9ca3af;
}
</style>
