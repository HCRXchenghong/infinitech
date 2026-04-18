<template>
  <view class="page product-popup-page">
    <view class="popup-header">
      <view class="back-btn" @tap="goBack">
        <text>‹</text>
      </view>
    </view>
    <view class="popup-image-section">
      <image class="popup-image" :src="product.image" mode="aspectFill" />
    </view>
    <scroll-view scroll-y class="popup-content">
      <text class="popup-name">{{ product.name }}</text>
      <view class="popup-meta">
        <text>月售{{ product.sales }}</text>
        <text>好评率{{ product.likeRate || 95 }}%</text>
      </view>
      <view class="popup-price-row">
        <text class="popup-price-symbol">¥</text>
        <text class="popup-price">{{ product.price }}</text>
        <text v-if="product.originalPrice" class="popup-original">¥{{ product.originalPrice }}</text>
      </view>
      <view v-if="product.nutrition" class="nutrition-section">
        <text class="section-label">营养成分（每份）</text>
        <view class="nutrition-grid">
          <view class="nutrition-item">
            <text class="value">{{ product.nutrition.calories }}</text>
            <text class="label">千卡</text>
          </view>
          <view class="nutrition-item">
            <text class="value">{{ product.nutrition.protein }}g</text>
            <text class="label">蛋白质</text>
          </view>
          <view class="nutrition-item">
            <text class="value">{{ product.nutrition.fat }}g</text>
            <text class="label">脂肪</text>
          </view>
          <view class="nutrition-item">
            <text class="value">{{ product.nutrition.carbs }}g</text>
            <text class="label">碳水</text>
          </view>
        </view>
      </view>
      <view v-if="product.detail" class="detail-section">
        <text class="section-label">商品描述</text>
        <text class="detail-text">{{ product.detail }}</text>
      </view>
    </scroll-view>
    <view class="popup-footer">
      <view class="popup-cart-actions">
        <view v-if="count > 0" class="minus-btn large" @tap="handleMinus">
          <text>−</text>
        </view>
        <text v-if="count > 0" class="item-count large">{{ count }}</text>
        <view class="plus-btn large" @tap="handlePlus">
          <text>+</text>
        </view>
      </view>
      <button class="add-cart-btn" @tap="handleAddCart">
        <text>加入购物车 ¥{{ product.price }}</text>
      </button>
    </view>
  </view>
</template>

<script>
import { fetchProductDetail } from "@/shared-ui/api.js";
import { createProductPopupDetailPage } from "./product-pages.js";

export default createProductPopupDetailPage({
  fetchProductDetail,
});
</script>

<style scoped lang="scss" src="./product-popup-detail-page.scss"></style>
