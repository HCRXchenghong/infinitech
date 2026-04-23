import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { resolveUploadAssetUrl } from '../../packages/contracts/src/http.js'
import { UPLOAD_DOMAINS } from '../../packages/contracts/src/upload.js'
import {
  clearCachedSocketToken as clearCachedSocketTokenCache,
  resolveSocketToken,
} from '../../packages/client-sdk/src/realtime-token.js'
import {
  buildRoleChatConversationPayload,
  buildRoleChatOutgoingPayload,
  createRoleChatLocalMessageId,
  formatRoleChatClockTime,
  normalizeRoleChatRole,
  resolveRoleChatMessageId,
  resolveRoleChatMessageTimestamp,
  safeDecodeRoleChatValue,
} from '../../packages/mobile-core/src/role-chat-portal.js'
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

const SOCKET_TOKEN_KEY = 'socket_token'
const SOCKET_TOKEN_ACCOUNT_KEY = 'socket_token_account_key'

type ChatRole = 'user' | 'rider' | 'admin'
type MessageStatus = 'sending' | 'sent' | 'read' | 'failed'

interface ViewMessage {
  mid: string
  self: boolean
  text: string
  type: string
  timestamp: number
  time: string
  status: MessageStatus
  officialIntervention: boolean
  interventionLabel: string
}

