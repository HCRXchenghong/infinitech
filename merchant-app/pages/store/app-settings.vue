<template>
  <view class="page settings-page">
    <view class="page-header">
      <view class="nav-left" @tap="back">‹</view>
      <view class="nav-title">
        <text>设置</text>
      </view>
      <view class="nav-right" />
    </view>

    <scroll-view scroll-y class="scroll-content">
      <view class="section">
        <view class="section-title">账号与安全</view>
        <view class="card">
          <view class="row">
            <text class="row-label">商户手机号</text>
            <text class="row-value">{{ phoneMasked }}</text>
          </view>
          <view class="row arrow" @tap="goResetPassword">
            <text class="row-label">重置登录密码</text>
            <text class="arrow-icon">›</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">通知设置</view>
        <view class="card">
          <view class="row between">
            <text class="row-label">消息通知</text>
            <switch :checked="settings.notification" color="#0095ff" @change="toggleSwitch('notification', $event)" />
          </view>
          <view class="row between">
            <text class="row-label">声音提醒</text>
            <switch :checked="settings.sound" color="#0095ff" @change="toggleSwitch('sound', $event)" />
          </view>
          <view class="row between">
            <text class="row-label">振动提醒</text>
            <switch :checked="settings.vibrate" color="#0095ff" @change="toggleSwitch('vibrate', $event)" />
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">隐私与协议</view>
        <view class="card">
          <view class="row arrow" @tap="showPrivacy">
            <text class="row-label">隐私政策</text>
            <text class="arrow-icon">›</text>
          </view>
          <view class="row arrow" @tap="showAgreement">
            <text class="row-label">用户协议</text>
            <text class="arrow-icon">›</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">通用</view>
        <view class="card">
          <view class="row arrow" @tap="clearCache">
            <text class="row-label">清除缓存</text>
            <text class="row-value">{{ cacheSize }}</text>
            <text class="arrow-icon">›</text>
          </view>
          <view class="row">
            <text class="row-label">当前版本</text>
            <text class="row-value">{{ appVersionLabel }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-placeholder" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getCachedMerchantPortalRuntimeSettings,
  loadMerchantPortalRuntimeSettings,
} from '@/shared-ui/portal-runtime'
import { getAppVersionLabel } from '@/shared-ui/app-version'

const STORAGE_KEY = 'merchantAppSettings'

const settings = reactive({
  notification: true,
  sound: true,
  vibrate: true,
})
const portalRuntime = reactive(getCachedMerchantPortalRuntimeSettings())
const appVersionLabel = ref(getAppVersionLabel())

const cacheSize = ref('0 MB')

const profile: any = uni.getStorageSync('merchantProfile') || {}
const phone = String(profile.phone || '')

const phoneMasked = computed(() => {
  if (/^1\d{10}$/.test(phone)) {
    return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
  }
  return phone || '未绑定'
})

function back() {
  uni.navigateBack()
}

function loadSettings() {
  const saved: any = uni.getStorageSync(STORAGE_KEY) || {}
  settings.notification = saved.notification !== false
  settings.sound = saved.sound !== false
  settings.vibrate = saved.vibrate !== false
}

function saveSettings() {
  uni.setStorageSync(STORAGE_KEY, {
    notification: settings.notification,
    sound: settings.sound,
    vibrate: settings.vibrate,
  })
}

function toggleSwitch(key: 'notification' | 'sound' | 'vibrate', e: any) {
  settings[key] = !!e.detail.value
  saveSettings()
}

function showPrivacy() {
  uni.showModal({
    title: '隐私政策',
    content: portalRuntime.privacyPolicy,
    showCancel: false,
  })
}

function showAgreement() {
  uni.showModal({
    title: '用户协议',
    content: portalRuntime.serviceAgreement,
    showCancel: false,
  })
}

function calcCacheSize() {
  try {
    const info = uni.getStorageInfoSync()
    const sizeKB = Number(info.currentSize || 0)
    if (sizeKB < 1024) {
      cacheSize.value = `${sizeKB.toFixed(0)} KB`
      return
    }
    cacheSize.value = `${(sizeKB / 1024).toFixed(1)} MB`
  } catch (_err) {
    cacheSize.value = '0 MB'
  }
}

function clearCache() {
  uni.showModal({
    title: '清除缓存',
    content: '清除后会重新拉取页面缓存数据，是否继续？',
    success: (res: any) => {
      if (!res.confirm) return

      const token = uni.getStorageSync('token')
      const profileData = uni.getStorageSync('merchantProfile')
      const authMode = uni.getStorageSync('authMode')

      uni.clearStorageSync()

      if (token) uni.setStorageSync('token', token)
      if (profileData) uni.setStorageSync('merchantProfile', profileData)
      if (authMode) uni.setStorageSync('authMode', authMode)

      saveSettings()
      calcCacheSize()
      uni.showToast({ title: '缓存已清除', icon: 'success' })
    },
  })
}

function goResetPassword() {
  uni.navigateTo({ url: '/pages/reset-password/index' })
}

loadSettings()
calcCacheSize()
onMounted(() => {
  void loadMerchantPortalRuntimeSettings().then((runtime) => {
    Object.assign(portalRuntime, runtime)
  })
})
</script>

<style scoped lang="scss">
.settings-page {
  min-height: 100vh;
  background: #f5f7fb;
}

.page-header {
  height: calc(var(--status-bar-height) + 92rpx);
  padding-top: var(--status-bar-height);
  background: #ffffff;
  border-bottom: 1rpx solid #e7eef7;
  display: flex;
  align-items: center;
}

.nav-left,
.nav-right {
  width: 88rpx;
  text-align: center;
  font-size: 46rpx;
  color: #46617f;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: #102d49;
}

.scroll-content {
  height: calc(100vh - var(--status-bar-height) - 92rpx);
  padding: 18rpx 24rpx 0;
  box-sizing: border-box;
}

.section {
  margin-bottom: 18rpx;
}

.section-title {
  font-size: 24rpx;
  color: #6b8198;
  margin: 0 2rpx 10rpx;
}

.card {
  background: #ffffff;
  border: 1rpx solid #e2ebf6;
  border-radius: 18rpx;
  overflow: hidden;
}

.row {
  min-height: 86rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #eef3f9;

  &:last-child {
    border-bottom: none;
  }
}

.row.between {
  justify-content: space-between;
}

.row.arrow {
  cursor: pointer;
}

.row-label {
  font-size: 26rpx;
  color: #163757;
}

.row-value {
  margin-left: auto;
  font-size: 24rpx;
  color: #7c90a7;
}

.arrow-icon {
  margin-left: 10rpx;
  font-size: 30rpx;
  color: #9fb0c2;
}

.bottom-placeholder {
  height: calc(24rpx + env(safe-area-inset-bottom));
}
</style>
