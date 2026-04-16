<template>
  <view class="page profile-edit">
    <view class="card">
      <view class="row between" @tap="openBgPicker">
        <text class="label">背景</text>
        <view class="row">
          <text class="bg-tip">{{ headerBg ? '已设置' : '默认蓝色' }}</text>
          <text class="arrow">></text>
        </view>
      </view>

      <view class="row between" @tap="chooseAvatar">
        <text class="label">头像</text>
        <view class="row">
          <image
            v-if="avatarUrl"
            :src="avatarUrl"
            mode="aspectFill"
            class="avatar-image"
          />
          <view v-else class="avatar-text">{{ avatarText }}</view>
          <text class="arrow">></text>
        </view>
      </view>

      <view class="row between">
        <text class="label">昵称</text>
        <input v-model.trim="nickname" class="input" placeholder="请输入昵称" maxlength="20" />
      </view>
    </view>

    <button class="save-btn" :loading="saving" @tap="save">保存</button>

    <view v-if="showBgPicker" class="mask" @tap="closeBgPicker">
      <view class="modal" @tap.stop>
        <view class="modal-title">选择背景</view>
        <view class="preset-grid">
          <view
            v-for="item in presetBg"
            :key="item.label"
            class="preset-item"
            @tap="choosePreset(item.value)"
          >
            <view
              v-if="item.value.startsWith('linear-gradient')"
              class="preset-gradient"
              :style="{ background: item.value }"
            />
            <image
              v-else
              class="preset-img"
              :src="item.value"
              mode="aspectFill"
            />
            <text class="preset-label">{{ item.label }}</text>
          </view>
        </view>
        <view class="modal-actions">
          <view class="btn btn-secondary" @tap="chooseHeaderBgFromAlbum">相册选择</view>
          <view class="btn btn-primary" @tap="closeBgPicker">取消</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchUser, updateUserProfile, uploadCommonImage } from '@/shared-ui/api.js'
import { createProfileEditPage } from '../../../../shared/mobile-common/profile-edit-page.js'

export default createProfileEditPage({
  fetchUser,
  updateUserProfile,
  uploadCommonImage
})
</script>

<style scoped lang="scss">
.profile-edit {
  min-height: 100vh;
  background: #f4f4f4;
  padding: 12px;
  position: relative;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 8px 12px;
}

.row {
  display: flex;
  align-items: center;
}

.between {
  justify-content: space-between;
  padding: 12px 0;
}

.label {
  font-size: 14px;
  color: #111827;
  font-weight: 600;
}

.avatar-image,
.avatar-text {
  width: 36px;
  height: 36px;
  border-radius: 999px;
}

.avatar-image {
  display: block;
}

.avatar-text {
  background: #fff;
  color: #009bf5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  border: 1px solid #e5e7eb;
}

.arrow {
  margin-left: 8px;
  color: #9ca3af;
}

.bg-tip {
  font-size: 13px;
  color: #6b7280;
}

.input {
  width: 60%;
  text-align: right;
  font-size: 14px;
  color: #374151;
}

.save-btn {
  margin-top: 14px;
  width: 100%;
  padding: 10px 0;
  border-radius: 999px;
  background: #009bf5;
  color: #fff;
  font-size: 15px;
}

.mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
}

.modal {
  width: 86%;
  background: #fff;
  border-radius: 14px;
  padding: 14px;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 12px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.preset-item {
  height: 72px;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.preset-gradient,
.preset-img {
  width: 100%;
  height: 100%;
}

.preset-label {
  position: absolute;
  left: 8px;
  bottom: 8px;
  font-size: 12px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.modal-actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 10px;
  font-size: 14px;
}

.btn-secondary {
  background: #f3f4f6;
  color: #111827;
}

.btn-primary {
  background: #009bf5;
  color: #fff;
}
</style>
