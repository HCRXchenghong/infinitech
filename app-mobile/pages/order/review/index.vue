<template>
  <view class="page review-page">
    <!-- 顶部导航栏 -->
    <view class="page-header">
      <view class="nav-left" @tap="back">
        <image src="/static/icons/arrow-left.svg" mode="aspectFit" class="nav-icon" />
      </view>
      <view class="nav-title">
        <text>评价订单</text>
      </view>
      <view class="nav-right" />
    </view>

    <scroll-view scroll-y class="scroll-content">
      <!-- 商家信息 -->
      <view class="shop-section">
        <image
          :src="order.shopLogo || '/static/images/default-shop.svg'"
          mode="aspectFill"
          class="shop-avatar"
        />
        <view class="shop-text">
          <text class="shop-name">{{ order.shopName || '商家' }}</text>
          <text class="order-time">{{ order.time || '' }}</text>
        </view>
        <view class="contact-shop-btn" @tap="handleContactShop">
          <image
            class="message-icon"
            src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%230095ff%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M21%2015a2%202%200%200%201-2%202H7l-4%204V5a2%202%200%200%201%202-2h14a2%202%200%200%201%202%202z%22%2F%3E%3C%2Fsvg%3E"
            mode="aspectFit"
          />
        </view>
      </view>

      <!-- 商家评价 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">商家评价</text>
          <view class="stars-row">
            <view
              v-for="star in 5"
              :key="star"
              class="star-btn"
              :class="{ active: star <= shopRating }"
              @tap="shopRating = star"
            >
              <text class="star">★</text>
            </view>
          </view>
        </view>

        <!-- 评价内容 -->
        <view class="comment-box">
          <textarea
            v-model="shopReview.content"
            class="comment-input"
            placeholder="说说你的用餐体验，帮助其他小伙伴~"
            maxlength="200"
            :auto-height="true"
          />
          <view class="char-limit">{{ shopReview.content.length }}/200</view>
        </view>

        <!-- 图片上传 -->
        <view class="photos-box">
          <view
            v-for="(img, idx) in shopReview.images"
            :key="idx"
            class="photo-item"
          >
            <image :src="img" mode="aspectFill" class="photo-img" />
            <view class="photo-remove" @tap="removeShopImage(idx)">×</view>
          </view>
          <view
            v-if="shopReview.images.length < 3"
            class="photo-add"
            @tap="selectShopImage"
          >
            <image
              class="add-icon"
              src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M21%2015v4a2%202%200%200%201-2%202H5a2%202%200%200%201-2-2v-4%22%2F%3E%3Cpolyline%20points%3D%2217%208%2012%203%207%208%22%2F%3E%3Cline%20x1%3D%2212%22%20y1%3D%223%22%20x2%3D%2212%22%20y2%3D%2215%22%2F%3E%3C%2Fsvg%3E"
              mode="aspectFit"
            />
            <text class="add-text">上传图片</text>
          </view>
        </view>
      </view>

      <!-- 骑手评价 -->
      <view v-if="hasRider" class="section">
        <view class="section-header">
          <text class="section-title">骑手评价</text>
          <view class="stars-row">
            <view
              v-for="star in 5"
              :key="star"
              class="star-btn"
              :class="{ active: star <= riderRating }"
              @tap="riderRating = star"
            >
              <text class="star">★</text>
            </view>
          </view>
        </view>

        <!-- 评价内容 -->
        <view class="comment-box">
          <textarea
            v-model="riderReview.content"
            class="comment-input"
            placeholder="说说你对配送服务的感受~"
            maxlength="200"
            :auto-height="true"
          />
          <view class="char-limit">{{ riderReview.content.length }}/200</view>
        </view>

        <!-- 图片上传 -->
        <view class="photos-box">
          <view
            v-for="(img, idx) in riderReview.images"
            :key="idx"
            class="photo-item"
          >
            <image :src="img" mode="aspectFill" class="photo-img" />
            <view class="photo-remove" @tap="removeRiderImage(idx)">×</view>
          </view>
          <view
            v-if="riderReview.images.length < 3"
            class="photo-add"
            @tap="selectRiderImage"
          >
            <image
              class="add-icon"
              src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M21%2015v4a2%202%200%200%201-2%202H5a2%202%200%200%201-2-2v-4%22%2F%3E%3Cpolyline%20points%3D%2217%208%2012%203%207%208%22%2F%3E%3Cline%20x1%3D%2212%22%20y1%3D%223%22%20x2%3D%2212%22%20y2%3D%2215%22%2F%3E%3C%2Fsvg%3E"
              mode="aspectFit"
            />
            <text class="add-text">上传图片</text>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 提交按钮 -->
    <view class="submit-bar">
      <button class="submit-btn" @tap="handleSubmit">提交评价</button>
    </view>
  </view>
</template>

<script>
import { fetchOrderDetail, request } from '@/shared-ui/api.js'
import { createOrderReviewPage } from '../../../../shared/mobile-common/order-after-sales-pages.js'

export default createOrderReviewPage({
  fetchOrderDetail,
  request
})
</script>

<style scoped lang="scss" src="./index.scss"></style>
