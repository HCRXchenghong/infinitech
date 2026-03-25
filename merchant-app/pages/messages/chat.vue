<template>
  <view class="page">
    <view class="nav">
      <text class="nav-btn" @tap="goBack">‹</text>
      <view class="nav-main">
        <text class="nav-title">{{ chatTitle }}</text>
        <text class="nav-sub">{{ navSubtitle }}</text>
      </view>
      <text class="nav-clear" @tap="clearLocalMessages">清空本地</text>
    </view>

    <scroll-view
      scroll-y
      class="msg-list"
      :scroll-into-view="scrollIntoView"
      :scroll-with-animation="true"
    >
      <view v-if="messages.length === 0" class="empty-tip">暂无消息，开始沟通吧</view>

      <view
        v-for="msg in messages"
        :key="msg.mid"
        :id="'msg-' + msg.mid"
        class="msg-row"
        :class="{ self: msg.self }"
      >
        <view class="bubble">
          <view v-if="msg.officialIntervention" class="official-tag">
            {{ msg.interventionLabel || '官方介入' }}
          </view>
          <image
            v-if="msg.type === 'image'"
            :src="msg.text"
            mode="widthFix"
            class="bubble-image"
            @tap="previewImage(msg.text)"
          />
          <text v-else class="bubble-text">{{ displayText(msg) }}</text>
        </view>
        <text class="msg-time">{{ msg.time }}</text>
      </view>
    </scroll-view>

    <view class="composer">
      <view class="tool-btn" @tap="chooseImage">图片</view>
      <input
        v-model="draft"
        class="composer-input"
        placeholder="输入消息..."
        confirm-type="send"
        @confirm="sendText"
      />
      <view class="send-btn" :class="{ active: !!draft.trim() }" @tap="sendText">发送</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import createSocket from '@/utils/socket-io'
import config from '@/shared-ui/config'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from '@/shared-ui/support-runtime'
import { getMerchantId, getMerchantProfile } from '@/shared-ui/merchantContext'

type ChatRole = 'user' | 'rider' | 'admin'

interface ViewMessage {
  mid: string
  self: boolean
  text: string
  type: string
  time: string
  status: 'sending' | 'sent' | 'failed'
  officialIntervention: boolean
  interventionLabel: string
}

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

const navSubtitle = computed(() => {
  if (chatRole.value === 'admin') return `${supportTitle.value}会话`
  if (chatRole.value === 'rider') return orderId.value ? `订单#${orderId.value}` : '骑手会话'
  return orderId.value ? `订单#${orderId.value}` : '用户会话'
})

function safeDecode(value: any) {
  try {
    return decodeURIComponent(String(value || ''))
  } catch (err) {
    return String(value || '')
  }
}

