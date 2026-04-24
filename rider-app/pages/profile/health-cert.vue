<template>
  <view class="container">
    <view class="page-padding">
      <!-- 健康证状态卡片 -->
      <view class="cert-card" :class="certStatusMeta.status">
        <view class="cert-header">
          <text class="cert-icon">{{ certStatusMeta.icon }}</text>
          <view class="cert-info">
            <text class="cert-title">{{ certStatusMeta.title }}</text>
            <text class="cert-desc">{{ certStatusMeta.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 健康证照片 -->
      <view class="cert-image-card">
        <view class="card-title">健康证照片</view>
        <view class="image-wrapper">
          <image
            class="cert-image"
            :src="certImageUrl"
            mode="aspectFit"
            @click="previewImage"
          ></image>
        </view>
        <view class="image-actions">
          <button class="btn-action" @click="uploadImage">上传新证件</button>
          <button class="btn-action secondary" @click="downloadImage">下载</button>
        </view>
      </view>

      <!-- 健康证信息 -->
      <view class="info-card">
        <view class="card-title">证件信息</view>
        <view class="info-list">
          <block v-for="(item, index) in certInfoRows" :key="item.label">
            <view class="info-item">
              <text class="info-label">{{ item.label }}</text>
              <text class="info-value">{{ item.value }}</text>
            </view>
            <view v-if="index < certInfoRows.length - 1" class="divider"></view>
          </block>
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="tip-box">
        <text class="tip-icon">📢</text>
        <text class="tip-text">{{ tipText }}</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { createRiderHealthCertPageLogic } from '../../../packages/mobile-core/src/rider-health-cert-page.js'

export default Vue.extend(createRiderHealthCertPageLogic({
  uniApp: uni,
}) as any)
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f3f4f6;
  padding-top: 88rpx;
}

.page-padding {
  padding: 24rpx;
  box-sizing: border-box;
}

.cert-card {
  background: white;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  border-left: 8rpx solid #16a34a;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  
  &.expiring {
    border-left-color: #f59e0b;
    background: #fffbeb;
  }
  
  &.expired {
    border-left-color: #ef4444;
    background: #fef2f2;
  }
}

.cert-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.cert-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #d1fae5;
  color: #16a34a;
  font-size: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.cert-info {
  flex: 1;
}

.cert-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1f2937;
  display: block;
  margin-bottom: 8rpx;
}

.cert-desc {
  font-size: 24rpx;
  color: #6b7280;
  display: block;
}

.cert-image-card,
.info-card {
  background: white;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 24rpx;
}

.image-wrapper {
  background: #f9fafb;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  border: 2rpx solid #e5e7eb;
}

.cert-image {
  width: 100%;
  height: 400rpx;
}

.image-actions {
  display: flex;
  gap: 24rpx;
}

.btn-action {
  flex: 1;
  background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
  color: white;
  padding: 24rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: bold;
  border: none;
  
  &.secondary {
    background: white;
    color: #009bf5;
    border: 2rpx solid #009bf5;
  }
}

.info-list {
  display: flex;
  flex-direction: column;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
}

.info-label {
  font-size: 28rpx;
  color: #6b7280;
}

.info-value {
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 500;
}

.divider {
  height: 2rpx;
  background: #f9fafb;
}

.tip-box {
  background: #eff6ff;
  border: 2rpx solid #dbeafe;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.tip-icon {
  font-size: 32rpx;
  line-height: 1;
}

.tip-text {
  flex: 1;
  font-size: 24rpx;
  color: #1e40af;
  line-height: 1.5;
}
</style>
