<template>
  <view class="page settings-page">
    <view class="page-header">
      <view class="nav-left" @tap="back">
        <image src="/static/icons/arrow-left.svg" mode="aspectFit" class="nav-icon" />
      </view>
      <view class="nav-title">
        <text>设置</text>
      </view>
      <view class="nav-right" />
    </view>

    <scroll-view scroll-y class="scroll-content">
      <view class="section">
        <view class="section-title">账号与安全</view>
        <view class="card">
          <view class="row arrow" @tap="goToPage('/pages/profile/edit/index')">
            <view class="row-left">
              <image src="/static/icons/user.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">个人资料</text>
            </view>
            <view class="row-right">
              <text class="row-value">{{ nickname }}</text>
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="goToPage('/pages/profile/phone-change/index')">
            <view class="row-left">
              <image src="/static/icons/phone.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">手机号</text>
            </view>
            <view class="row-right">
              <text class="row-value">{{ phoneMasked }}</text>
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="goToPage('/pages/auth/reset-password/index')">
            <view class="row-left">
              <image src="/static/icons/lock.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">修改密码</text>
            </view>
            <view class="row-right">
              <text class="arrow-icon">></text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">通知设置</view>
        <view class="card">
          <view class="row between">
            <view class="row-left">
              <image src="/static/icons/bell.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">消息通知</text>
            </view>
            <switch :checked="settings.notification" color="#0095ff" @change="toggleSetting('notification', $event)" />
          </view>
          <view class="row between">
            <view class="row-left">
              <image src="/static/icons/volume.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">声音提醒</text>
            </view>
            <switch :checked="settings.sound" color="#0095ff" @change="toggleSetting('sound', $event)" />
          </view>
          <view class="row between">
            <view class="row-left">
              <image src="/static/icons/vibrate.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">震动提醒</text>
            </view>
            <switch :checked="settings.vibrate" color="#0095ff" @change="toggleSetting('vibrate', $event)" />
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">隐私与通用</view>
        <view class="card">
          <view class="row between">
            <view class="row-left">
              <image src="/static/icons/location.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">定位服务</text>
            </view>
            <switch :checked="settings.location" color="#0095ff" @change="toggleSetting('location', $event)" />
          </view>
          <view class="row arrow" @tap="showPrivacy">
            <view class="row-left">
              <image src="/static/icons/shield.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">隐私政策</text>
            </view>
            <view class="row-right">
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="showUserAgreement">
            <view class="row-left">
              <image src="/static/icons/document.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">用户协议</text>
            </view>
            <view class="row-right">
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="clearCache">
            <view class="row-left">
              <image src="/static/icons/trash.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">清除缓存</text>
            </view>
            <view class="row-right">
              <text class="row-value">{{ cacheSize }}</text>
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="checkUpdate">
            <view class="row-left">
              <image src="/static/icons/refresh.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">检查更新</text>
            </view>
            <view class="row-right">
              <text class="row-value">{{ appVersionLabel }}</text>
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="goToPage('/pages/profile/settings/detail/index')">
            <view class="row-left">
              <image src="/static/icons/settings.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">更多设置</text>
            </view>
            <view class="row-right">
              <text class="arrow-icon">></text>
            </view>
          </view>
          <view class="row arrow" @tap="showAboutUs">
            <view class="row-left">
              <image src="/static/icons/info.svg" mode="aspectFit" class="row-icon" />
              <text class="row-label">关于我们</text>
            </view>
            <view class="row-right">
              <text class="arrow-icon">></text>
            </view>
          </view>
        </view>
      </view>

      <view class="logout-section">
        <button class="logout-btn" @tap="logout">退出登录</button>
      </view>

      <view class="bottom-placeholder" />
    </scroll-view>
  </view>
</template>

<script>
import { clearAllCache } from '@/shared-ui/cache-cleaner'
import { forceLogout } from '@/shared-ui/request-interceptor'
import { getCachedLegalRuntimeSettings, loadLegalRuntimeSettings } from '@/shared-ui/legal-runtime.js'
import { getAppVersionLabel } from '@/shared-ui/app-version.js'

const SETTINGS_STORAGE_KEY = 'appSettings'
const DEFAULT_SETTINGS = {
  notification: true,
  sound: true,
  vibrate: true,
  location: true
}

