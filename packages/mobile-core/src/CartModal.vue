<template>
  <view v-if="show" class="modal-mask" @tap="handleClose">
    <view class="modal-content" @tap.stop>
      <view class="modal-header">
        <text class="modal-title">已选商品</text>
        <text class="clear-btn" @tap="handleClear">清空</text>
      </view>
      <scroll-view scroll-y class="modal-body">
        <view v-if="cartItems.length === 0" class="empty-cart">
          <image
            class="empty-icon"
            src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2248%22%20height%3D%2248%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M9%202H7a2%202%200%200%200-2%202v14a2%202%200%200%200%202%202h10a2%202%200%200%200%202-2V4a2%202%200%200%200-2-2h-2%22%2F%3E%3Cpath%20d%3D%22M9%202a2%202%200%200%201%202%202h2a2%202%200%200%201%202%202%22%2F%3E%3Cpath%20d%3D%22M9%2010h6M9%2014h6%22%2F%3E%3C%2Fsvg%3E"
            mode="aspectFit"
          />
          <text class="empty-text">购物车是空的</text>
        </view>
        <view v-for="item in cartItems" :key="item.id" class="cart-item">
          <view class="item-left">
            <text class="item-name">{{ item.name }}</text>
            <text v-if="item.desc" class="item-desc">{{ item.desc }}</text>
          </view>
          <view class="item-right">
            <text class="item-price">¥{{ formatPrice(item.price * item.count) }}</text>
            <view class="cart-actions">
              <view class="minus-btn" @tap.stop="handleMinus(item)">
                <text>−</text>
              </view>
              <text class="item-count">{{ item.count }}</text>
              <view class="plus-btn" @tap.stop="handlePlus(item)">
                <text>+</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
      <view class="modal-footer">
        <view class="footer-info">
          <text class="total-label">合计</text>
          <text class="total-price">¥{{ formatPrice(totalPrice) }}</text>
        </view>
        <button class="checkout-btn" @tap="handleCheckout">去结算</button>
      </view>
    </view>
  </view>
</template>

<script>
import { createCartModalComponent } from "./consumer-modal-components.js";

export default createCartModalComponent();
</script>

<style scoped lang="scss">
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: #fff;
  width: 100%;
  max-height: 70vh;
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f2f3f5;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f1f1f;
}

.clear-btn {
  font-size: 14px;
  color: #6b7280;
  padding: 4px 8px;
}

.modal-body {
  flex: 1;
  max-height: calc(70vh - 140px);
  padding: 16px 24px;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: #9ca3af;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.item-left {
  flex: 1;
  margin-right: 16px;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
  display: block;
  margin-bottom: 4px;
}

.item-desc {
  font-size: 12px;
  color: #9ca3af;
  display: block;
}

.item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.item-price {
  font-size: 16px;
  font-weight: 700;
  color: #ef4444;
}

.cart-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.minus-btn,
.plus-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
}

.minus-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.plus-btn {
  background: #0095ff;
  color: #fff;
}

.item-count {
  font-size: 15px;
  color: #1f1f1f;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}

.modal-footer {
  padding: 16px 24px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  padding-bottom: calc(16px + constant(safe-area-inset-bottom, 0px));
  border-top: 1px solid #f2f3f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #fff;
}

.footer-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.total-label {
  font-size: 14px;
  color: #6b7280;
}

.total-price {
  font-size: 20px;
  font-weight: 700;
  color: #ef4444;
}

.checkout-btn {
  padding: 0 24px;
  height: 44px;
  line-height: 42px;
  background: #0095ff;
  color: #fff;
  border-radius: 22px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  flex-shrink: 0;

  &::after {
    border: none;
  }

  &:active {
    opacity: 0.85;
    transform: scale(0.98);
  }
}
</style>
