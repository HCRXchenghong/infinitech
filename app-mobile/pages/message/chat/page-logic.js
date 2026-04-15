import createSocket from '@/utils/socket-io'
import config from '@/shared-ui/config'
import {
  fetchHistory,
  markConversationRead,
  readAuthorizationHeader,
  reverseGeocode,
  uploadCommonAsset,
  upsertConversation,
} from '@/shared-ui/api.js'
import { pickFirstDefined } from '@/shared-ui/foundation/safe.js'
import { playMessageNotificationSound } from '@/shared-ui/notification-sound.js'
import {
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
} from '@/shared-ui/support-runtime.js'
import { createMessageChatPage } from '../../../../shared/mobile-common/message-chat-page.js'

export default createMessageChatPage({
  createSocket,
  config,
  fetchHistory,
  markConversationRead,
  readAuthorizationHeader,
  reverseGeocode,
  uploadCommonAsset,
  upsertConversation,
  pickFirstDefined,
  playMessageNotificationSound,
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
})
