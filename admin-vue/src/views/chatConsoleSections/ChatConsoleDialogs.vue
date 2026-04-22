<template>
  <el-dialog
    :model-value="showCouponDialog"
    title="选择优惠券"
    width="500px"
    @update:model-value="setShowCouponDialog"
  >
    <div v-if="coupons.length" class="coupon-list">
      <div v-for="coupon in coupons" :key="coupon.id" class="coupon-item" @click="sendCoupon(coupon)">
        <div class="coupon-amount">¥{{ coupon.amount }}</div>
        <div class="coupon-name">{{ coupon.name }}</div>
        <div class="coupon-desc">{{ coupon.desc }}</div>
      </div>
    </div>
    <div v-else class="dialog-empty">暂无可发送优惠券</div>
  </el-dialog>

  <el-dialog
    :model-value="showOrderDialog"
    title="选择订单"
    width="500px"
    @update:model-value="setShowOrderDialog"
  >
    <div v-if="orders.length" class="order-list">
      <div v-for="order in orders" :key="order.id" class="order-item" @click="sendOrder(order)">
        <div class="order-no">订单 #{{ order.orderNo }}</div>
        <div class="order-info">
          <span>{{ order.productName }}</span>
          <span class="order-amount">¥{{ order.amount }}</span>
        </div>
      </div>
    </div>
    <div v-else class="dialog-empty">暂无可发送订单</div>
  </el-dialog>

  <el-image-viewer
    v-if="showImageViewer"
    :url-list="[previewImageUrl]"
    @close="setShowImageViewer(false)"
  />
</template>

<script setup>
defineProps({
  coupons: {
    type: Array,
    default: () => [],
  },
  orders: {
    type: Array,
    default: () => [],
  },
  previewImageUrl: {
    type: String,
    default: '',
  },
  sendCoupon: {
    type: Function,
    required: true,
  },
  sendOrder: {
    type: Function,
    required: true,
  },
  setShowCouponDialog: {
    type: Function,
    required: true,
  },
  setShowImageViewer: {
    type: Function,
    required: true,
  },
  setShowOrderDialog: {
    type: Function,
    required: true,
  },
  showCouponDialog: {
    type: Boolean,
    default: false,
  },
  showImageViewer: {
    type: Boolean,
    default: false,
  },
  showOrderDialog: {
    type: Boolean,
    default: false,
  },
});
</script>
