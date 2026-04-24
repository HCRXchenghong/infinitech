import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import createSocket from '@/utils/socket-io'
import config from '@/shared-ui/config'
import {
  fetchHistory,
  markConversationRead,
  readAuthorizationHeader,
  upsertConversation,
  uploadImage,
} from '@/shared-ui/api'
import {
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
} from '@/shared-ui/support-runtime'
import { readMerchantAuthIdentity } from '@/shared-ui/auth-session.js'
import { getMerchantId, getMerchantProfile } from '@/shared-ui/merchantContext'
import { playMerchantMessageNotificationSound } from '@/shared-ui/notification-sound'
import { createMerchantChatPage } from '../../packages/mobile-core/src/merchant-chat-page.js'

export function useMerchantChatPage() {
  return createMerchantChatPage({
    refImpl: ref,
    computedImpl: computed,
    onLoadImpl: onLoad,
    onUnloadImpl: onUnload,
    createSocket,
    config,
    fetchHistory,
    markConversationRead,
    readAuthorizationHeader,
    upsertConversation,
    uploadImage,
    getCachedSupportRuntimeSettings,
    loadSupportRuntimeSettings,
    readMerchantAuthIdentity,
    getMerchantId,
    getMerchantProfile,
    playMerchantMessageNotificationSound,
    uniApp: uni,
  })
}
