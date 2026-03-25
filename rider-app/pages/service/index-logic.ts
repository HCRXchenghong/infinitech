
import Vue from 'vue'
import config from '@/shared-ui/config'
import { loadSupportRuntimeSettings } from '@/shared-ui/support-runtime'
import { serviceDataMethods } from './service-data-methods'
import { db } from '@/utils/database'
import messageManager from '@/utils/message-manager'
import OrderDetailPopup from '../../components/OrderDetailPopup.vue'

export default Vue.extend({
  components: {
    OrderDetailPopup
  },
  data() {
    return {
      statusBarHeight: 44,
      inputText: '',
      messages: [] as any[],
      scrollToView: '',
      riderId: '',
      riderName: '骑手',
      avatarUrl: '',
      chatId: 'rider_default',
      chatRole: 'admin',
      supportChatTitle: '平台客服',
      chatTitle: '平台客服',
      otherAvatar: '/static/images/logo.png',
      showOrderPicker: false,
      showMenu: false,
      recentOrders: [] as any[],
      showOrderDetailPopup: false,
      currentOrderDetail: null as any,
      loadRetryTimer: null as any,
      loadRetryCount: 0,
      maxLoadRetry: 20
    }
  },
  onLoad(options: any = {}) {
    const systemInfo = uni.getSystemInfoSync()
    this.statusBarHeight = systemInfo.statusBarHeight || 44

    const riderId = uni.getStorageSync('riderId')
    if (riderId !== undefined && riderId !== null && riderId !== '') {
      this.riderId = String(riderId)
      this.chatId = this.riderId
    }
    const queryChatId = options.chatId || options.id
    if (queryChatId !== undefined && queryChatId !== null && queryChatId !== '') {
      this.chatId = String(queryChatId).trim()
    }
    if (!this.chatId) {
      this.chatId = this.riderId || 'rider_default'
    }

    const queryRole = options.role ? String(options.role).toLowerCase() : ''
    this.chatRole = queryRole || this.inferRoleByChatId(this.chatId)

    const queryName = options.name ? this.safeDecode(options.name) : ''
    this.chatTitle = queryName || this.inferTitleByRole(this.chatRole)
    void this.loadSupportRuntimeConfig(!queryName)

    if (options.avatar) {
      this.otherAvatar = this.safeDecode(options.avatar)
    } else {
      this.otherAvatar = this.defaultAvatarByRole(this.chatRole)
    }

    const riderName = uni.getStorageSync('riderName')
    if (riderName) this.riderName = riderName

    const profile = uni.getStorageSync('riderProfile')
    if (profile) {
      if (profile.avatar) this.avatarUrl = profile.avatar
      if (!riderName && (profile.name || profile.nickname)) {
        this.riderName = profile.name || profile.nickname
      }
    }

    this.initDatabase()
    this.loadRecentOrders()
    this.bindSocketEvents()
    this.requestLoadMessagesWithRetry()

    messageManager.setCurrentChatId(this.chatId)
  },
  onUnload() {
    messageManager.setCurrentChatId(null)
    this.stopLoadRetry()
    this.unbindSocketEvents()
  },
  onShow() {
    this.loadRecentOrders()
  },
  methods: {
    async loadSupportRuntimeConfig(overrideTitle = false) {
      const supportRuntime = await loadSupportRuntimeSettings()
      this.supportChatTitle = supportRuntime.title
      if (overrideTitle && this.chatRole === 'admin') {
        this.chatTitle = supportRuntime.title
      }
      if (typeof uni.setNavigationBarTitle === 'function' && this.chatRole === 'admin') {
        uni.setNavigationBarTitle({ title: this.supportChatTitle })
      }
    },

    async initDatabase() {
      try { await db.open() } catch (err) { /* ignore */ }
    },

    /**
     * 绑定来自 App.vue 全局 Socket 的事件
     */
    bindSocketEvents() {
      uni.$on('socket:new_message', this.onNewMessage)
      uni.$on('socket:messages_loaded', this.onMessagesLoaded)
      uni.$on('socket:message_sent', this.onMessageSent)
      uni.$on('socket:message_read', this.onMessageRead)
      uni.$on('socket:connected', this.onSocketConnected)
      uni.$on('socket:disconnected', this.onSocketDisconnected)
    },

    unbindSocketEvents() {
      uni.$off('socket:new_message', this.onNewMessage)
      uni.$off('socket:messages_loaded', this.onMessagesLoaded)
      uni.$off('socket:message_sent', this.onMessageSent)
      uni.$off('socket:message_read', this.onMessageRead)
      uni.$off('socket:connected', this.onSocketConnected)
      uni.$off('socket:disconnected', this.onSocketDisconnected)
    },

    /**
     * 通过 App.vue 的全局 socket 发送 emit
     */
    socketEmit(event: string, data: any) {
      const app = getApp()
      const vm = app && app.$vm
      const socket = vm && vm.socket
      if (socket && socket.connected) {
        socket.emit(event, data)
        return true
      }
      if (vm && typeof vm.tryConnectSocket === 'function') {
        vm.tryConnectSocket()
      }
      return false
    },

    requestLoadMessages() {
      this.ensureJoinChat()
      return this.socketEmit('load_messages', { chatId: this.chatId })
    },

    ensureJoinChat() {
      return this.socketEmit('join_chat', {
        chatId: this.chatId,
        userId: this.riderId,
        role: 'rider'
      })
    },

    safeDecode(value: any) {
      try {
        return decodeURIComponent(String(value || ''))
      } catch (err) {
        return String(value || '')
      }
    },

    requestLoadMessagesWithRetry() {
      const loaded = this.requestLoadMessages()
      if (!loaded) {
        this.startLoadRetry()
      }
    },

    startLoadRetry() {
      if (this.loadRetryTimer) return
      this.loadRetryCount = 0
      this.loadRetryTimer = setInterval(() => {
        this.loadRetryCount += 1
        const loaded = this.requestLoadMessages()
        if (loaded || this.loadRetryCount >= this.maxLoadRetry) {
          this.stopLoadRetry()
        }
      }, 800)
    },

    stopLoadRetry() {
      if (!this.loadRetryTimer) return
      clearInterval(this.loadRetryTimer)
      this.loadRetryTimer = null
      this.loadRetryCount = 0
    },

    onSocketConnected(payload: any) {
      if (payload && payload.namespace && payload.namespace !== 'support') return
      this.ensureJoinChat()
      this.requestLoadMessages()
      this.stopLoadRetry()
    },

    onSocketDisconnected(payload: any) {
      if (payload && payload.namespace && payload.namespace !== 'support') return
      this.startLoadRetry()
    },
    ...serviceDataMethods,

    onMessagesLoaded(payload: any) {
      if (!payload || String(payload.chatId) !== String(this.chatId)) return
      if (payload.messages) {
        this.messages = payload.messages.map((m: any) => {
          const senderId = m?.senderId != null ? String(m.senderId) : ''
          const isSelf = m.senderRole === 'rider' && senderId === String(this.riderId)
          return this.normalizeIncomingMessage(m, isSelf)
        })
        payload.messages.forEach((m: any) => {
          db.saveMessage(this.chatId, {
            id: String(m.id),
            chatId: this.chatId,
            sender: m.sender,
            senderId: m.senderId,
            content: m.content,
            messageType: m.messageType || 'text',
            timestamp: Date.now(),
            isSelf: m.senderRole === 'rider' ? 1 : 0,
            avatar: m.avatar || ''
          })
        })
        this.$nextTick(() => { this.scrollToBottom() })
      }
    },

    onNewMessage(payload: any) {
      if (!payload || String(payload.chatId) !== String(this.chatId)) return
      const senderId = payload?.senderId != null ? String(payload.senderId) : ''
      if (senderId !== String(this.riderId) || payload.senderRole !== 'rider') {
        this.messages.push(this.normalizeIncomingMessage(payload, false))
        db.saveMessage(this.chatId, {
          id: String(payload.id),
          chatId: this.chatId,
          sender: payload.sender,
          senderId: payload.senderId,
          content: payload.content,
          messageType: payload.messageType || 'text',
          timestamp: Date.now(),
          isSelf: 0,
          avatar: payload.avatar || ''
        })
        this.$nextTick(() => { this.scrollToBottom() })
      }
    },

    onMessageSent(data: any) {
      const msg = this.messages.find((m: any) => m.id === data.tempId)
      if (msg) {
        msg.id = data.messageId
        msg.status = 'sent'
      }
    },

    onMessageRead(data: any) {
      const msg = this.messages.find((m: any) => m.id === data.messageId)
      if (msg) msg.status = 'read'
    },

    resendMessage(msg: any) {
      msg.status = 'sending'
      const tempId = Date.now()
      msg.id = tempId
      const emitted = this.socketEmit('send_message', {
        chatId: this.chatId,
        senderId: this.riderId,
        senderRole: 'rider',
        type: 'support',
        messageType: msg.type,
        content: msg.type === 'order'
          ? JSON.stringify(msg.order || this.normalizeOrder(msg.content) || {})
          : msg.content,
        sender: this.riderName,
        avatar: this.avatarUrl,
        tempId
      })
      if (!emitted) {
        msg.status = 'failed'
        uni.showToast({ title: '客服连接中，请稍后重试', icon: 'none' })
        return
      }
      setTimeout(() => {
        if (msg.status === 'sending') msg.status = 'failed'
      }, 5000)
    },

    sendMessage() {
      if (!this.inputText.trim()) return

      const tempId = Date.now()
      const newMsg = {
        id: tempId,
        content: this.inputText,
        type: 'text',
        isSelf: true,
        status: 'sending'
      }
      this.messages.push(newMsg)

      const emitted = this.socketEmit('send_message', {
        chatId: this.chatId,
        senderId: this.riderId,
        senderRole: 'rider',
        type: 'support',
        messageType: 'text',
        content: this.inputText,
        sender: this.riderName,
        avatar: this.avatarUrl,
        tempId
      })

      if (!emitted) {
        const msg = this.messages.find((m: any) => m.id === tempId)
        if (msg) msg.status = 'failed'
        uni.showToast({ title: '客服连接中，请稍后重试', icon: 'none' })
      } else {
        setTimeout(() => {
          const msg = this.messages.find((m: any) => m.id === tempId && m.status === 'sending')
          if (msg) msg.status = 'failed'
        }, 5000)
      }

      db.saveMessage(this.chatId, {
        id: String(newMsg.id),
        chatId: this.chatId,
        sender: this.riderName,
        senderId: this.riderId,
        content: this.inputText,
        messageType: 'text',
        timestamp: Date.now(),
        isSelf: 1,
        avatar: this.avatarUrl || ''
      })

      this.inputText = ''
      this.$nextTick(() => { this.scrollToBottom() })
    },

    chooseImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        success: (res: any) => {
          const tempFilePath = res.tempFilePaths[0]
          uni.showLoading({ title: '上传中...' })
          uni.uploadFile({
            url: config.SOCKET_URL + '/api/upload',
            filePath: tempFilePath,
            name: 'file',
            success: (uploadRes: any) => {
              uni.hideLoading()
              try {
                const data = JSON.parse(uploadRes.data)
                if (data.url) {
                  const tempId = Date.now()
                  const newMsg = { id: tempId, content: data.url, type: 'image', isSelf: true, status: 'sending' }
                  this.messages.push(newMsg)
                  const emitted = this.socketEmit('send_message', {
                    chatId: this.chatId,
                    senderId: this.riderId,
                    senderRole: 'rider',
                    type: 'support',
                    messageType: 'image',
                    content: data.url,
                    sender: this.riderName,
                    avatar: this.avatarUrl,
                    tempId
                  })
                  if (!emitted) {
                    const msg = this.messages.find((m: any) => m.id === tempId)
                    if (msg) msg.status = 'failed'
                    uni.showToast({ title: '客服连接中，请稍后重试', icon: 'none' })
                  } else {
                    setTimeout(() => {
                      const msg = this.messages.find((m: any) => m.id === tempId && m.status === 'sending')
                      if (msg) msg.status = 'failed'
                    }, 5000)
                  }
                  db.saveMessage(this.chatId, {
                    id: String(newMsg.id),
                    chatId: this.chatId,
                    sender: this.riderName,
                    senderId: this.riderId,
                    content: data.url,
                    messageType: 'image',
                    timestamp: Date.now(),
                    isSelf: 1,
                    avatar: this.avatarUrl || ''
                  })
                  this.$nextTick(() => { this.scrollToBottom() })
                }
              } catch (e) {
                uni.showToast({ title: '上传失败', icon: 'none' })
              }
            },
            fail: () => {
              uni.hideLoading()
              uni.showToast({ title: '上传失败', icon: 'none' })
            }
          })
        }
      })
    },

    sendOrder(order: any) {
      const normalizedOrder = this.normalizeOrder(order)
      if (!normalizedOrder || !normalizedOrder.id) {
        uni.showToast({ title: '订单信息异常', icon: 'none' })
        return
      }
      const tempId = Date.now()
      const newMsg = { id: tempId, content: '', type: 'order', isSelf: true, order: normalizedOrder, status: 'sending' }
      this.messages.push(newMsg)
      const emitted = this.socketEmit('send_message', {
        chatId: this.chatId,
        senderId: this.riderId,
        senderRole: 'rider',
        type: 'support',
        messageType: 'order',
        content: JSON.stringify(normalizedOrder),
        sender: this.riderName,
        avatar: this.avatarUrl,
        tempId
      })
      if (!emitted) {
        const msg = this.messages.find((m: any) => m.id === tempId)
        if (msg) msg.status = 'failed'
        uni.showToast({ title: '客服连接中，请稍后重试', icon: 'none' })
      } else {
        setTimeout(() => {
          const msg = this.messages.find((m: any) => m.id === tempId && m.status === 'sending')
          if (msg) msg.status = 'failed'
        }, 5000)
      }
      this.showOrderPicker = false
      this.$nextTick(() => { this.scrollToBottom() })
    },

    openOrderDetail(order: any) {
      const normalized = this.normalizeOrder(order)
      if (!normalized) {
        uni.showToast({ title: '订单信息不完整', icon: 'none' })
        return
      }
      this.currentOrderDetail = normalized
      this.showOrderDetailPopup = true
    },

    previewImage(url: string) {
      uni.previewImage({ urls: [url], current: url })
    },

    scrollToBottom() {
      if (this.messages.length > 0) {
        this.scrollToView = 'msg-' + this.messages[this.messages.length - 1].id
      }
    },

    goBack() {
      uni.navigateBack()
    },

    reportService() {
      this.showMenu = false
      uni.showModal({
        title: '举报客服',
        content: '确定要举报该客服吗？',
        success: (res: any) => {
          if (res.confirm) {
            uni.showToast({ title: '举报已提交', icon: 'success' })
          }
        }
      })
    },

    async clearMessages() {
      this.showMenu = false
      uni.showModal({
        title: '删除聊天记录',
        content: '确定要删除所有聊天记录吗？',
        success: async (res: any) => {
          if (res.confirm) {
            try {
              await db.deleteMessagesByChatId(this.chatId)
              this.messages = []
              uni.showToast({ title: '仅清除本地记录', icon: 'success' })
            } catch (err) {
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    }
  }
})
