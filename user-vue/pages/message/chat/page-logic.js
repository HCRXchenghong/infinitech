import createSocket from '@/utils/socket-io'
import config from '@/shared-ui/config'
import {
  fetchHistory,
  markConversationRead,
  reverseGeocode,
  upsertConversation
} from '@/shared-ui/api.js'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from '@/shared-ui/support-runtime.js'

const DEFAULT_SELF_AVATAR = '/static/images/my-avatar.svg'
const DEFAULT_OTHER_AVATAR = '/static/images/default-avatar.svg'
const DEFAULT_EMOJIS = ['😀', '😁', '😂', '🤣', '😊', '😍', '👍', '👏', '🎉', '❤️', '🔥', '🙏', '😎', '😄', '😭', '💪', '✨', '🍔', '🍜', '☕']

const nowTime = () => {
  const d = new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

const formatClockByTimestamp = (timestamp) => {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return nowTime()
  const d = new Date(value)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value || '')
  } catch (err) {
    return value || ''
  }
}

const LOCATION_PATTERN = /^\[位置\]\s*(.+?)\s*\(([-\d.]+),\s*([-\d.]+)\)\s*$/

const safeParseJson = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (_err) {
    return null
  }
}

const formatAudioDuration = (value) => {
  const totalSeconds = Math.max(1, Math.round(Number(value || 0) || 0))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }
  return `${totalSeconds}"`
}

const normalizeLocationContent = (content) => {
  const parsed = safeParseJson(content)
  if (parsed) {
    const latitude = Number(parsed.latitude ?? parsed.lat)
    const longitude = Number(parsed.longitude ?? parsed.lng ?? parsed.lon)
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const address =
        String(parsed.address || parsed.name || '').trim() ||
        `${latitude.toFixed(6)},${longitude.toFixed(6)}`

      return {
        type: 'location',
        text: address,
        preview: '[位置]',
        rawContent: content,
        meta: {
          address,
          latitude,
          longitude
        }
      }
    }
  }

  const raw = String(content || '').trim()
  const match = raw.match(LOCATION_PATTERN)
  if (!match) return null

  const latitude = Number(match[2])
  const longitude = Number(match[3])
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const address =
    String(match[1] || '').trim() || `${latitude.toFixed(6)},${longitude.toFixed(6)}`

  return {
    type: 'location',
    text: address,
    preview: '[位置]',
    rawContent: content,
    meta: {
      address,
      latitude,
      longitude
    }
  }
}

const normalizeAudioContent = (content) => {
  const parsed = safeParseJson(content)
  if (!parsed) return null

  const url = String(parsed.url || parsed.audioUrl || parsed.src || '').trim()
  if (!url) return null

  const durationSeconds = Math.max(
    1,
    Math.round(
      Number(parsed.durationSeconds || parsed.duration || parsed.length || 0) || 0
    )
  )

  return {
    type: 'audio',
    text: '语音消息',
    preview: '[语音]',
    rawContent: content,
    meta: {
      url,
      durationSeconds,
      durationLabel: formatAudioDuration(durationSeconds)
    }
  }
}

const resolvePreviewText = (messageType, content) => {
  if (messageType === 'image') return '[图片]'
  if (messageType === 'order') return '[订单]'
  if (messageType === 'coupon') return '[优惠券]'
  if (messageType === 'audio') return '[语音]'
  if (messageType === 'location') return '[位置]'
  if (typeof content === 'object' && content) return '[消息]'
  return String(content || '').trim() || '[消息]'
}