export default {
  data() {
    const legalRuntime = getCachedLegalRuntimeSettings()
    return {
      nickname: '悦享e食用户',
      phone: '',
      appVersionLabel: getAppVersionLabel(),
      cacheSize: '--',
      settings: { ...DEFAULT_SETTINGS },
      aboutSummary: legalRuntime.aboutSummary,
      privacyPolicySummary: legalRuntime.privacyPolicySummary,
      userAgreementSummary: legalRuntime.userAgreementSummary
    }
  },
  computed: {
    phoneMasked() {
      const phone = String(this.phone || '').trim()
      if (/^1\d{10}$/.test(phone)) {
        return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
      }
      return '未绑定'
    }
  },
  onShow() {
    this.loadUserInfo()
    this.loadSettings()
    this.calculateCacheSize()
    this.loadLegalRuntimeConfig()
  },
  methods: {
    back() {
      uni.navigateBack()
    },
    loadUserInfo() {
      const profile = uni.getStorageSync('userProfile') || {}
      this.nickname = profile.nickname || profile.name || '悦享e食用户'
      this.phone = profile.phone || ''
    },
    loadSettings() {
      const savedSettings = uni.getStorageSync(SETTINGS_STORAGE_KEY) || {}
      this.settings = {
        ...DEFAULT_SETTINGS,
        ...savedSettings
      }
    },
    async loadLegalRuntimeConfig() {
      const legalRuntime = await loadLegalRuntimeSettings()
      this.aboutSummary = legalRuntime.aboutSummary
      this.privacyPolicySummary = legalRuntime.privacyPolicySummary
      this.userAgreementSummary = legalRuntime.userAgreementSummary
    },
    saveSettings() {
      uni.setStorageSync(SETTINGS_STORAGE_KEY, this.settings)
    },
    toggleSetting(key, event) {
      this.settings[key] = !!event.detail.value
      this.saveSettings()
    },
    goToPage(path) {
      uni.navigateTo({ url: path })
    },
    calculateCacheSize() {
      uni.getStorageInfo({
        success: (res) => {
          const sizeKb = Number(res.currentSize || 0)
          if (sizeKb < 1024) {
            this.cacheSize = `${sizeKb} KB`
            return
          }
          this.cacheSize = `${(sizeKb / 1024).toFixed(2)} MB`
        },
        fail: () => {
          this.cacheSize = '--'
        }
      })
    },
    clearCache() {
      uni.showModal({
        title: '清除缓存',
        content: '将清除本地缓存数据，是否继续？',
        success: (res) => {
          if (!res.confirm) {
            return
          }
          clearAllCache()
          this.calculateCacheSize()
          uni.showToast({ title: '缓存已清除', icon: 'success' })
        }
      })
    },
    checkUpdate() {
      uni.showModal({
        title: '检查更新',
        content: `当前版本 ${this.appVersionLabel}，已是当前安装版本。`,
        showCancel: false
      })
    },
    showAboutUs() {
      uni.showModal({
        title: '关于悦享e食',
        content: this.aboutSummary,
        showCancel: false
      })
    },
    showPrivacy() {
      uni.showModal({
        title: '隐私政策',
        content: this.privacyPolicySummary,
        showCancel: false
      })
    },
    showUserAgreement() {
      uni.showModal({
        title: '用户协议',
        content: this.userAgreementSummary,
        showCancel: false
      })
    },
    logout() {
      uni.showModal({
        title: '退出登录',
        content: '确认退出当前账号？',
        confirmColor: '#ef4444',
        success: (res) => {
          if (res.confirm) {
            forceLogout()
          }
        }
      })
    }
  }
}
</script>

<style scoped lang="scss">
.settings-page {
  min-height: 100vh;
  background: #f5f7fb;
}

.page-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
  background: #fff;
  border-bottom: 1px solid #eef1f5;
  box-sizing: border-box;
}

.nav-left,
.nav-right {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  width: 20px;
  height: 20px;
}

.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.scroll-content {
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top, 0px) + 76px) 16px 32px;
  box-sizing: border-box;
}

.section {
  margin-bottom: 16px;
}

.section-title {
  margin-bottom: 10px;
  padding-left: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}

.card {
  overflow: hidden;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid #f2f4f7;
  box-sizing: border-box;
}

.row:last-child {
  border-bottom: 0;
}

.row-left,
.row-right {
  display: flex;
  align-items: center;
}

.row-icon {
  width: 18px;
  height: 18px;
  margin-right: 12px;
}

.row-label {
  font-size: 15px;
  color: #111827;
}

.row-value {
  margin-right: 8px;
  font-size: 13px;
  color: #6b7280;
}

.arrow-icon {
  font-size: 14px;
  color: #c0c6d0;
}

.between {
  gap: 16px;
}

.logout-section {
  margin-top: 24px;
}

.logout-btn {
  width: 100%;
  height: 48px;
  line-height: 48px;
  border: 0;
  border-radius: 14px;
  background: #ef4444;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.bottom-placeholder {
  height: calc(env(safe-area-inset-bottom, 0px) + 16px);
}
</style>
