import createSocket from '@/utils/socket-io'
import config from '@/shared-ui/config'
import {
  fetchHistory,
  markConversationRead,
  readAuthorizationHeader,
  request,
  uploadCommonImage,
  upsertConversation,
} from '@/shared-ui/api.js'
import { playMessageNotificationSound } from '@/shared-ui/notification-sound.js'
import {
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
} from '@/shared-ui/support-runtime.js'
import OrderDetailPopup from '@/components/OrderDetailPopup.vue'
import { createCustomerServicePage } from '../../../../shared/mobile-common/customer-service-page.js'

export default createCustomerServicePage({
  createSocket,
  config,
  fetchHistory,
  markConversationRead,
  readAuthorizationHeader,
  request,
  uploadCommonImage,
  upsertConversation,
  playMessageNotificationSound,
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
  OrderDetailPopup,
})