export function useMerchantChatPage() {
  const chatId = ref('')
  const chatRole = ref<ChatRole>('user')
  const chatTitle = ref('聊天')
  const supportTitle = ref(getCachedSupportRuntimeSettings().title)
  const draft = ref('')
  const orderId = ref('')
  const targetId = ref('')

  const merchantId = ref('')
  const merchantName = ref('商户')
  const merchantAvatar = ref('')

  const socket = ref<any>(null)
  const isConnected = ref(false)
  const reconnectTimer = ref<any>(null)

  const messages = ref<ViewMessage[]>([])
  const scrollIntoView = ref('')
  const localMessageSeed = ref(0)

  const navSubtitle = computed(() => {
    if (chatRole.value === 'admin') return `${supportTitle.value}会话`
    if (chatRole.value === 'rider') return orderId.value ? `订单 #${orderId.value}` : '骑手会话'
    return orderId.value ? `订单 #${orderId.value}` : '用户会话'
  })

  function createLocalMessageId(prefix = 'local', timestamp = Date.now()) {
    const result = createRoleChatLocalMessageId({
      prefix,
      timestamp,
      chatId: chatId.value,
      seed: localMessageSeed.value,
    })
    localMessageSeed.value = result.seed
    return result.id
  }

  function inferTitleByRole(role: ChatRole) {
    if (role === 'admin') return supportTitle.value
    if (role === 'rider') return '骑手会话'
    return '用户会话'
  }

  function normalizeTargetType() {
    if (chatRole.value === 'rider') return 'rider'
    if (chatRole.value === 'admin') return 'admin'
    return 'user'
  }

  function buildConversationPayload() {
    return buildRoleChatConversationPayload({
      chatId: chatId.value,
      targetType: normalizeTargetType(),
      role: chatRole.value,
      targetId: targetId.value,
      targetName: chatTitle.value || inferTitleByRole(chatRole.value),
      targetAvatar: '',
    })
  }

  async function loadSupportRuntimeConfig(updateChatTitle = false) {
    const supportRuntime = await loadSupportRuntimeSettings()
    supportTitle.value = supportRuntime.title
    if (updateChatTitle && chatRole.value === 'admin') {
      chatTitle.value = supportRuntime.title
    }
  }

  function displayText(message: ViewMessage) {
    if (message.type === 'order') return '[订单消息]'
    if (message.type === 'coupon') return '[优惠券]'
    if (message.type === 'location') return '[位置消息]'
    if (message.type === 'audio') return '[语音消息]'
    return message.text
  }

  function scrollToBottom() {
    if (!messages.value.length) return
    scrollIntoView.value = `msg-${messages.value[messages.value.length - 1].mid}`
  }

  function toViewMessage(raw: any): ViewMessage {
    const senderId = raw?.senderId != null ? String(raw.senderId) : ''
    const self = raw?.senderRole === 'merchant' && senderId === String(merchantId.value)
    const timestamp = resolveRoleChatMessageTimestamp(raw?.timestamp || raw?.createdAt, Date.now())

    return {
      mid: resolveRoleChatMessageId(raw, `history_${chatId.value || 'chat'}_${timestamp}`),
      self,
      text: String(raw?.content || ''),
      type: String(raw?.messageType || 'text'),
      timestamp,
      time: String(raw?.time || formatRoleChatClockTime(timestamp)),
      status: self ? 'sent' : 'read',
      officialIntervention: !!raw?.officialIntervention,
      interventionLabel: String(raw?.interventionLabel || '官方介入'),
    }
  }

  function normalizeHistoryMessages(list: any[]) {
    return (list || []).map((item: any) => toViewMessage(item))
  }

  async function ensureConversationExists() {
    try {
      await upsertConversation(buildConversationPayload())
    } catch (error) {
      console.error('初始化服务端会话失败:', error)
    }
  }

  async function syncReadState() {
    try {
      await markConversationRead(chatId.value)
    } catch (error) {
      console.error('同步会话已读失败:', error)
    }
  }

  async function loadServerHistory() {
    try {
      const response: any = await fetchHistory(chatId.value)
      const list = Array.isArray(response) ? response : []
      messages.value = normalizeHistoryMessages(list)
      scrollToBottom()
      await syncReadState()
    } catch (error) {
      console.error('加载服务端聊天记录失败:', error)
    }
  }

  function appendLocalMessage(self: boolean, content: string, type: string, status: MessageStatus = 'sending') {
    const timestamp = Date.now()
    const mid = createLocalMessageId('local', timestamp)
    messages.value.push({
      mid,
      self,
      text: content,
      type,
      timestamp,
      time: formatRoleChatClockTime(timestamp),
      status,
      officialIntervention: false,
      interventionLabel: '',
    })
    scrollToBottom()
    return mid
  }

  function updateLocalMessageStatus(messageId: unknown, status: Extract<MessageStatus, 'sent' | 'read' | 'failed'>) {
    const normalizedId = String(messageId || '').trim()
    if (!normalizedId) return false
    const target = messages.value.find((item) => item.mid === normalizedId)
    if (!target || target.status === status) return false
    target.status = status
    return true
  }

  function clearCachedSocketToken() {
    clearCachedSocketTokenRuntime()
  }

  function clearCachedSocketTokenRuntime() {
    clearCachedSocketTokenCache({
      uniApp: uni,
      tokenStorageKey: SOCKET_TOKEN_KEY,
      tokenAccountKeyStorageKey: SOCKET_TOKEN_ACCOUNT_KEY,
    })
  }

  async function fetchSocketToken() {
    const authHeader = readAuthorizationHeader()
    if (!authHeader.Authorization) {
      clearCachedSocketTokenRuntime()
      throw new Error('请先登录后再连接聊天')
    }

    return resolveSocketToken({
      uniApp: uni,
      userId: merchantId.value,
      role: 'merchant',
      socketUrl: config.SOCKET_URL,
      readAuthorizationHeader,
      tokenStorageKey: SOCKET_TOKEN_KEY,
      tokenAccountKeyStorageKey: SOCKET_TOKEN_ACCOUNT_KEY,
      missingAuthorizationMessage: '请先登录后再连接聊天',
      missingSocketUrlMessage: 'socket url is required',
      missingTokenMessage: '获取 socket token 失败',
    })
  }

  function scheduleReconnect() {
    if (reconnectTimer.value) return
    reconnectTimer.value = setTimeout(() => {
      reconnectTimer.value = null
      void initSocket()
    }, 3000)
  }

  function connectSocket(token: string) {
    if (socket.value) {
      socket.value.disconnect()
    }

    const sock = createSocket(config.SOCKET_URL, '/support', token).connect()

    sock.on('connect', () => {
      isConnected.value = true
      sock.emit('join_chat', {
        chatId: chatId.value,
        userId: merchantId.value,
        role: 'merchant',
      })
    })

    sock.on('new_message', (payload: any) => {
      if (!payload || String(payload.chatId) !== String(chatId.value)) return
      const normalized = toViewMessage(payload)
      if (normalized.self) return
      playMerchantMessageNotificationSound()
      messages.value.push(normalized)
      scrollToBottom()
      void syncReadState()
    })

    sock.on('message_sent', (payload: any) => {
      if (payload?.chatId && String(payload.chatId) !== String(chatId.value)) return
      const index = messages.value.findIndex((item) => item.mid === String(payload?.tempId || ''))
      if (index < 0) return

      messages.value[index].mid = String(payload?.messageId || messages.value[index].mid)
      messages.value[index].timestamp = resolveRoleChatMessageTimestamp(
        payload?.timestamp || payload?.createdAt,
        messages.value[index].timestamp || Date.now()
      )
      messages.value[index].time = String(payload?.time || formatRoleChatClockTime(messages.value[index].timestamp))
      if (messages.value[index].status !== 'read') {
        messages.value[index].status = 'sent'
      }
    })

    sock.on('message_read', (payload: any) => {
      if (payload?.chatId && String(payload.chatId) !== String(chatId.value)) return
      updateLocalMessageStatus(payload?.messageId, 'read')
    })

    sock.on('all_messages_read', (payload: any) => {
      if (payload?.chatId && String(payload.chatId) !== String(chatId.value)) return
      messages.value.forEach((item) => {
        if (item.self && item.status !== 'failed' && item.status !== 'read') {
          item.status = 'read'
        }
      })
    })

    sock.on('clear_messages_denied', () => {
      uni.showToast({ title: '聊天记录需按平台规则保留', icon: 'none' })
    })

    sock.on('disconnect', () => {
      isConnected.value = false
    })

    sock.on('connect_error', (error: any) => {
      isConnected.value = false
      if (/认证失败|auth/i.test(String(error?.message || ''))) {
        clearCachedSocketToken()
      }
      scheduleReconnect()
    })

    sock.on('auth_error', () => {
      isConnected.value = false
      clearCachedSocketToken()
      scheduleReconnect()
    })

    socket.value = sock
  }

  async function initSocket() {
    if (!merchantId.value || !chatId.value) return
    try {
      const token = await fetchSocketToken()
      connectSocket(token)
    } catch (error: any) {
      uni.showToast({ title: error?.message || '连接聊天失败', icon: 'none' })
    }
  }

  function queueSendTimeout(localMessageId: string) {
    setTimeout(() => {
      const target = messages.value.find((item) => item.mid === localMessageId)
      if (target && target.status === 'sending') {
        target.status = 'failed'
      }
    }, 5000)
  }

  function emitMessage(messageType: 'text' | 'image', content: string) {
    const localMessageId = appendLocalMessage(true, content, messageType)
    socket.value.emit(
      'send_message',
      buildRoleChatOutgoingPayload({
        chatId: chatId.value,
        targetType: normalizeTargetType(),
        role: chatRole.value,
        targetId: targetId.value,
        targetName: chatTitle.value || inferTitleByRole(chatRole.value),
        targetAvatar: '',
        senderId: merchantId.value,
        senderRole: 'merchant',
        sender: merchantName.value,
        avatar: merchantAvatar.value,
        messageType,
        content,
        tempId: localMessageId,
      }),
    )
    queueSendTimeout(localMessageId)
  }

  function sendText() {
    const content = String(draft.value || '').trim()
    if (!content) return
    if (!socket.value || !isConnected.value) {
      uni.showToast({ title: '连接中，请稍后重试', icon: 'none' })
      return
    }

    emitMessage('text', content)
    draft.value = ''
  }

  function chooseImage() {
    if (!socket.value || !isConnected.value) {
      uni.showToast({ title: '连接中，请稍后重试', icon: 'none' })
      return
    }

    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: (res: any) => {
        const tempFilePath = res?.tempFilePaths?.[0]
        if (!tempFilePath) return

        uni.showLoading({ title: '上传中...' })
        uploadImage(tempFilePath, {
          uploadDomain: UPLOAD_DOMAINS.CHAT_ATTACHMENT,
        })
          .then((payload: any) => {
            uni.hideLoading()
            const imageUrl = String(resolveUploadAssetUrl(payload) || '').trim()
            if (!imageUrl) {
              uni.showToast({ title: '图片发送失败', icon: 'none' })
              return
            }
            emitMessage('image', imageUrl)
          })
          .catch(() => {
            uni.hideLoading()
            uni.showToast({ title: '图片发送失败', icon: 'none' })
          })
      },
    })
  }

  function previewImage(url: string) {
    uni.previewImage({ urls: [url], current: url })
  }

  function clearLocalMessages() {
    messages.value = []
    uni.showToast({ title: '已清除当前设备记录', icon: 'none' })
  }

  function goBack() {
    uni.navigateBack()
  }

  onLoad((options: any = {}) => {
    const merchantAuth = readMerchantAuthIdentity({ uniApp: uni })
    const profile = getMerchantProfile() || merchantAuth.profile || {}
    merchantId.value = getMerchantId() || String(merchantAuth.merchantPhone || '')
    merchantName.value = String(merchantAuth.merchantName || '商户')
    merchantAvatar.value = String(profile.avatar || profile.logo || '')

    chatId.value = safeDecodeRoleChatValue(options.chatId || options.id || '')
    chatRole.value = normalizeRoleChatRole(options.role || 'user', {
      allowedRoles: ['user', 'rider', 'admin'],
    }) as ChatRole
    orderId.value = safeDecodeRoleChatValue(options.orderId || '')
    targetId.value = safeDecodeRoleChatValue(options.targetId || '')

    if (!chatId.value) {
      chatId.value = `merchant_${merchantId.value || 'default'}`
      chatRole.value = 'admin'
    }

    const explicitTitle = safeDecodeRoleChatValue(options.name || '')
    chatTitle.value = explicitTitle || inferTitleByRole(chatRole.value)

    void loadSupportRuntimeConfig(!explicitTitle).finally(async () => {
      await ensureConversationExists()
      await loadServerHistory()
      await initSocket()
    })
  })

  onUnload(() => {
    if (reconnectTimer.value) {
      clearTimeout(reconnectTimer.value)
      reconnectTimer.value = null
    }
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
  })

  return {
    chatTitle,
    navSubtitle,
    draft,
    messages,
    scrollIntoView,
    displayText,
    chooseImage,
    sendText,
    previewImage,
    clearLocalMessages,
    goBack,
  }
}
