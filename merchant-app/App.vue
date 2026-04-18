<script lang="ts">
import { defineComponent } from 'vue'
import { registerCurrentPushDevice, clearPushRegistrationState } from '@/shared-ui/push-registration'
import { startPushEventBridge } from '@/shared-ui/push-events'
import { connectCurrentRealtimeChannel, clearRealtimeState } from '@/shared-ui/realtime-notify'
import { bindNotificationSoundBridge } from '@/shared-ui/notification-sound'
import { ensureRoleAuthSession } from '../packages/client-sdk/src/role-auth-session.js'

const MERCHANT_AUTH_SESSION_OPTIONS = Object.freeze({
  role: 'merchant',
  profileStorageKey: 'merchantProfile',
  allowLegacyAuthModeFallback: true,
  idSources: ['profile:id', 'profile:role_id', 'profile:userId', 'profile:user_id'],
})

function readMerchantSession() {
  return ensureRoleAuthSession({
    uniApp: uni,
    ...MERCHANT_AUTH_SESSION_OPTIONS,
  })
}

export default defineComponent({
  onLaunch() {
    void startPushEventBridge()
    bindNotificationSoundBridge()
    this.checkAuth()
  },
  onShow() {
    bindNotificationSoundBridge()
    this.checkAuth()
  },
  onHide() {
  },
  methods: {
    async syncPushRegistration() {
      const session = readMerchantSession()
      if (!session.isAuthenticated) {
        clearPushRegistrationState()
        return
      }

      try {
        await registerCurrentPushDevice()
      } catch (err) {
        console.error('[MerchantApp] 推送设备注册失败:', err)
      }
    },

    async syncRealtimeNotifyBridge() {
      const session = readMerchantSession()
      if (!session.isAuthenticated) {
        clearRealtimeState()
        return
      }
      await connectCurrentRealtimeChannel()
    },

    checkAuth() {
      const session = readMerchantSession()
      const publicRoutes = new Set([
        'pages/login/index',
        'pages/reset-password/index',
        'pages/set-password/index'
      ])

      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const route = currentPage ? currentPage.route : ''

      if (publicRoutes.has(route)) {
        if (!session.isAuthenticated) {
          clearPushRegistrationState()
          clearRealtimeState()
        } else {
          void this.syncPushRegistration()
          void this.syncRealtimeNotifyBridge()
        }
        return
      }

      if (!session.isAuthenticated) {
        clearPushRegistrationState()
        clearRealtimeState()
        uni.reLaunch({
          url: '/pages/login/index'
        })
        return
      }

      void this.syncPushRegistration()
      void this.syncRealtimeNotifyBridge()
    }
  }
})
</script>

<style lang="scss">
page {
  background-color: #f3f4f6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
}
</style>
