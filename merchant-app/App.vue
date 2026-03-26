<script lang="ts">
import { defineComponent } from 'vue'
import { registerCurrentPushDevice, clearPushRegistrationState } from '@/shared-ui/push-registration'

export default defineComponent({
  onLaunch() {
    this.checkAuth()
  },
  onShow() {
    this.checkAuth()
  },
  onHide() {
  },
  methods: {
    async syncPushRegistration() {
      const token = uni.getStorageSync('token')
      const authMode = uni.getStorageSync('authMode')

      if (!token || authMode !== 'merchant') {
        clearPushRegistrationState()
        return
      }

      try {
        await registerCurrentPushDevice()
      } catch (err) {
        console.error('[MerchantApp] 推送设备注册失败:', err)
      }
    },

    checkAuth() {
      const token = uni.getStorageSync('token')
      const authMode = uni.getStorageSync('authMode')
      const publicRoutes = new Set([
        'pages/login/index',
        'pages/reset-password/index',
        'pages/set-password/index'
      ])

      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const route = currentPage ? currentPage.route : ''

      if (publicRoutes.has(route)) {
        if (!token || authMode !== 'merchant') {
          clearPushRegistrationState()
        } else {
          void this.syncPushRegistration()
        }
        return
      }

      if (!token || authMode !== 'merchant') {
        clearPushRegistrationState()
        uni.reLaunch({
          url: '/pages/login/index'
        })
        return
      }

      void this.syncPushRegistration()
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