function nowClock() {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function normalizeRole(raw: any): ChatRole {
  const role = String(raw || '').toLowerCase()
  if (role === 'rider') return 'rider'
  if (role === 'admin' || role === 'support' || role === 'cs') return 'admin'
  return 'user'
}

function inferTitleByRole(role: ChatRole) {
  if (role === 'admin') return supportTitle.value
  if (role === 'rider') return '骑手会话'
  return '用户会话'
}

async function loadSupportRuntimeConfig(updateChatTitle = false) {
  const supportRuntime = await loadSupportRuntimeSettings()
  supportTitle.value = supportRuntime.title
  if (updateChatTitle && chatRole.value === 'admin') {
    chatTitle.value = supportRuntime.title
  }
}

function displayText(msg: ViewMessage) {
  if (msg.type === 'order') return '[订单消息]'
  if (msg.type === 'coupon') return '[优惠券]'
  return msg.text
}

function localMessageKey() {
  return `merchant_chat_messages_${merchantId.value || 'guest'}_${chatId.value || 'default'}`
}

function restoreLocalMessages() {
  try {
    const raw = uni.getStorageSync(localMessageKey())
    const list = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []
    if (Array.isArray(list)) {
      messages.value = list
      scrollToBottom()
    }
  } catch (err) {
    messages.value = []
  }
}

function persistLocalMessages() {
  try {
    uni.setStorageSync(localMessageKey(), JSON.stringify(messages.value.slice(-300)))
  } catch (err) {
    // ignore
  }
}

function scrollToBottom() {
  if (!messages.value.length) return
  scrollIntoView.value = `msg-${messages.value[messages.value.length - 1].mid}`
}

function toViewMessage(raw: any): ViewMessage {
  const senderId = raw?.senderId != null ? String(raw.senderId) : ''
  const self = raw?.senderRole === 'merchant' && senderId === String(merchantId.value)
  return {
    mid: String(raw?.id || `${Date.now()}_${Math.random()}`),
    self,
    text: String(raw?.content || ''),
    type: String(raw?.messageType || 'text'),
    time: String(raw?.time || nowClock()),
    status: 'sent',
    officialIntervention: !!raw?.officialIntervention,
    interventionLabel: String(raw?.interventionLabel || '官方介入')
  }
}

function appendLocalMessage(
  self: boolean,
  content: string,
  type: string,
  status: 'sending' | 'sent' | 'failed' = 'sending'
) {
  const mid = `${Date.now()}_${Math.floor(Math.random() * 1000)}`
  messages.value.push({
    mid,
    self,
    text: content,
    type,
    time: nowClock(),
    status,
    officialIntervention: false,
    interventionLabel: ''
  })
  persistLocalMessages()
  scrollToBottom()
  return mid
}

function buildSocketAuthHeader() {
  const token = String(uni.getStorageSync('token') || '').trim()
  if (!token) return {}
  return {
    Authorization: /^bearer\s+/i.test(token) ? token : `Bearer ${token}`
  }
}

async function fetchSocketToken() {
  let token = uni.getStorageSync('socket_token')
  if (token) return String(token)

  const authHeader = buildSocketAuthHeader()
  if (!authHeader.Authorization) {
    throw new Error('请先登录后再连接聊天')
  }

  const res: any = await new Promise((resolve, reject) => {
    uni.request({
      url: `${config.SOCKET_URL}/api/generate-token`,
      method: 'POST',
      header: Object.assign(
        { 'Content-Type': 'application/json' },
        authHeader
      ),
      data: { userId: merchantId.value, role: 'merchant' },
      success: resolve,
      fail: reject
    })
  })

  const payload = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  token = payload?.token || ''
  if (!token) throw new Error('获取 socket token 失败')
  uni.setStorageSync('socket_token', token)
  return String(token)
}

function connectSocket(token: string) {
  if (socket.value) socket.value.disconnect()

  const sock = createSocket(config.SOCKET_URL, '/support', token).connect()

  sock.on('connect', () => {
    isConnected.value = true
    sock.emit('join_chat', {
      chatId: chatId.value,
      userId: merchantId.value,
      role: 'merchant'
    })
    sock.emit('load_messages', { chatId: chatId.value })
  })

  sock.on('messages_loaded', (payload: any) => {
    if (!payload || String(payload.chatId) !== String(chatId.value)) return
    const list = Array.isArray(payload.messages) ? payload.messages : []
    messages.value = list.map((item: any) => toViewMessage(item))
    persistLocalMessages()
    scrollToBottom()
  })

  sock.on('new_message', (payload: any) => {
    if (!payload || String(payload.chatId) !== String(chatId.value)) return
    const normalized = toViewMessage(payload)
    if (!normalized.self) {
      messages.value.push(normalized)
      persistLocalMessages()
      scrollToBottom()
    }
  })

  sock.on('message_sent', (payload: any) => {
    const index = messages.value.findIndex((item) => item.mid === String(payload?.tempId || ''))
    if (index < 0) return
    messages.value[index].mid = String(payload?.messageId || messages.value[index].mid)
    messages.value[index].status = 'sent'
    persistLocalMessages()
  })

  sock.on('clear_messages_denied', () => {
    uni.showToast({ title: '仅平台监管可彻底删除', icon: 'none' })
  })

  sock.on('disconnect', () => {
    isConnected.value = false
  })

  sock.on('connect_error', (err: any) => {
    isConnected.value = false
    if (/\u8ba4\u8bc1\u5931\u8d25/.test(String(err?.message || ''))) {
      uni.removeStorageSync('socket_token')
    }
    scheduleReconnect()
  })

  sock.on('auth_error', () => {
    isConnected.value = false
    uni.removeStorageSync('socket_token')
    scheduleReconnect()
  })

  socket.value = sock
}

async function initSocket() {
  if (!merchantId.value || !chatId.value) return
  try {
    const token = await fetchSocketToken()
    connectSocket(token)
  } catch (err: any) {
    uni.showToast({ title: err?.message || '连接聊天失败', icon: 'none' })
  }
}

function scheduleReconnect() {
  if (reconnectTimer.value) return
  reconnectTimer.value = setTimeout(() => {
    reconnectTimer.value = null
    initSocket()
  }, 3000)
}

function sendText() {
  const content = String(draft.value || '').trim()
  if (!content) return
  if (!socket.value || !isConnected.value) {
    uni.showToast({ title: '连接中，请稍后重试', icon: 'none' })
    return
  }

  const mid = appendLocalMessage(true, content, 'text')
  socket.value.emit('send_message', {
    chatId: chatId.value,
    senderId: merchantId.value,
    senderRole: 'merchant',
    sender: merchantName.value,
    avatar: merchantAvatar.value,
    messageType: 'text',
    content,
    tempId: mid
  })

  setTimeout(() => {
    const target = messages.value.find((item) => item.mid === mid)
    if (target && target.status === 'sending') target.status = 'failed'
  }, 5000)

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
      uni.uploadFile({
        url: `${config.SOCKET_URL}/api/upload`,
        filePath: tempFilePath,
        name: 'file',
        success: (uploadRes: any) => {
          uni.hideLoading()
          try {
            const payload = JSON.parse(uploadRes?.data || '{}')
            const imageUrl = String(payload?.url || '')
            if (!imageUrl) throw new Error('invalid image url')

            const mid = appendLocalMessage(true, imageUrl, 'image')
            socket.value.emit('send_message', {
              chatId: chatId.value,
              senderId: merchantId.value,
              senderRole: 'merchant',
              sender: merchantName.value,
              avatar: merchantAvatar.value,
              messageType: 'image',
              content: imageUrl,
              tempId: mid
            })

            setTimeout(() => {
              const target = messages.value.find((item) => item.mid === mid)
              if (target && target.status === 'sending') target.status = 'failed'
            }, 5000)
          } catch (err) {
            uni.showToast({ title: '图片发送失败', icon: 'none' })
          }
        },
        fail: () => {
          uni.hideLoading()
          uni.showToast({ title: '图片发送失败', icon: 'none' })
        }
      })
    }
  })
}

function previewImage(url: string) {
  uni.previewImage({ urls: [url], current: url })
}

function clearLocalMessages() {
  messages.value = []
  persistLocalMessages()
  uni.showToast({ title: '仅清除本地记录', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}

onLoad((options: any = {}) => {
  const profile = getMerchantProfile() || {}
  merchantId.value = getMerchantId() || String(profile.phone || uni.getStorageSync('merchantId') || '')
  merchantName.value = String(profile.name || profile.nickname || profile.shopName || '商户')
  merchantAvatar.value = String(profile.avatar || profile.logo || '')

  chatId.value = safeDecode(options.chatId || options.id || '')
  chatRole.value = normalizeRole(options.role || 'user')
  orderId.value = safeDecode(options.orderId || '')
  targetId.value = safeDecode(options.targetId || '')

  if (!chatId.value) {
    chatId.value = `merchant_${merchantId.value || 'default'}`
    chatRole.value = 'admin'
  }

  const explicitTitle = safeDecode(options.name || '')
  chatTitle.value = explicitTitle || inferTitleByRole(chatRole.value)
  void loadSupportRuntimeConfig(!explicitTitle)

  restoreLocalMessages()
  initSocket()
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
</script>

<style scoped lang="scss" src="./chat.scss"></style>
