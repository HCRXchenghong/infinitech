<script lang="ts">
import { defineComponent } from 'vue'

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
        return
      }

      if (!token || authMode !== 'merchant') {
        uni.reLaunch({
          url: '/pages/login/index'
        })
      }
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
