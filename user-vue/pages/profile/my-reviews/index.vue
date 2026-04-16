<template>
  <view class="page reviews-page">
    <view class="summary-card">
      <view>
        <text class="summary-title">我的评价</text>
        <text class="summary-sub">累计 {{ total }} 条</text>
      </view>
      <view class="score-box">
        <text class="score-value">{{ avgRatingDisplay }}</text>
        <text class="score-label">平均分</text>
      </view>
    </view>

    <view class="filter-row">
      <view
        class="filter-chip"
        :class="{ active: activeFilter === 'all' }"
        @tap="activeFilter = 'all'"
      >
        <text>全部 {{ total }}</text>
      </view>
      <view
        class="filter-chip"
        :class="{ active: activeFilter === 'with_images' }"
        @tap="activeFilter = 'with_images'"
      >
        <text>有图 {{ withImagesCount }}</text>
      </view>
      <view
        class="filter-chip"
        :class="{ active: activeFilter === 'with_reply' }"
        @tap="activeFilter = 'with_reply'"
      >
        <text>有回复 {{ withReplyCount }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view v-if="loading && !reviews.length" class="state-wrap">
        <text class="state-text">加载中...</text>
      </view>

      <view v-else-if="!reviews.length" class="state-wrap">
        <text class="state-title">还没有评价记录</text>
        <text class="state-text">完成订单后可以在这里查看历史评价</text>
      </view>

      <view v-else class="review-list">
        <view v-if="!filteredReviews.length" class="state-wrap in-list">
          <text class="state-title">当前筛选暂无记录</text>
          <text class="state-text">切换筛选查看其他评价</text>
        </view>

        <view
          v-for="item in filteredReviews"
          :key="item.id"
          class="review-card"
        >
          <view class="shop-row" @tap="goShop(item.shopId)">
            <image
              class="shop-logo"
              :src="item.shopLogo || item.shopCoverImage || '/static/images/default-shop.svg'"
              mode="aspectFill"
            />
            <view class="shop-info">
              <text class="shop-name">{{ item.shopName || '商家' }}</text>
              <text class="review-time">{{ formatDate(item.createdAt || item.created_at) }}</text>
            </view>
            <text class="shop-enter">查看店铺 ›</text>
          </view>

          <view class="rating-row">
            <text class="rating-label">评分</text>
            <text class="rating-stars">{{ renderStars(item.rating) }}</text>
            <text class="rating-value">{{ formatRating(item.rating) }}</text>
          </view>

          <text class="review-content">{{ item.content || '未填写文字评价' }}</text>

          <view v-if="normalizeImages(item.images).length" class="image-grid">
            <image
              v-for="(img, index) in normalizeImages(item.images)"
              :key="index"
              :src="img"
              mode="aspectFill"
              class="review-image"
              @tap="previewImage(item.images, index)"
            />
          </view>

          <view v-if="item.reply" class="reply-box">
            <text class="reply-title">商家回复</text>
            <text class="reply-content">{{ item.reply }}</text>
          </view>
        </view>

        <view class="footer-tip">
          <text v-if="loadingMore">加载中...</text>
          <text v-else-if="finished">没有更多了</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchUserReviews } from '@/shared-ui/api.js'
import { createProfileMyReviewsPage } from '../../../../shared/mobile-common/profile-my-reviews-page.js'

export default createProfileMyReviewsPage({
  fetchUserReviews
})
</script>

<style scoped lang="scss" src="./index.scss"></style>
