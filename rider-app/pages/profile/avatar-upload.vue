<template>
  <view class="container">
    <view class="avatar-preview">
      <image
        :src="avatarUrl || '/static/images/logo.png'"
        mode="aspectFill"
        class="avatar-img"
      />
    </view>
    <view class="actions">
      <button class="btn" @click="chooseFromAlbum">从相册选择</button>
      <button class="btn" @click="takePhoto">拍照</button>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { createRiderAvatarUploadPageLogic } from '../../../packages/mobile-core/src/rider-avatar-upload-page.js'
import { updateAvatar, uploadImage } from '../../shared-ui/api'
import {
  persistRiderAuthSession,
  readRiderAuthIdentity,
  readRiderAuthSession,
} from '../../shared-ui/auth-session.js'

export default Vue.extend(createRiderAvatarUploadPageLogic({
  uploadImage,
  updateAvatar,
  readRiderAuthIdentity,
  readRiderAuthSession,
  persistRiderAuthSession,
  uniApp: uni,
}) as any)
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 80rpx 32rpx 48rpx;
}

.avatar-preview {
  width: 280rpx;
  height: 280rpx;
  margin: 0 auto 64rpx;
  border-radius: 50%;
  overflow: hidden;
  background: #e5e7eb;
  box-shadow: 0 8rpx 32rpx rgba(0, 155, 245, 0.15);
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
  color: white;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
}
</style>
