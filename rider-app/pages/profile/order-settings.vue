<template>
  <view class="container">
    <view class="page-padding">
      <view class="section">
        <view class="section-title">接单范围</view>
        <view class="settings-card">
          <view class="setting-item slider-item">
            <view class="slider-head">
              <text class="setting-label">接单距离</text>
              <text class="setting-value">{{ orderSettings.maxDistanceKm.toFixed(1) }} 公里</text>
            </view>
            <slider
              class="distance-slider"
              min="1"
              max="20"
              step="0.5"
              :value="orderSettings.maxDistanceKm"
              activeColor="#009bf5"
              backgroundColor="#dbeafe"
              block-color="#009bf5"
              @change="handleDistanceChange"
            />
          </view>
          <view class="divider"></view>
          <view class="setting-item">
            <text class="setting-label">自动接单</text>
            <switch :checked="orderSettings.autoAcceptEnabled" @change="toggleAuto" color="#009bf5" />
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">偏好设置</view>
        <view class="settings-card">
          <view class="setting-item">
            <text class="setting-label">优先顺路单</text>
            <switch :checked="orderSettings.preferRoute" color="#009bf5" @change="handleSwitchChange('preferRoute', $event)" />
          </view>
          <view class="divider"></view>
          <view class="setting-item">
            <text class="setting-label">优先高价单</text>
            <switch :checked="orderSettings.preferHighPrice" color="#009bf5" @change="handleSwitchChange('preferHighPrice', $event)" />
          </view>
          <view class="divider"></view>
          <view class="setting-item">
            <text class="setting-label">优先近距离</text>
            <switch :checked="orderSettings.preferNearby" color="#009bf5" @change="handleSwitchChange('preferNearby', $event)" />
          </view>
        </view>
      </view>

      <view class="tip-box">
        <text class="tip-icon">💡</text>
        <text class="tip-text">{{ tipText }}</text>
      </view>

      <button class="save-btn" :disabled="saving || loading" @tap="savePreferences">
        {{ loading ? '加载中...' : (saving ? '保存中...' : '保存设置') }}
      </button>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { fetchRiderPreferences, saveRiderPreferences } from '../../shared-ui/api'
import { createRiderOrderSettingsPageLogic } from '../../../packages/mobile-core/src/rider-order-settings-page.js'

export default Vue.extend(createRiderOrderSettingsPageLogic({
  fetchRiderPreferences,
  saveRiderPreferences,
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

.section {
  margin-bottom: 48rpx;
}

.section-title {
  font-size: 26rpx;
  color: #6b7280;
  padding: 0 16rpx 16rpx;
  font-weight: 500;
}

.settings-card {
  background: white;
  border-radius: 24rpx;
  padding: 0 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 0;
}

.slider-item {
  display: block;
}

.slider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.setting-label {
  font-size: 28rpx;
  color: #1f2937;
}

.setting-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.setting-value {
  font-size: 28rpx;
  color: #6b7280;
}

.arrow {
  font-size: 32rpx;
  color: #d1d5db;
}

.divider {
  height: 2rpx;
  background: #f9fafb;
}

.distance-slider {
  margin-top: 12rpx;
}

.tip-box {
  background: #fffbeb;
  border: 2rpx solid #fef3c7;
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
  color: #92400e;
  line-height: 1.5;
}

.save-btn {
  margin-top: 32rpx;
  height: 88rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #009bf5 0%, #38bdf8 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}
</style>
