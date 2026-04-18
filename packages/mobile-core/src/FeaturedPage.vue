<template>
  <view class="page featured-page">
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">今日推荐</text>
      <view class="placeholder" />
    </view>

    <view class="product-list">
      <view
        v-for="item in products"
        :key="item.id"
        class="product-card"
        @tap="goProductDetail(item)"
      >
        <image class="product-image" :src="item.image" mode="aspectFill" />
        <view class="product-info">
          <view class="info-top">
            <text class="product-name">{{ item.name }}</text>
            <view v-if="item.tag" class="tags">
              <text class="tag">{{ item.tag }}</text>
            </view>
            <text class="product-desc">{{ item.detail }}</text>
          </view>

          <view class="info-bottom">
            <view class="shop-row">
              <text class="shop-name">{{ item.shopName }}</text>
            </view>
            <view class="price-row">
              <view class="price-box">
                <text class="symbol">¥</text>
                <text class="price">{{ item.price }}</text>
                <text class="original">¥{{ item.originalPrice }}</text>
              </view>
              <view class="buy-btn">抢购</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="shops.length" class="shop-list">
      <view class="shop-list-title">推荐商户</view>
      <HomeShopCard
        v-for="shop in shops"
        :key="shop.id"
        :shop="shop"
        @shop-tap="goShopDetail"
      />
    </view>
  </view>
</template>

<script>
import HomeShopCard from "@/components/HomeShopCard.vue";
import { fetchHomeFeed } from "@/shared-ui/api.js";
import {
  normalizeFeaturedProductProjection,
  normalizeShopProjection,
} from "@/shared-ui/platform-schema.js";
import { createFeaturedPage } from "./featured-page.js";

export default createFeaturedPage({
  fetchHomeFeed,
  normalizeFeaturedProductProjection,
  normalizeShopProjection,
  HomeShopCard,
});
</script>

<style scoped lang="scss" src="./featured-page.scss"></style>
