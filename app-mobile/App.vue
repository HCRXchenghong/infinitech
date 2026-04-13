<template>
  <view class="app-root">
    <slot />
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import getSyncService from '@/shared-ui/sync'
import { configWizard } from '@/shared-ui/config-helper'
import config from '@/shared-ui/config'
import { setupRequestInterceptor, forceLogout, manualRefreshToken } from '@/shared-ui/request-interceptor'
import { checkAndClearCacheIfNeeded } from '@/shared-ui/cache-cleaner'
import { registerCurrentPushDevice, clearPushRegistrationState } from '@/shared-ui/push-registration'
import { startPushEventBridge } from '@/shared-ui/push-events'
import { connectCurrentRealtimeChannel, clearRealtimeState } from '@/shared-ui/realtime-notify'
import { ensureUserRTCInviteBridge, disconnectUserRTCInviteBridge } from '@/shared-ui/rtc-contact.js'
import { bindNotificationSoundBridge } from '@/shared-ui/notification-sound.js'

export default Vue.extend({
  onLaunch() {
    // 0. 检查版本并清除缓存（如果需要）
    checkAndClearCacheIfNeeded()
    void startPushEventBridge()
    bindNotificationSoundBridge()

    // 1. 安装请求拦截器（必须最先执行）
    setupRequestInterceptor()

    // 2. 验证登录状态
    this.validateAuth()

    // 开发环境自动检测配置（可选，如果配置不可用会自动尝试检测）
    // #ifdef APP-PLUS
    if (config.isDev) {
      // 异步执行，不阻塞启动
      configWizard().catch((_err: any) => {
        // config detection failed silently
      })
    }
    // #endif

    // 初始化同步服务（本地 SQLite + 增量同步）
    const syncService = getSyncService()
    syncService.init().then(() => {
      // sync service initialized
    }).catch((err: any) => {
      console.error('❌ 数据同步服务初始化失败:', err)
      // 初始化失败不影响使用，继续使用在线模式
    })
  },
  methods: {
    async syncPushRegistration() {
      const token = uni.getStorageSync('token')
      const authMode = uni.getStorageSync('authMode')

      if (!token || authMode !== 'user') {
        clearPushRegistrationState()
        return
      }

      try {
        await registerCurrentPushDevice()
      } catch (err) {
        console.error('[App] 推送设备注册失败:', err)
      }
    },

    async syncRTCInviteBridge() {
      const token = uni.getStorageSync('token')
      const authMode = uni.getStorageSync('authMode')

      if (!token || authMode !== 'user') {
        disconnectUserRTCInviteBridge()
        return
      }

      try {
        await ensureUserRTCInviteBridge()
      } catch (err) {
        console.error('[App] RTC invite bridge init failed:', err)
      }
    },

    async syncRealtimeNotifyBridge() {
      const token = uni.getStorageSync('token')
      const authMode = uni.getStorageSync('authMode')
      if (!token || authMode !== 'user') {
        clearRealtimeState()
        return
      }
      await connectCurrentRealtimeChannel()
    },

    async validateAuth() {
      const token = uni.getStorageSync('token')
      const refreshToken = uni.getStorageSync('refreshToken')
      const authMode = uni.getStorageSync('authMode')

      // 如果没有token或authMode，清除登录状态
      if (!token || !refreshToken || authMode !== 'user') {
        this.clearAuthData()
        return
      }

      // 尝试刷新 token（如果即将过期）
      const refreshed = await manualRefreshToken()
      if (!refreshed) {
        forceLogout()
        return
      }

      // 验证 token 是否有效（验证用户是否存在）
      try {
        const currentToken = uni.getStorageSync('token')
        const res = await uni.request({
          url: config.API_BASE_URL + '/api/auth/verify',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${currentToken}`
          }
        })

        const data = res.data as any
        if (res.statusCode !== 200 || !data || !data.valid) {
          // token无效或用户不存在，强制登出
          forceLogout()
        } else {
          // login state verified
          void this.syncPushRegistration()
          void this.syncRealtimeNotifyBridge()
          void this.syncRTCInviteBridge()
        }
      } catch (err) {
        console.error('❌ Token验证请求失败:', err)
        // 网络错误时不清除登录状态，允许离线使用
      }
    },
    clearAuthData() {
      uni.removeStorageSync('token')
      uni.removeStorageSync('refreshToken')
      uni.removeStorageSync('tokenExpiresAt')
      uni.removeStorageSync('userProfile')
      uni.removeStorageSync('authMode')
      clearPushRegistrationState()
      clearRealtimeState()
      disconnectUserRTCInviteBridge()
    }
  },
  onShow() {
    bindNotificationSoundBridge()
    void this.syncPushRegistration()
    void this.syncRealtimeNotifyBridge()
    void this.syncRTCInviteBridge()
  },
  onHide() {
  }
})
</script>

<style lang="scss">
.app-root {
  min-height: 100vh;
  background-color: #f4f4f4;
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI',
    'Helvetica Neue', Arial, 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* 全局：由于 pages.json 使用 navigationStyle=custom，页面内容需要避开系统状态栏 */
/* 标准导航栏高度：状态栏(20-44px) + 导航栏(44px) = 64-88px，我们统一使用 88px 确保安全 */
.page {
  box-sizing: border-box;
}

/* 普通页面（没有自定义 header 的）统一添加顶部间距 */
.page:not(.home):not(.shop-detail):not(.profile):not(.search):not(.welcome):not(.auth) {
  padding-top: 88px;
}

/* 有自定义 header 的页面，header 会延伸到状态栏下方，不需要额外 padding */
</style>
