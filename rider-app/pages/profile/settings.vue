<template>
  <view class="container">
    <message-popup />

    <view class="page-padding">
      <view class="section">
        <view class="section-title">账号设置</view>
        <view class="settings-card">
          <view class="setting-item" @click="changeAvatar">
            <text class="setting-label">头像</text>
            <view class="setting-right">
              <image class="avatar-small" :src="avatarUrl" mode="aspectFill" />
              <text class="arrow">></text>
            </view>
          </view>
          <view class="divider"></view>
          <view class="setting-item" @click="editProfile">
            <text class="setting-label">个人信息</text>
            <view class="setting-right">
              <text class="setting-value">{{ riderName }}</text>
              <text class="arrow">></text>
            </view>
          </view>
          <view class="divider"></view>
          <view class="setting-item" @click="changePhone">
            <text class="setting-label">手机号</text>
            <view class="setting-right">
              <text class="setting-value">{{ maskedPhone }}</text>
              <text class="arrow">></text>
            </view>
          </view>
          <view class="divider"></view>
          <view class="setting-item" @click="changePassword">
            <text class="setting-label">登录密码</text>
            <view class="setting-right">
              <text class="setting-value">修改</text>
              <text class="arrow">></text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">通知设置</view>
        <view class="settings-card">
          <view class="setting-item">
            <text class="setting-label">消息通知</text>
            <switch :checked="settings.messageNotice" @change="toggleSetting('messageNotice')" color="#009bf5" />
          </view>
          <view class="divider"></view>
          <view class="setting-item">
            <text class="setting-label">新订单提醒</text>
            <switch :checked="settings.orderNotice" @change="toggleSetting('orderNotice')" color="#009bf5" />
          </view>
          <view class="divider"></view>
          <view class="setting-item">
            <text class="setting-label">震动提醒</text>
            <switch :checked="settings.vibrateNotice" @change="toggleSetting('vibrateNotice')" color="#009bf5" />
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">其他</view>
        <view class="settings-card">
          <view class="setting-item" @click="goToDeveloper">
            <text class="setting-label">开发者选项</text>
            <view class="setting-right">
              <text class="setting-value">调试工具</text>
              <text class="arrow">></text>
            </view>
          </view>
          <view class="divider"></view>
          <view class="setting-item" @click="clearCache">
            <text class="setting-label">清除缓存</text>
            <view class="setting-right">
              <text class="setting-value">{{ cacheSize }}</text>
              <text class="arrow">></text>
            </view>
          </view>
          <view class="divider"></view>
          <view class="setting-item" @click="showAbout">
            <text class="setting-label">关于我们</text>
            <view class="setting-right">
              <text class="setting-value">{{ appVersionLabel }}</text>
              <text class="arrow">></text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <button class="btn-logout" @click="handleLogout">退出登录</button>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { fetchRiderInfo, updateRiderStatus } from '../../shared-ui/api'
import { getAppVersionLabel } from '../../shared-ui/app-version'
import { unregisterCurrentPushDevice, clearPushRegistrationState } from '../../shared-ui/push-registration'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from '../../shared-ui/support-runtime'
import {
  clearRiderAuthSession,
  persistRiderAuthSession,
  readRiderAuthSession,
} from '../../shared-ui/auth-session.js'
import notification from '../../utils/notification'
import { createRiderProfileSettingsPageLogic } from '../../../packages/mobile-core/src/rider-profile-settings-page.js'

export default Vue.extend(createRiderProfileSettingsPageLogic({
  fetchRiderInfo,
  updateRiderStatus,
  getAppVersionLabel,
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
  unregisterCurrentPushDevice,
  clearPushRegistrationState,
  readRiderAuthSession,
  persistRiderAuthSession,
  clearRiderAuthSession,
  notificationRuntime: notification,
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
  padding: 0 16rpx 16rpx;
  font-size: 26rpx;
  color: #6b7280;
  font-weight: 500;
}

.settings-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 0 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(15, 23, 42, 0.04);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 0;
}

.setting-label {
  font-size: 28rpx;
  color: #111827;
}

.setting-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.avatar-small {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
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
  background: #f3f4f6;
}

.btn-logout {
  width: 100%;
  border: none;
  border-radius: 16rpx;
  background: #ffffff;
  color: #ef4444;
  padding: 24rpx;
  font-size: 32rpx;
  font-weight: 500;
  box-shadow: 0 2rpx 8rpx rgba(15, 23, 42, 0.04);
}
</style>
