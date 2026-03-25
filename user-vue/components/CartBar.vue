<template>
  <view class="cart-bar" :class="{ 'has-items': totalCount > 0 }">
    <view class="cart-left" @tap="handleToggle">
      <view class="cart-icon-wrap" :class="{ active: totalCount > 0 }">
        <text class="cart-icon">🛒</text>
        <view v-if="totalCount > 0" class="cart-badge">
          {{ totalCount > 99 ? '99+' : totalCount }}
        </view>
      </view>
      <view class="cart-info">
        <text v-if="totalPrice > 0" class="cart-total">¥{{ totalPrice.toFixed(2) }}</text>
        <text v-else class="cart-empty">未选购商品</text>
        <text class="delivery-fee">另需配送费 ¥{{ deliveryFee }}</text>
      </view>
    </view>
    <button
      class="checkout-btn"
      :class="{ disabled: totalPrice < minPrice }"
      :disabled="totalPrice < minPrice"
      @tap="handleCheckout"
    >
      <text v-if="totalPrice >= minPrice">去结算</text>
      <text v-else>¥{{ minPrice }}起送</text>
    </button>
  </view>
</template>

<script>
export default {
  props: {
    totalCount: Number,
    totalPrice: Number,
    minPrice: Number,
    deliveryFee: Number
  },
  methods: {
    handleToggle() {
      this.$emit('toggle')
    },
    handleCheckout() {
      this.$emit('checkout')
    }
  }
}
</script>

<style scoped lang="scss">
.cart-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 16px;
  padding-right: 16px;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
}

.cart-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.cart-icon-wrap {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  transition: all 0.3s;
}

.cart-icon-wrap.active {
  background: #009bf5;
  animation: bounce 0.5s ease;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.cart-icon {
  font-size: 22px;
}

.cart-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.cart-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.cart-total {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 2px;
}

.cart-empty {
  font-size: 14px;
  color: #9ca3af;
  margin-bottom: 2px;
}

.delivery-fee {
  font-size: 11px;
  color: #9ca3af;
}

.checkout-btn {
  height: 44px;
  padding: 0 28px;
  background: #009bf5;
  border-radius: 22px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  border: none;

  &::after {
    border: none;
  }
}

.checkout-btn.disabled {
  background: #e5e7eb;
  color: #9ca3af;
}

.checkout-btn:active:not(.disabled) {
  opacity: 0.9;
}
</style>
