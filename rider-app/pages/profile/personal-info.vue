<template>
  <view class="container">
    <view class="section">
      <view class="section-title">基本信息</view>
      <view class="info-card">
        <view class="info-item" @click="editNickname">
          <text class="label">昵称</text>
          <view class="value-row">
            <text class="value">{{ profile.nickname || '未设置' }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">实名认证</view>
      <view class="info-card">
        <view class="info-item" @click="editRealName">
          <text class="label">真实姓名</text>
          <view class="value-row">
            <text class="value">{{ profile.real_name || '未认证' }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
        <view class="divider"></view>
        <view class="info-item" @click="editIDCard">
          <text class="label">身份证号</text>
          <view class="value-row">
            <text class="value">{{ maskIDCard(profile.id_card_number) }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">认证状态</view>
      <view class="status-card">
        <view class="status-row">
          <text class="status-label">当前状态</text>
          <text class="status-value" :class="{ verified: profile.is_verified, pending: !profile.is_verified }">
            {{ verificationStatusText }}
          </text>
        </view>
        <text class="status-hint">{{ verificationStatusHint }}</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { getRiderProfile, updateRiderProfile } from '../../shared-ui/api'
import { createRiderPersonalInfoPageLogic } from '../../../packages/mobile-core/src/rider-personal-info-page.js'

export default Vue.extend(createRiderPersonalInfoPageLogic({
  getRiderProfile,
  updateRiderProfile,
  uniApp: uni,
}) as any)
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 32rpx;
}

.section {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 28rpx;
  color: #6b7280;
  padding: 0 8rpx 16rpx;
  font-weight: 500;
}

.info-card {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 36rpx 32rpx;
  min-height: 96rpx;
}

.label {
  font-size: 32rpx;
  color: #1f2937;
  font-weight: 500;
}

.value-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.value {
  font-size: 30rpx;
  color: #6b7280;
}

.arrow {
  font-size: 36rpx;
  color: #d1d5db;
  font-weight: 300;
}

.divider {
  height: 1rpx;
  background: #f3f4f6;
  margin: 0 32rpx;
}

.status-card {
  background: white;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.status-label {
  font-size: 30rpx;
  color: #6b7280;
}

.status-value {
  font-size: 30rpx;
  font-weight: 600;
}

.status-value.verified {
  color: #059669;
}

.status-value.pending {
  color: #d97706;
}

.status-hint {
  display: block;
  font-size: 26rpx;
  line-height: 1.6;
  color: #6b7280;
}
</style>