const normalizeMessageContent = (messageType, content) => {
  if (messageType === 'image') {
    return {
      type: 'image',
      text: String(content || '').trim(),
      preview: '[图片]',
      rawContent: content,
      meta: null
    }
  }

  if (messageType === 'audio') {
    return normalizeAudioContent(content) || {
      type: 'text',
      text: String(content || '').trim(),
      preview: '[语音]',
      rawContent: content,
      meta: null
    }
  }

  if (messageType === 'location') {
    return normalizeLocationContent(content) || {
      type: 'text',
      text: String(content || '').trim(),
      preview: '[位置]',
      rawContent: content,
      meta: null
    }
  }

  const legacyLocation = normalizeLocationContent(content)
  if (legacyLocation) {
    return legacyLocation
  }

  return {
    type: 'text',
    text: String(content || '').trim(),
    preview: resolvePreviewText(messageType, content),
    rawContent: content,
    meta: null
  }
}

export default {
  data() {
    const supportRuntime = getCachedSupportRuntimeSettings()
    return {
      userId: '',
      userName: '用户',
      userAvatar: '',
      chatType: 'support',
      roomId: '',
      targetId: '',
      orderId: '',
      role: '',
      title: '聊天',
      otherAvatar: DEFAULT_OTHER_AVATAR,
      draft: '',
      messages: [],
      scrollInto: '',
      panelType: '',
      emojis: DEFAULT_EMOJIS,
      supportTitle: supportRuntime.title,
      supportWelcomeMessage: supportRuntime.welcomeMessage,
      merchantWelcomeMessage: supportRuntime.merchantWelcomeMessage,
      riderWelcomeMessage: supportRuntime.riderWelcomeMessage,
      hasExplicitTitle: false,
      historyFromLocalFallback: false,
      socket: null,
      isConnected: false,
      reconnectTimer: null,
      audioPlayer: null,
      playingAudioId: '',
      recorderManager: null,
      isRecordingVoice: false,
      recordingStartedAt: 0,
      discardNextRecording: false
    }
  },

  onLoad(query = {}) {
    this.chatType = query.chatType || 'support'
    this.roomId = safeDecode(query.roomId || query.id || 'user_default')
    this.targetId = safeDecode(query.targetId || '')
    this.orderId = safeDecode(query.orderId || '')
    this.role = query.role || ''
    const queryName = safeDecode(query.name || '')
    this.hasExplicitTitle = Boolean(queryName)
    this.title = queryName || this.getConversationTitle()
    if (query.avatar) {
      this.otherAvatar = safeDecode(query.avatar)
    }

    this.bootstrapProfile()
    this.initAudioPlayer()
    this.initRecorderManager()
    this.loadSupportRuntimeConfig()
      .finally(async () => {
        await this.ensureConversationExists()
        await this.loadServerHistory()
        this.initSocket()
        this.seedWelcomeMessage()
        this.$nextTick(() => this.scrollToBottom())
      })
  },

  onUnload() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.discardNextRecording = true
    if (this.isRecordingVoice && this.recorderManager) {
      try {
        this.recorderManager.stop()
      } catch (_err) {
      }
    }
    this.stopAudioPlayback()
    if (this.audioPlayer && this.audioPlayer.destroy) {
      this.audioPlayer.destroy()
      this.audioPlayer = null
    }
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  },

  methods: {
    async loadSupportRuntimeConfig() {
      const supportRuntime = await loadSupportRuntimeSettings()
      this.supportTitle = supportRuntime.title
      this.supportWelcomeMessage = supportRuntime.welcomeMessage
      this.merchantWelcomeMessage = supportRuntime.merchantWelcomeMessage
      this.riderWelcomeMessage = supportRuntime.riderWelcomeMessage

      if (!this.hasExplicitTitle && this.isSupportConversation()) {
        this.title = this.supportTitle
      }
    },

    isSupportConversation() {
      const role = String(this.role || '').toLowerCase()
      return this.chatType === 'support' || role === '' || role === 'cs' || role === 'support' || role === 'admin'
    },

    getConversationTitle() {
      const role = String(this.role || '').toLowerCase()
      if (role === 'rider') return '骑手'
      if (role === 'shop' || role === 'merchant') return '商家'
      return this.supportTitle
    },

    buildSocketAuthHeader() {
      const token = String(
        uni.getStorageSync('token') || uni.getStorageSync('access_token') || ''
      ).trim()
      if (!token) return {}
      return {
        Authorization: /^bearer\s+/i.test(token) ? token : `Bearer ${token}`
      }
    },

    bootstrapProfile() {
      const profile = uni.getStorageSync('userProfile') || {}
      const uid =
        profile.id ||
        profile.userId ||
        profile.phone ||
        uni.getStorageSync('userId') ||
        uni.getStorageSync('phone')

      if (uid) this.userId = String(uid)
      this.userName = profile.nickname || profile.name || '用户'
      this.userAvatar = profile.avatarUrl || DEFAULT_SELF_AVATAR

      if (!this.roomId) {
        this.roomId = this.userId || 'user_default'
      }
    },

    normalizeTargetType() {
      const role = String(this.role || '').toLowerCase()
      if (role === 'rider') return 'rider'
      if (role === 'shop' || role === 'merchant') return 'merchant'
      return 'admin'
    },

    buildConversationPayload() {
      return {
        chatId: this.roomId,
        targetType: this.normalizeTargetType(),
        targetId: this.targetId || (this.isSupportConversation() ? 'support' : ''),
        targetPhone: '',
        targetName: this.title || this.getConversationTitle(),
        targetAvatar: this.otherAvatar || ''
      }
    },

    seedWelcomeMessage() {
      if (this.messages.length > 0) return

      if (this.role === 'rider') {
        this.addMessage('other', this.riderWelcomeMessage, 'text', true)
        return
      }
      if (this.role === 'shop') {
        this.addMessage('other', this.merchantWelcomeMessage, 'text', true)
        return
      }
      this.addMessage('other', this.supportWelcomeMessage, 'text', true)
    },

    getMessageStorageKey() {
      return `user_chat_messages_${this.userId || 'guest'}_${this.roomId}`
    },

    resolveMessageTimestamp(rawValue, fallback = Date.now()) {
      const value = Number(rawValue)
      return Number.isFinite(value) && value > 0 ? value : fallback
    },

    restoreLocalMessages() {
      try {
        const raw = uni.getStorageSync(this.getMessageStorageKey())
        const parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []
        if (Array.isArray(parsed)) {
          this.messages = parsed.map((item, index) => {
            const normalized = normalizeMessageContent(
              item.type || 'text',
              Object.prototype.hasOwnProperty.call(item || {}, 'rawContent')
                ? item.rawContent
                : item.text
            )
            const timestamp = this.resolveMessageTimestamp(
              item.timestamp || item.createdAt,
              Date.now() + index
            )

            return {
              ...item,
              timestamp,
              time: item.time || formatClockByTimestamp(timestamp),
              type: normalized.type,
              text: normalized.text,
              rawContent: Object.prototype.hasOwnProperty.call(item || {}, 'rawContent')
                ? item.rawContent
                : normalized.rawContent,
              meta: item.meta || normalized.meta,
              previewText: item.previewText || normalized.preview
            }
          })
          return this.messages.length > 0
        }
      } catch (err) {
        console.error('恢复聊天缓存失败:', err)
      }
      return false
    },

    persistLocalMessages() {
      try {
        uni.setStorageSync(
          this.getMessageStorageKey(),
          JSON.stringify(this.messages.slice(-200))
        )
      } catch (err) {
        console.error('保存聊天缓存失败:', err)
      }
    },

    normalizeHistoryMessages(list = []) {
      return list.map((item, index) => {
        const isSelf =
          String(item.senderId || '') === String(this.userId) &&
          item.senderRole === 'user'
        const normalized = normalizeMessageContent(item.messageType || 'text', item.content)
        const timestamp = this.resolveMessageTimestamp(
          item.timestamp || item.createdAt,
          Date.now() + index
        )
        const time = item.time || formatClockByTimestamp(timestamp)
        const previousItem = index === 0 ? null : list[index - 1]
        const previousTimestamp = previousItem
          ? this.resolveMessageTimestamp(
              previousItem.timestamp || previousItem.createdAt,
              timestamp
            )
          : 0
        const previousTime = index === 0
          ? ''
          : (previousItem.time || formatClockByTimestamp(previousTimestamp))

        return {
          mid: item.id || `${Date.now()}_${index}`,
          from: isSelf ? 'me' : 'other',
          text: normalized.text,
          type: normalized.type,
          rawContent: normalized.rawContent,
          meta: normalized.meta,
          timestamp,
          time,
          showTime: index === 0 || previousTime !== time,
          status: isSelf ? item.status || 'success' : 'success',
          officialIntervention: !!item.officialIntervention,
          interventionLabel: item.interventionLabel || '官方介入',
          previewText: normalized.preview
        }
      })
    },

    async ensureConversationExists() {
      try {
        await upsertConversation(this.buildConversationPayload())
      } catch (err) {
        console.error('初始化服务端会话失败:', err)
      }
    },

    async syncReadState() {
      try {
        await markConversationRead(this.roomId)
      } catch (err) {
        console.error('同步会话已读失败:', err)
      }
    },

    async loadServerHistory() {
      try {
        const response = await fetchHistory(this.roomId)
        const list = Array.isArray(response) ? response : []
        this.messages = this.normalizeHistoryMessages(list)
        this.historyFromLocalFallback = false
        this.persistLocalMessages()
        await this.syncReadState()
      } catch (err) {
        console.error('加载服务端消息历史失败:', err)
        this.historyFromLocalFallback = this.restoreLocalMessages()
        this.$nextTick(() => this.scrollToBottom())
      }
    },

    async initSocket() {
      if (!this.userId) return

      let token = uni.getStorageSync('socket_token')
      if (!token) {
        try {
          const res = await new Promise((resolve, reject) => {
            uni.request({
              url: `${config.SOCKET_URL}/api/generate-token`,
              method: 'POST',
              header: Object.assign(
                { 'Content-Type': 'application/json' },
                this.buildSocketAuthHeader()
              ),
              data: { userId: this.userId, role: 'user' },
              success: resolve,
              fail: reject
            })
          })
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          token = data && data.token ? data.token : ''
          if (token) {
            uni.setStorageSync('socket_token', token)
          }
        } catch (err) {
          console.error('获取 socket token 失败:', err)
          return
        }
      }

      this.connectSocket(token)
    },

    connectSocket(token) {
      if (this.socket) {
        this.socket.disconnect()
      }

      const sock = createSocket(config.SOCKET_URL, '/support', token).connect()

      sock.on('connect', () => {
        this.isConnected = true
        sock.emit('join_chat', {
          chatId: this.roomId,
          userId: this.userId,
          role: 'user'
        })
      })

      sock.on('messages_loaded', (payload) => {
        if (!payload || String(payload.chatId) !== String(this.roomId)) return
        if (this.messages.length > 0 && !this.historyFromLocalFallback) return

        const list = Array.isArray(payload.messages) ? payload.messages : []
        this.messages = this.normalizeHistoryMessages(list)
        this.historyFromLocalFallback = false
        this.persistLocalMessages()
        this.syncReadState()
        this.$nextTick(() => this.scrollToBottom())
      })

      sock.on('new_message', (payload) => {
        if (!payload || String(payload.chatId) !== String(this.roomId)) return

        const isSelf =
          String(payload.senderId || '') === String(this.userId) &&
          payload.senderRole === 'user'

        if (!isSelf) {
          this.addMessage(
            'other',
            payload.content || '',
            payload.messageType || 'text',
            false,
            {
              timestamp: payload.timestamp || payload.createdAt,
              time: payload.time || '',
              officialIntervention: !!payload.officialIntervention,
              interventionLabel: payload.interventionLabel || '官方介入'
            }
          )
          this.syncReadState()
        }
      })

      sock.on('message_sent', (data) => {
        const msg = this.messages.find((item) => item.mid === data.tempId)
        if (msg) {
          msg.mid = data.messageId
          msg.timestamp = this.resolveMessageTimestamp(
            data.timestamp || data.createdAt,
            msg.timestamp || Date.now()
          )
          msg.time = data.time || formatClockByTimestamp(msg.timestamp)
          msg.status = 'success'
          this.persistLocalMessages()
        }
      })

      sock.on('clear_messages_denied', () => {
        uni.showToast({ title: '仅平台监管可彻底删除', icon: 'none' })
      })

      sock.on('disconnect', () => {
        this.isConnected = false
      })

      sock.on('connect_error', () => {
        this.isConnected = false
        this.scheduleReconnect()
      })

      sock.on('auth_error', () => {
        this.isConnected = false
        uni.removeStorageSync('socket_token')
        this.scheduleReconnect()
      })

      this.socket = sock
    },

    scheduleReconnect() {
      if (this.reconnectTimer) return
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.initSocket()
      }, 3000)
    },

    back() {
      uni.navigateBack()
    },

    showMore() {
      uni.showActionSheet({
        itemList: ['查看订单', '投诉', '清空聊天记录'],
        success: (res) => {
          if (res.tapIndex === 2) {
            this.messages = []
            this.persistLocalMessages()
          }
        }
      })
    },

    scrollToBottom() {
      if (!this.messages.length) return
      this.scrollInto = 'm-' + this.messages[this.messages.length - 1].mid
    },

    addMessage(from, text, type = 'text', showTime = false, extra = {}) {
      const mid = `${Date.now()}_${Math.floor(Math.random() * 1000)}`
      const normalized = normalizeMessageContent(type, text)
      const timestamp = this.resolveMessageTimestamp(extra.timestamp, Date.now())
      const time = extra.time || nowTime()
      this.messages.push({
        mid,
        from,
        text: normalized.text,
        type: normalized.type,
        rawContent: normalized.rawContent,
        meta: normalized.meta,
        timestamp,
        time,
        showTime,
        status: from === 'me' ? 'sending' : 'success',
        officialIntervention: !!extra.officialIntervention,
        interventionLabel: extra.interventionLabel || '',
        previewText: extra.previewText || normalized.preview
      })
      this.persistLocalMessages()
      this.$nextTick(() => this.scrollToBottom())
      return mid
    },

    previewText(payload) {
      const type = String(
        (payload && payload.messageType) || (payload && payload.type) || 'text'
      )
      return normalizeMessageContent(
        type,
        Object.prototype.hasOwnProperty.call(payload || {}, 'content')
          ? payload.content
          : (payload && payload.text) || ''
      ).preview
    },

    ensureSocketReady() {
      if (this.isConnected && this.socket) {
        return true
      }
      uni.showToast({ title: '连接中，请稍后重试', icon: 'none' })
      return false
    },

    scheduleSendStatusTimeout(msgId) {
      setTimeout(() => {
        const msg = this.messages.find((item) => item.mid === msgId)
        if (msg && msg.status === 'sending') {
          msg.status = 'failed'
          this.persistLocalMessages()
        }
      }, 5000)
    },

    emitChatMessage(messageType, content, previewText) {
      if (!this.ensureSocketReady()) return false

      const msgId = this.addMessage('me', content, messageType)
      this.socket.emit('send_message', {
        chatId: this.roomId,
        senderId: this.userId,
        senderRole: 'user',
        sender: this.userName,
        avatar: this.userAvatar,
        messageType,
        content,
        targetType: this.normalizeTargetType(),
        targetId: this.targetId || (this.isSupportConversation() ? 'support' : ''),
        targetPhone: '',
        targetName: this.title || this.getConversationTitle(),
        targetAvatar: this.otherAvatar || '',
        tempId: msgId
      })
      this.scheduleSendStatusTimeout(msgId)
      this.panelType = ''
      return true
    },

    send() {
      const text = String(this.draft || '').trim()
      if (!text) return
      if (!this.emitChatMessage('text', text, text)) return
      this.draft = ''
    },

    togglePanel(type) {
      this.panelType = this.panelType === type ? '' : type
      this.$nextTick(() => this.scrollToBottom())
    },

    closePanel() {
      this.panelType = ''
    },

    initAudioPlayer() {
      if (this.audioPlayer || typeof uni.createInnerAudioContext !== 'function') {
        return
      }

      const player = uni.createInnerAudioContext()
      player.obeyMuteSwitch = false
      player.onEnded(() => {
        this.playingAudioId = ''
      })
      player.onStop(() => {
        this.playingAudioId = ''
      })
      player.onError((err) => {
        console.error('播放语音失败:', err)
        this.playingAudioId = ''
        uni.showToast({ title: '语音播放失败', icon: 'none' })
      })
      this.audioPlayer = player
    },

    stopAudioPlayback() {
      if (this.audioPlayer && typeof this.audioPlayer.stop === 'function') {
        this.audioPlayer.stop()
      }
      this.playingAudioId = ''
    },

    initRecorderManager() {
      if (this.recorderManager || typeof uni.getRecorderManager !== 'function') {
        return
      }

      const manager = uni.getRecorderManager()
      manager.onStop((res = {}) => {
        const shouldDiscard = this.discardNextRecording
        this.discardNextRecording = false
        this.isRecordingVoice = false

        if (shouldDiscard) return

        const tempFilePath = String(res.tempFilePath || '').trim()
        const durationMs = Number(res.duration || 0) || (Date.now() - this.recordingStartedAt)
        const durationSeconds = Math.max(1, Math.round(durationMs / 1000))

        if (!tempFilePath) {
          uni.showToast({ title: '录音失败', icon: 'none' })
          return
        }
        if (durationSeconds < 1) {
          uni.showToast({ title: '录音时间太短', icon: 'none' })
          return
        }

        this.uploadAndSendAudio(tempFilePath, durationSeconds)
      })
      manager.onError((err) => {
        console.error('录音失败:', err)
        this.discardNextRecording = false
        this.isRecordingVoice = false
        uni.showToast({ title: '录音失败', icon: 'none' })
      })
      this.recorderManager = manager
    },

    toggleVoice() {
      if (!this.ensureSocketReady()) return
      if (typeof uni.getRecorderManager !== 'function') {
        uni.showToast({ title: '当前环境不支持录音', icon: 'none' })
        return
      }

      this.initRecorderManager()
      if (!this.recorderManager) {
        uni.showToast({ title: '录音服务不可用', icon: 'none' })
        return
      }

      if (this.isRecordingVoice) {
        this.recorderManager.stop()
        return
      }

      this.closePanel()
      this.recordingStartedAt = Date.now()
      this.discardNextRecording = false
      try {
        this.isRecordingVoice = true
        this.recorderManager.start({
          duration: 60000,
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 96000
        })
        uni.showToast({ title: '录音中，再点一次发送', icon: 'none' })
      } catch (err) {
        console.error('启动录音失败:', err)
        this.isRecordingVoice = false
        uni.showToast({ title: '录音启动失败', icon: 'none' })
      }
    },

    insertEmoji(emoji) {
      this.draft += emoji
    },

    uploadAndSendImage(tempFilePath) {
      if (!tempFilePath || !this.ensureSocketReady()) return

      uni.showLoading({ title: '上传中...' })
      uni.uploadFile({
        url: `${config.SOCKET_URL}/api/upload`,
        filePath: tempFilePath,
        name: 'file',
        success: (uploadRes) => {
          uni.hideLoading()
          try {
            const data =
              typeof uploadRes.data === 'string'
                ? JSON.parse(uploadRes.data || '{}')
                : (uploadRes.data || {})
            const imageUrl = data.url
            if (!imageUrl) throw new Error('invalid image url')
            this.emitChatMessage('image', imageUrl, '[图片]')
          } catch (err) {
            console.error('图片上传解析失败:', err)
            uni.showToast({ title: '图片发送失败', icon: 'none' })
          }
        },
        fail: () => {
          uni.hideLoading()
          uni.showToast({ title: '图片发送失败', icon: 'none' })
        }
      })
    },

    uploadAndSendAudio(tempFilePath, durationSeconds) {
      if (!tempFilePath || !this.ensureSocketReady()) return

      uni.showLoading({ title: '发送语音...' })
      uni.uploadFile({
        url: `${config.SOCKET_URL}/api/upload`,
        filePath: tempFilePath,
        name: 'file',
        success: (uploadRes) => {
          uni.hideLoading()
          try {
            const data =
              typeof uploadRes.data === 'string'
                ? JSON.parse(uploadRes.data || '{}')
                : (uploadRes.data || {})
            const audioUrl = String(data.url || '').trim()
            if (!audioUrl) throw new Error('invalid audio url')

            this.emitChatMessage(
              'audio',
              {
                url: audioUrl,
                durationSeconds,
                durationLabel: formatAudioDuration(durationSeconds)
              },
              '[语音]'
            )
          } catch (err) {
            console.error('语音上传解析失败:', err)
            uni.showToast({ title: '语音发送失败', icon: 'none' })
          }
        },
        fail: () => {
          uni.hideLoading()
          uni.showToast({ title: '语音发送失败', icon: 'none' })
        }
      })
    },

    chooseImage() {
      if (!this.ensureSocketReady()) return

      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths && res.tempFilePaths[0]
          this.uploadAndSendImage(tempFilePath)
        }
      })
    },

    takePhoto() {
      if (!this.ensureSocketReady()) return

      uni.chooseImage({
        count: 1,
        sourceType: ['camera'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths && res.tempFilePaths[0]
          this.uploadAndSendImage(tempFilePath)
        }
      })
    },

    async sendLocation() {
      if (!this.ensureSocketReady()) return

      uni.showLoading({ title: '定位中...' })
      try {
        const location = await new Promise((resolve, reject) => {
          uni.getLocation({
            type: 'gcj02',
            success: resolve,
            fail: reject
          })
        })

        const lat = Number(location.latitude)
        const lng = Number(location.longitude)
        const geo = await reverseGeocode(lat, lng)
        const address =
          String((geo && geo.address) || '').trim() || `${lat.toFixed(6)},${lng.toFixed(6)}`
        this.emitChatMessage(
          'location',
          {
            address,
            latitude: lat,
            longitude: lng
          },
          '[位置]'
        )
      } catch (err) {
        console.error('发送位置失败:', err)
        uni.showToast({ title: '位置发送失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    previewImage(url) {
      uni.previewImage({ urls: [url], current: url })
    },

    copyText(value, title = '已复制') {
      uni.setClipboardData({
        data: String(value || ''),
        success: () => {
          uni.showToast({ title, icon: 'none' })
        }
      })
    },

    openLocation(message) {
      const meta = message && message.meta
      const latitude = Number(meta && meta.latitude)
      const longitude = Number(meta && meta.longitude)
      const address = String((meta && meta.address) || (message && message.text) || '').trim()

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        this.copyText(address, '地址已复制')
        return
      }

      uni.openLocation({
        latitude,
        longitude,
        name: address || '位置消息',
        address,
        scale: 16,
        fail: () => {
          this.copyText(address, '地址已复制')
        }
      })
    },

    playAudio(message) {
      const audioMeta = message && message.meta
      const audioUrl = String((audioMeta && audioMeta.url) || '').trim()
      if (!audioUrl) {
        uni.showToast({ title: '语音地址无效', icon: 'none' })
        return
      }

      this.initAudioPlayer()
      if (!this.audioPlayer) {
        uni.showToast({ title: '当前环境不支持播放语音', icon: 'none' })
        return
      }

      if (this.playingAudioId === message.mid) {
        this.stopAudioPlayback()
        return
      }

      this.audioPlayer.stop()
      this.audioPlayer.src = audioUrl
      this.playingAudioId = message.mid
      this.audioPlayer.play()
    }
  }
}
