<template>
  <view class="product-detail-page">
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text>‹</text>
      </view>
      <view class="nav-actions">
        <view class="action-btn">
          <text>♡</text>
        </view>
        <view class="action-btn">
          <text>↗</text>
        </view>
      </view>
    </view>

    <view class="hero-section">
      <image class="hero-image" :src="product.image" mode="aspectFill" />
      <view class="hero-gradient"></view>
    </view>

    <view class="product-content">
      <view class="info-card">
        <view class="price-row">
          <text class="price-symbol">¥</text>
          <text class="price">{{ product.price }}</text>
          <text v-if="product.originalPrice" class="original-price">¥{{ product.originalPrice }}</text>
          <view v-if="product.tag" class="product-tag">{{ product.tag }}</view>
        </view>

        <text class="product-name">{{ product.name }}</text>

        <view class="product-meta">
          <text>月售{{ product.sales || 0 }}</text>
          <text>好评率{{ product.likeRate || 95 }}%</text>
        </view>

        <view class="shop-row" @tap="goShopDetail">
          <view class="shop-logo">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="#FFF7ED"/>
              <path d="M9 22V12H15V22" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </view>
          <text class="shop-name">{{ product.shopName }}</text>
          <text class="arrow">›</text>
        </view>
      </view>

      <view v-if="product.nutrition" class="section-card">
        <text class="section-title">营养成分（每份）</text>
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

      <view class="section-card">
        <text class="section-title">商品详情</text>
        <text class="detail-text">{{ product.detail || "精选优质食材，匠心烹饪，还原地道风味。适合各类人群食用，美味健康。" }}</text>
      </view>
    </view>

    <view class="bottom-action">
      <view class="action-left">
        <view class="action-item" @tap="goShopDetail">
          <image class="action-icon" src="/static/icons/shop.png" mode="aspectFit" />
          <text class="action-text">店铺</text>
        </view>
        <view class="action-item">
          <image class="action-icon" src="/static/icons/service.png" mode="aspectFit" />
          <text class="action-text">客服</text>
        </view>
      </view>

      <view class="action-right">
        <button class="add-cart-btn" @tap="addToCart">
          <text>加入购物车 ¥{{ (product.price || 0).toFixed(2) }}</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchProductDetail } from "@/shared-ui/api.js";
import { createProductDetailPage } from "./product-pages.js";

export default createProductDetailPage({
  fetchProductDetail,
});
</script>

<style scoped lang="scss" src="./product-detail-page.scss"></style>
