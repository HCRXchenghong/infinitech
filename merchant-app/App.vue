<script lang="ts">
import { defineComponent } from 'vue'
import { registerCurrentPushDevice, clearPushRegistrationState } from '@/shared-ui/push-registration'
import { startPushEventBridge } from '@/shared-ui/push-events'
import { connectCurrentRealtimeChannel, clearRealtimeState } from '@/shared-ui/realtime-notify'
import { bindNotificationSoundBridge } from '@/shared-ui/notification-sound'
import { ensureMerchantAuthSession } from '@/shared-ui/auth-session.js'
import { createRoleAppRootLifecycle } from '../packages/mobile-core/src/role-app-shell.js'

function readMerchantSession() {
  return ensureMerchantAuthSession({ uniApp: uni })
}

export default defineComponent(createRoleAppRootLifecycle({
  readSession: readMerchantSession,
  startPushEventBridge,
  bindNotificationSoundBridge,
  publicRoutes: [
    'pages/login/index',
    'pages/reset-password/index',
    'pages/set-password/index'
  ],
  loginRoute: '/pages/login/index',
  uniApp: uni,
  loggerTag: 'MerchantApp',
  async syncAuthenticatedState() {
    await registerCurrentPushDevice()
    await connectCurrentRealtimeChannel()
  },
  clearUnauthenticatedState() {
    clearPushRegistrationState()
    clearRealtimeState()
  }
}))
</script>

<style lang="scss">
page {
  background-color: #f3f4f6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
}
</style>
