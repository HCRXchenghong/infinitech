<template>
  <view class="page cart-popup-page">
    <view class="popup-header">
      <text class="popup-title">已选商品</text>
      <text class="clear-cart" @tap="handleClear">🗑 清空</text>
    </view>
    <scroll-view scroll-y class="cart-popup-list">
      <view v-for="item in cartItems" :key="item.id" class="cart-popup-item">
        <view class="item-left">
          <text class="item-name">{{ item.name }}</text>
          <text class="item-desc">{{ item.desc || "" }}</text>
        </view>
        <view class="item-right">
          <text class="item-price">¥{{ (item.price * item.count).toFixed(2) }}</text>
          <view class="cart-actions small">
            <view class="minus-btn" @tap="handleMinus(item)">
              <text>−</text>
            </view>
            <text class="item-count">{{ item.count }}</text>
            <view class="plus-btn" @tap="handlePlus(item)">
              <text>+</text>
            </view>
          </view>
        </view>
      </view>
      <view v-if="cartItems.length === 0" class="empty-cart">
        <text class="empty-icon">🛒</text>
        <text class="empty-text">购物车是空的</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchMenuItems } from "@/shared-ui/api.js";
import { createCartPopupPage } from "./cart-popup-page.js";

export default createCartPopupPage({
  fetchMenuItems,
});
</script>

<style scoped lang="scss" src="./cart-popup-page.scss"></style>
