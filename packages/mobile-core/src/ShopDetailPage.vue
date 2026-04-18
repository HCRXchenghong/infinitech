<template>
  <view class="shop-detail-page">
    <!-- 顶部导航栏（固定在顶部） -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="nav-actions">
        <view class="action-btn" @tap="toggleCollect">
          <text class="collect-star" :class="{ collected: isCollected }">{{ isCollected ? '★' : '☆' }}</text>
        </view>
      </view>
    </view>

    <!-- 顶部大图背景 -->
    <view class="hero-section">
      <!-- 背景图片 - 优先使用backgroundImage，没有则使用coverImage -->
      <image
        class="hero-bg"
        :src="shop.backgroundImage || shop.coverImage"
        mode="aspectFill"
      />
      <!-- 渐变遮罩 -->
      <view class="hero-gradient"></view>
    </view>

    <!-- 商家信息卡片（悬浮效果） -->
    <view class="shop-card">
      <!-- Logo居中 -->
      <view class="logo-wrapper">
        <view class="shop-logo">
          <image v-if="shop.logo" class="shop-logo-img" :src="shop.logo" mode="aspectFill" />
          <view v-else class="shop-logo-fallback">店</view>
        </view>
        <view v-if="shop.isBrand" class="brand-badge">品牌</view>
        <view v-if="shop.isFranchise" class="franchise-badge">加盟</view>
      </view>

      <!-- 商家名称和评分 -->
      <view class="shop-main-info">
        <text class="shop-name">{{ shop.name }}</text>
        <view class="shop-rating-row">
          <text class="rating-star">★</text>
          <text class="rating-value">{{ formatRating(displayRating) }}</text>
          <text class="monthly-sales">月售{{ shop.monthlySales }}+</text>
          <text class="per-capita">人均¥{{ perCapita }}</text>
        </view>
      </view>

      <!-- 优惠券标签区域 -->
      <scroll-view scroll-x class="coupon-scroll">
        <view class="coupon-list">
          <view
            v-for="(coupon, idx) in activeCoupons"
            :key="idx"
            class="coupon-tag"
            @tap="receiveCoupon(coupon)"
          >
            <text class="coupon-amount">{{ getCouponAmount(coupon) }}</text>
            <text class="coupon-desc">{{ getCouponDesc(coupon) }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 公告 -->
      <view class="announcement" v-if="shop.announcement">
        <text class="announcement-label">公告：</text>
        <text class="announcement-text">{{ shop.announcement }}</text>
      </view>
    </view>

    <!-- 选项卡切换 -->
    <view class="tabs-section">
      <view class="tabs-header">
        <view
          class="tab-item"
          :class="{ active: activeTab === 'reviews' }"
          @tap="activeTab = 'reviews'"
        >
          <text>评价 ({{ reviewCount }})</text>
          <view v-if="activeTab === 'reviews'" class="tab-indicator"></view>
        </view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'info' }"
          @tap="activeTab = 'info'"
        >
          <text>商家信息</text>
          <view v-if="activeTab === 'info'" class="tab-indicator"></view>
        </view>
      </view>

      <!-- 评价内容 -->
      <view v-if="activeTab === 'reviews'" class="tab-content">
        <!-- 评分概览 -->
        <view class="rating-summary">
          <view class="rating-big">
            <text class="score">{{ formatRating(displayRating) }}</text>
            <text class="label">综合评分</text>
          </view>
          <view class="rating-bars">
            <view class="bar-item">
              <text class="bar-label">好评率</text>
              <view class="bar"><view class="bar-fill good" :style="{ width: goodRateBarWidth }"></view></view>
              <text class="bar-value">{{ goodRateText }}</text>
            </view>
            <view class="bar-item">
              <text class="bar-label">差评率</text>
              <view class="bar"><view class="bar-fill bad" :style="{ width: badRateBarWidth }"></view></view>
              <text class="bar-value">{{ badRateText }}</text>
            </view>
          </view>
        </view>

        <!-- 评价标签筛选 -->
        <view class="review-tags">
          <view class="review-tag" :class="{ active: reviewFilter === 'all' }" @tap="reviewFilter = 'all'">
            <text>全部 {{ reviewCount }}</text>
          </view>
          <view class="review-tag" :class="{ active: reviewFilter === 'latest' }" @tap="reviewFilter = 'latest'">
            <text>最新</text>
          </view>
          <view class="review-tag" :class="{ active: reviewFilter === 'good' }" @tap="reviewFilter = 'good'">
            <text>好评 {{ goodReviewCount }}</text>
          </view>
          <view class="review-tag" :class="{ active: reviewFilter === 'bad', disabled: badReviewCount === 0 }" @tap="reviewFilter = 'bad'">
            <text>差评 {{ badReviewCount }}</text>
          </view>
        </view>

        <!-- 用户评价列表 -->
        <view class="reviews-list">
          <view v-if="filteredReviews.length === 0" style="text-align:center;padding:40px 0;color:#9ca3af;font-size:14px;">
            <text>暂无评价</text>
          </view>
          <view v-for="review in filteredReviews" :key="review.id" class="review-item">
            <view class="review-header">
              <image class="avatar" :src="review.avatar" mode="aspectFill" />
              <view class="user-info">
                <text class="username">{{ review.username }}</text>
                <text class="review-time">{{ review.time }}</text>
              </view>
              <view class="review-rating">
                <text class="star">★</text>
                <text>{{ Number(review.rating || 0).toFixed(1) }}</text>
              </view>
            </view>
            <text class="review-content">{{ review.content }}</text>
            <view class="review-images" v-if="review.images && review.images.length">
              <image
                v-for="(img, i) in review.images"
                :key="i"
                :src="img"
                class="review-image"
                mode="aspectFill"
              />
            </view>
            <view v-if="review.reply" class="merchant-reply">
              <text class="reply-label">商家回复：</text>
              <text class="reply-text">{{ review.reply }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 商家信息内容 -->
      <view v-if="activeTab === 'info'" class="tab-content info-tab">
        <view class="info-card">
          <text class="card-title">商家信息</text>
          <view class="info-row">
            <text class="info-label">品类</text>
            <text class="info-value">{{ shop.tags ? shop.tags.slice(0, 2).join('、') : '' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">地址</text>
            <text class="info-value">{{ shop.address }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">电话</text>
            <text class="info-value phone" @tap="callPhone">{{ shop.phone }}</text>
          </view>
        </view>

        <view class="info-card">
          <text class="card-title">营业时间</text>
          <view class="info-row">
            <text class="info-value">周一至周日 {{ shop.businessHours }}</text>
          </view>
        </view>

        <view class="info-card">
          <text class="card-title">商家资质</text>
          <view class="license-item" @tap="previewLicense('merchantQualification')">
            <text>营业执照</text>
            <view class="license-right">
              <text class="license-status">{{ shop.merchantQualification ? '点击查看' : '未上传' }}</text>
              <text class="arrow">›</text>
            </view>
          </view>
          <view class="license-item" @tap="previewLicense('foodBusinessLicense')">
            <text>食品经营许可证</text>
            <view class="license-right">
              <text class="license-status">{{ shop.foodBusinessLicense ? '点击查看' : '未上传' }}</text>
              <text class="arrow">›</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部去点餐按钮 -->
    <view class="bottom-action">
      <button class="order-btn" @tap="goToMenu">
        <text class="btn-icon">🍽</text>
        <text>去点餐</text>
      </button>
    </view>
  </view>
</template>

<script>
import {
  addUserFavorite,
  deleteUserFavorite,
  fetchUserFavoriteStatus,
  recordPhoneContactClick,
  request,
} from "@/shared-ui/api.js";
import {
  createShopDetailPageOptions,
} from "./shop-detail-page.js";

export default createShopDetailPageOptions({
  request,
  addUserFavorite,
  deleteUserFavorite,
  fetchUserFavoriteStatus,
  recordPhoneContactClick,
});
</script>

<style scoped lang="scss" src="./shop-detail-page.scss"></style>
