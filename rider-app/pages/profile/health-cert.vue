<template>
  <view class="container">
    <view class="page-padding">
      <!-- 健康证状态卡片 -->
      <view class="cert-card" :class="certStatus">
        <view class="cert-header">
          <text class="cert-icon">{{ certStatus === 'valid' ? '✓' : '⚠' }}</text>
          <view class="cert-info">
            <text class="cert-title">{{ certStatus === 'valid' ? '健康证有效' : '健康证即将过期' }}</text>
            <text class="cert-desc">{{ certStatus === 'valid' ? '有效期至 2025-06-30' : '请及时更新健康证' }}</text>
          </view>
        </view>
      </view>

      <!-- 健康证照片 -->
      <view class="cert-image-card">
        <view class="card-title">健康证照片</view>
        <view class="image-wrapper">
          <image
            class="cert-image"
            src="/static/placeholder-cert.jpg"
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
          <view class="info-item">
            <text class="info-label">证件编号</text>
            <text class="info-value">440300202401001234</text>
          </view>
          <view class="divider"></view>
          <view class="info-item">
            <text class="info-label">发证机关</text>
            <text class="info-value">深圳市南山区疾控中心</text>
          </view>
          <view class="divider"></view>
          <view class="info-item">
            <text class="info-label">发证日期</text>
            <text class="info-value">2024-06-30</text>
          </view>
          <view class="divider"></view>
          <view class="info-item">
            <text class="info-label">有效期至</text>
            <text class="info-value">2025-06-30</text>
          </view>
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="tip-box">
        <text class="tip-icon">📢</text>
        <text class="tip-text">健康证是从事外卖配送的必要条件，请确保健康证在有效期内</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data() {
    return {
      certStatus: 'valid' // valid | expiring | expired
    }
  },
  methods: {
    previewImage() {
      uni.previewImage({
        urls: ['/static/placeholder-cert.jpg']
      })
    },
    
    uploadImage() {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          uni.showLoading({ title: '上传中...' })
          setTimeout(() => {
            uni.hideLoading()
            uni.showToast({ title: '上传成功', icon: 'success' })
          }, 1500)
        }
      })
    },
    
    downloadImage() {
      uni.showToast({ title: '下载成功', icon: 'success' })
    }
  }
})
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
