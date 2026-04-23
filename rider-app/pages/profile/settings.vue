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
import {
  formatRoleSettingsCacheSize,
  maskRoleSettingsPhone,
  readRoleSettingsStorageEntries,
  restoreRoleSettingsStorageEntries,
} from '../../../packages/mobile-core/src/role-settings-portal.js'
import notification from '../../utils/notification'

declare const uni: any

const RIDER_CACHE_PRESERVED_STORAGE_KEYS = [
  'access_token',
  'socket_token',
  'socket_token_account_key',
  'notification_settings',
]

function readRiderSession() {
  return readRiderAuthSession({ uniApp: uni })
}

export default Vue.extend({
  data() {
    const supportRuntime = getCachedSupportRuntimeSettings()
    return {
      avatarUrl: '/static/images/logo.png',
      riderName: '骑手',
      phone: '',
      appVersionLabel: getAppVersionLabel(),
      cacheSize: '--',
      supportChatTitle: supportRuntime.title,
      aboutSummary: supportRuntime.aboutSummary,
      settings: {
        messageNotice: true,
        orderNotice: true,
        vibrateNotice: false,
      } as { [key: string]: boolean },
    }
  },
  computed: {
    maskedPhone(): string {
      return maskRoleSettingsPhone(String(this.phone || '').trim())
    },
  },
  onLoad() {
    this.loadNotificationSettings()
    this.calculateCacheSize()
    void this.loadRuntimeConfig()
    void this.loadRiderInfo()
  },
  onShow() {
    void this.loadRuntimeConfig()
    void this.loadRiderInfo()
    this.calculateCacheSize()
  },
  methods: {
    async loadRiderInfo() {
      try {
        const res: any = await fetchRiderInfo()
        if (!res) return
        this.avatarUrl = res.avatar || '/static/images/logo.png'
        this.riderName = res.name || res.nickname || '骑手'
        this.phone = res.phone || ''
      } catch (err) {
        console.error('[RiderSettings] 加载骑手信息失败:', err)
      }
    },

    async loadRuntimeConfig() {
      const runtime = await loadSupportRuntimeSettings()
      this.supportChatTitle = runtime.title
      this.aboutSummary = runtime.aboutSummary
    },

    loadNotificationSettings() {
      const currentSettings = notification.getSettings()
      this.settings = {
        ...this.settings,
        ...currentSettings,
      }
    },

    calculateCacheSize() {
      uni.getStorageInfo({
        success: (res: any) => {
          this.cacheSize = formatRoleSettingsCacheSize(res.currentSize)
        },
        fail: () => {
          this.cacheSize = formatRoleSettingsCacheSize(Number.NaN)
        },
      })
    },

    changeAvatar() {
      uni.navigateTo({ url: '/pages/profile/avatar-upload' })
    },

    editProfile() {
      uni.navigateTo({ url: '/pages/profile/personal-info' })
    },

    changePhone() {
      uni.navigateTo({ url: '/pages/profile/change-phone' })
    },

    changePassword() {
      uni.navigateTo({ url: '/pages/profile/change-password' })
    },

    toggleSetting(key: string) {
      this.settings[key] = !this.settings[key]
      notification.updateSettings(key as any, this.settings[key])

      const settingName: Record<string, string> = {
        messageNotice: '消息通知',
        orderNotice: '新订单提醒',
        vibrateNotice: '震动提醒',
      }

      uni.showToast({
        title: `${this.settings[key] ? '已开启' : '已关闭'}${settingName[key] || '设置'}`,
        icon: 'none',
        duration: 1500,
      })
    },

    goToDeveloper() {
      uni.navigateTo({ url: '/pages/profile/developer' })
    },

    clearCache() {
      uni.showModal({
        title: '清除缓存',
        content: '将清理本地缓存数据，并保留登录态与通知设置，是否继续？',
        success: (res: any) => {
          if (!res.confirm) return

          const session = readRiderSession()
          const preservedEntries = readRoleSettingsStorageEntries(
            uni,
            RIDER_CACHE_PRESERVED_STORAGE_KEYS,
          )
          uni.clearStorageSync()
          if (session.token) {
            persistRiderAuthSession({
              uniApp: uni,
              token: session.token,
              refreshToken: session.refreshToken || null,
              tokenExpiresAt: session.tokenExpiresAt || null,
              profile: session.profile,
              extraStorageValues: {
                riderId: session.accountId || null,
                riderName: session.profile?.name || session.profile?.nickname || null,
              },
            })
          }
          restoreRoleSettingsStorageEntries(uni, preservedEntries)
          this.loadNotificationSettings()
          this.calculateCacheSize()
          uni.showToast({ title: '缓存已清除', icon: 'success' })
        },
      })
    },

    showAbout() {
      uni.showModal({
        title: '关于骑手端',
        content: this.aboutSummary || `${this.supportChatTitle}正在为骑手提供履约和服务支持。`,
        showCancel: false,
      })
    },

    handleLogout() {
      uni.showModal({
        title: '退出登录',
        content: '确认退出当前骑手账号？',
        success: async (res: any) => {
          if (!res.confirm) return

          try {
            await updateRiderStatus(false)
          } catch (_err) {}

          try {
            await unregisterCurrentPushDevice()
          } catch (_err) {
            clearPushRegistrationState()
          }

          clearRiderAuthSession({
            uniApp: uni,
            extraStorageKeys: [
              'socket_token',
              'socket_token_account_key',
              'notification_settings',
              'rider_push_registration',
            ],
          })
          clearPushRegistrationState()
          uni.showToast({
            title: '已退出登录',
            icon: 'success',
          })

          setTimeout(() => {
            uni.reLaunch({ url: '/pages/login/index' })
          }, 500)
        },
      })
    },
  },
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
