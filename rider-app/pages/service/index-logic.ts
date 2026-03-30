
import Vue from 'vue'
import config from '@/shared-ui/config'
import { fetchHistory, markConversationRead, upsertConversation } from '@/shared-ui/api'
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
      targetId: '',
      orderId: '',
      chatRole: 'admin',
      supportChatTitle: '平台客服',
      chatTitle: '平台客服',
      otherAvatar: '/static/images/logo.png',
      showOrderPicker: false,
      showMenu: false,
      recentOrders: [] as any[],
      showOrderDetailPopup: false,
      currentOrderDetail: null as any,
      localMessageSeed: 0
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
    const queryTargetId = options.targetId || options.peerId
    if (queryTargetId !== undefined && queryTargetId !== null && queryTargetId !== '') {
      this.targetId = this.safeDecode(queryTargetId)
    }
    const queryOrderId = options.orderId || options.order_id
    if (queryOrderId !== undefined && queryOrderId !== null && queryOrderId !== '') {
      this.orderId = this.safeDecode(queryOrderId)
    }
    if (!this.chatId) {
      this.chatId = this.riderId || 'rider_default'
    }

    const queryRole = options.role ? String(options.role).toLowerCase() : ''
    this.chatRole = queryRole || this.inferRoleByChatId(this.chatId)

    const queryName = options.name ? this.safeDecode(options.name) : ''
    this.chatTitle = queryName || this.inferTitleByRole(this.chatRole)

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

    this.loadRecentOrders()
    this.bindSocketEvents()
    Promise.resolve(this.loadSupportRuntimeConfig(!queryName))
      .finally(async () => {
        await this.initDatabase()
        await this.ensureConversationExists()
        await this.loadServerHistory()
        this.ensureJoinChat()
      })

    messageManager.setCurrentChatId(this.chatId)
  },
  onUnload() {
    messageManager.setCurrentChatId(null)
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
      try {
        await db.open()
      } catch (err) {
        /* ignore */
      }
    },


    normalizeTargetType() {
      if (this.chatRole === 'user') return 'user'
      if (this.chatRole === 'merchant') return 'merchant'
      return 'admin'
    },

    buildConversationPayload() {
      return {
        chatId: this.chatId,
        targetType: this.normalizeTargetType(),
        targetId: this.targetId || (this.chatRole === 'admin' ? 'support' : ''),
        targetPhone: '',
        targetName: this.chatTitle || this.inferTitleByRole(this.chatRole),
        targetAvatar: this.otherAvatar || '',
        targetOrderId: this.orderId || ''
      }
    },

    normalizeHistoryMessages(list: any[] = []) {
      return list.map((item: any) => {
        const senderId = item?.senderId != null ? String(item.senderId) : ''
        const isSelf = item?.senderRole === 'rider' && senderId === String(this.riderId)
        return {
          ...this.normalizeIncomingMessage(item, isSelf),
          status: isSelf ? (item?.status || 'sent') : undefined
        }
      })
    },

    async replaceCachedHistory(list: any[] = []) {
      const historyWindow = Array.isArray(list) ? list.slice(-LOCAL_HISTORY_CACHE_LIMIT) : []
      const baseTimestamp = Date.now()
      await db.deleteMessagesByChatId(this.chatId)
      historyWindow.forEach((item: any, index: number) => {
        const senderId = item?.senderId != null ? String(item.senderId) : ''
        const messageTimestamp = this.resolveMessageTimestamp(item?.timestamp || item?.createdAt, baseTimestamp + index)
        db.saveMessage(this.chatId, {
          id: this.resolveMessageId(item, `history_${this.chatId}_${messageTimestamp}_${index}`),
          chatId: this.chatId,
          sender: item.sender,
          senderId: item.senderId,
          senderRole: item.senderRole,
          content: item.content,
          messageType: item.messageType || 'text',
          timestamp: messageTimestamp,
          isSelf: item.senderRole === 'rider' && senderId === String(this.riderId) ? 1 : 0,
          avatar: item.avatar || '',
          status: item.senderRole === 'rider' && senderId === String(this.riderId) ? (item.status || 'sent') : ''
        }, { skipPrune: true })
      })
      await db.pruneMessagesByChatId(this.chatId)
    },

    async ensureConversationExists() {
      try {
        await upsertConversation(this.buildConversationPayload())
      } catch (err) {
        console.error('[RiderService] 初始化服务端会话失败:', err)
      }
    },

    async syncReadState() {
      try {
        await markConversationRead(this.chatId)
      } catch (err) {
        console.error('[RiderService] 同步会话已读失败:', err)
      }
    },

    async loadServerHistory() {
      const hadServerHistory = this.messages.length > 0
      try {
        const response: any = await fetchHistory(this.chatId)
        const list = Array.isArray(response) ? response : []
        this.messages = this.normalizeHistoryMessages(list)
        this.$nextTick(() => { this.scrollToBottom() })
        await this.syncReadState()
      } catch (err) {
        if (hadServerHistory) {
          console.error('[RiderService] 加载服务端消息历史失败，保留当前服务端消�?', err)
          return
        }
        console.error('[RiderService] 加载服务端消息历史失�?', err)
      }
    },

    /**
     * 绑定来自 App.vue 全局 Socket 的事�?
     */
    bindSocketEvents() {
      uni.$on('socket:new_message', this.onNewMessage)
      uni.$on('socket:message_sent', this.onMessageSent)
      uni.$on('socket:message_read', this.onMessageRead)
      uni.$on('socket:all_messages_read', this.onAllMessagesRead)
      uni.$on('socket:connected', this.onSocketConnected)
      uni.$on('socket:disconnected', this.onSocketDisconnected)
    },

    unbindSocketEvents() {
      uni.$off('socket:new_message', this.onNewMessage)
      uni.$off('socket:message_sent', this.onMessageSent)
      uni.$off('socket:message_read', this.onMessageRead)
      uni.$off('socket:all_messages_read', this.onAllMessagesRead)
      uni.$off('socket:connected', this.onSocketConnected)
      uni.$off('socket:disconnected', this.onSocketDisconnected)
    },

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

    async switchChat(nextChatId: string | number, payload: any = {}) {
      const normalizedChatId = String(nextChatId || '').trim()
      if (!normalizedChatId) return

      this.chatId = normalizedChatId
      this.chatRole = payload.role ? String(payload.role).toLowerCase() : this.inferRoleByChatId(this.chatId)
      this.targetId = payload.targetId ? String(payload.targetId).trim() : ''
      this.orderId = payload.orderId ? String(payload.orderId).trim() : ''
      this.chatTitle = payload.name
        ? this.safeDecode(payload.name)
        : this.chatRole === 'admin'
          ? this.supportChatTitle
          : this.inferTitleByRole(this.chatRole)
      this.otherAvatar = payload.avatar
        ? this.safeDecode(payload.avatar)
        : this.defaultAvatarByRole(this.chatRole)
      this.messages = []

      if (typeof uni.setNavigationBarTitle === 'function') {
        uni.setNavigationBarTitle({
          title: this.chatRole === 'admin' ? this.supportChatTitle : this.chatTitle
        })
      }

      messageManager.setCurrentChatId(this.chatId)
      await this.initDatabase()
      await this.ensureConversationExists()
      await this.loadServerHistory()
      this.ensureJoinChat()
    },

    onSocketConnected(payload: any) {
      if (payload && payload.namespace && payload.namespace !== 'support') return
      this.ensureJoinChat()
      void this.loadServerHistory()
    },

    onSocketDisconnected(payload: any) {
      if (payload && payload.namespace && payload.namespace !== 'support') return
    },
    ...serviceDataMethods,

    onNewMessage(payload: any) {
      if (!payload || String(payload.chatId) !== String(this.chatId)) return
      const senderId = payload?.senderId != null ? String(payload.senderId) : ''
      if (senderId !== String(this.riderId) || payload.senderRole !== 'rider') {
        this.messages.push(this.normalizeIncomingMessage(payload, false))
        const messageTimestamp = this.resolveMessageTimestamp(payload?.timestamp || payload?.createdAt, Date.now())
        db.saveMessage(this.chatId, {
          id: this.resolveMessageId(payload, `incoming_${this.chatId}_${messageTimestamp}`),
          chatId: this.chatId,
          sender: payload.sender,
          senderId: payload.senderId,
          senderRole: payload.senderRole,
          content: payload.content,
          messageType: payload.messageType || 'text',
          timestamp: messageTimestamp,
          isSelf: 0,
          avatar: payload.avatar || '',
          status: payload.status || ''
        })
        this.$nextTick(() => { this.scrollToBottom() })
      }
      void this.syncReadState()
    },

    onMessageSent(data: any) {
      if (data?.chatId && String(data.chatId) !== String(this.chatId)) return
      const msg = this.messages.find((m: any) => m.id === data.tempId)
      const nextStatus = msg?.status === 'read' ? 'read' : 'sent'
      if (msg) {
        msg.id = data.messageId
        if (data.time) {
          msg.time = data.time
        }
        msg.timestamp = this.resolveMessageTimestamp(data?.timestamp || data?.createdAt, msg.timestamp || Date.now())
        msg.status = nextStatus
      }
      void db.updateMessage(this.chatId, data.tempId, {
        id: data.messageId || data.tempId,
        timestamp: data?.timestamp || data?.createdAt,
        status: nextStatus
      }).catch((err) => {
        console.error('[RiderService] 更新本地消息发送状态失�?', err)
      })
    },

    onMessageRead(data: any) {
      if (data?.chatId && String(data.chatId) !== String(this.chatId)) return
      const msg = this.messages.find((m: any) => m.id === data.messageId)
      if (msg) msg.status = 'read'
      void db.updateMessage(this.chatId, data.messageId, {
        status: 'read'
      }).catch((err) => {
        console.error('[RiderService] 更新本地消息已读状态失�?', err)
      })
    },

    onAllMessagesRead(data: any) {
      if (!data || String(data.chatId) !== String(this.chatId)) return

      const pendingUpdates: Promise<void>[] = []
      this.messages.forEach((msg: any) => {
        if (!msg?.self || msg.status === 'failed' || msg.status === 'read') return
        msg.status = 'read'
        const messageId = String(msg.id || '').trim()
        if (!messageId) return
        pendingUpdates.push(
          db.updateMessage(this.chatId, messageId, { status: 'read' }).catch((err) => {
            console.error('[RiderService] 批量更新本地消息已读状态失�?', err)
          })
        )
      })

      if (!pendingUpdates.length) return
      void Promise.allSettled(pendingUpdates)
    },

    buildOutgoingSocketPayload(messageType: string, content: any, tempId: number) {
      return {
        chatId: this.chatId,
        senderId: this.riderId,
        senderRole: 'rider',
        type: 'support',
        messageType,
        content,
        sender: this.riderName,
        avatar: this.avatarUrl,
        tempId,
        targetType: this.normalizeTargetType(),
        targetId: this.targetId || (this.chatRole === 'admin' ? 'support' : ''),
        targetName: this.chatTitle || this.inferTitleByRole(this.chatRole),
        targetAvatar: this.otherAvatar || ''
      }
    },

    resendMessage(msg: any) {
      const previousId = msg.id
      const resendTimestamp = Date.now()
      msg.status = 'sending'
      msg.timestamp = resendTimestamp
      const tempId = this.createLocalMessageId('resend', resendTimestamp)
      msg.id = tempId
      void db.updateMessage(this.chatId, previousId, {
        id: tempId,
        timestamp: resendTimestamp,
        status: 'sending'
      }).catch(() => {})
      const emitted = this.socketEmit(
        'send_message',
        this.buildOutgoingSocketPayload(
          msg.type,
          msg.type === 'order'
            ? JSON.stringify(msg.order || this.normalizeOrder(msg.content) || {})
            : msg.content,
          tempId
        )
      )
      if (!emitted) {
        msg.status = 'failed'
        void db.updateMessage(this.chatId, tempId, { status: 'failed' }).catch(() => {})
        uni.showToast({ title: '客服连接中，请稍后重�?, icon: 'none' })
        return
      }
      setTimeout(() => {
        if (msg.status === 'sending') {
          msg.status = 'failed'
          void db.updateMessage(this.chatId, tempId, { status: 'failed' }).catch(() => {})
        }
      }, 5000)
    },

    sendMessage() {
      if (!this.inputText.trim()) return

      const tempTimestamp = Date.now()
      const tempId = this.createLocalMessageId('send', tempTimestamp)
      const newMsg = {
        id: tempId,
        content: this.inputText,
        type: 'text',
        isSelf: true,
        status: 'sending'
      }
      this.messages.push(newMsg)

      const emitted = this.socketEmit(
        'send_message',
        this.buildOutgoingSocketPayload('text', this.inputText, tempId)
      )

      if (!emitted) {
        const msg = this.messages.find((m: any) => m.id === tempId)
        if (msg) msg.status = 'failed'
        void db.updateMessage(this.chatId, tempId, { status: 'failed' }).catch(() => {})
        uni.showToast({ title: '客服连接中，请稍后重�?, icon: 'none' })
      } else {
        setTimeout(() => {
          const msg = this.messages.find((m: any) => m.id === tempId && m.status === 'sending')
          if (msg) {
            msg.status = 'failed'
            void db.updateMessage(this.chatId, tempId, { status: 'failed' }).catch(() => {})
          }
        }, 5000)
      }

      db.saveMessage(this.chatId, {
        id: String(newMsg.id),
        chatId: this.chatId,
        sender: this.riderName,
        senderId: this.riderId,
        senderRole: 'rider',
        content: this.inputText,
        messageType: 'text',
        timestamp: tempTimestamp,
        isSelf: 1,
        avatar: this.avatarUrl || '',
        status: 'sending'
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
          uni.showLoading({ title: '上传�?..' })
          uni.uploadFile({
            url: config.SOCKET_URL + '/api/upload',
            filePath: tempFilePath,
            name: 'file',
            success: (uploadRes: any) => {
              uni.hideLoading()
              try {
                const data = JSON.parse(uploadRes.data)
                if (data.url) {
                  const messageTimestamp = Date.now()
                  const tempId = this.createLocalMessageId('image', messageTimestamp)
                  const newMsg = { id: tempId, content: data.url, type: 'image', isSelf: true, status: 'sending' }
                  this.messages.push(newMsg)
                  const emitted = this.socketEmit(
                    'send_message',
                    this.buildOutgoingSocketPayload('image', data.url, tempId)
                  )
                  if (!emitted) {
                    const msg = this.messages.find((m: any) => m.id === tempId)
                    if (msg) msg.status = 'failed'
                    void db.updateMessage(this.chatId, tempId, { status: 'failed' }).catch(() => {})
                    uni.showToast({ title: '客服连接中，请稍后重�?, icon: 'none' })
                  } else {
                    setTimeout(() => {
                      const msg = this.messages.find((m: any) => m.id === tempId && m.status === 'sending')
                      if (msg) {
                        msg.status = 'failed'
                        void db.updateMessage(this.chatId, tempId, { status: 'failed' }).catch(() => {})
                      }
                    }, 5000)
                  }
                  db.saveMessage(this.chatId, {
                    id: String(newMsg.id),
                    chatId: this.chatId,
                    sender: this.riderName,
                    senderId: this.riderId,
                    senderRole: 'rider',
                    content: data.url,
                    messageType: 'image',
                    timestamp: messageTimestamp,
                    isSelf: 1,
                    avatar: this.avatarUrl || '',
                    status: 'sending'
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
      const tempTimestamp = Date.now()
      const tempId = this.createLocalMessageId('order', tempTimestamp)
      const newMsg = { id: tempId, content: '', type: 'order', isSelf: true, order: normalizedOrder, status: 'sending' }
      this.messages.push(newMsg)
      const emitted = this.socketEmit(
        'send_message',
        this.buildOutgoingSocketPayload('order', JSON.stringify(normalizedOrder), tempId)
      )
      if (!emitted) {
        const msg = this.messages.find((m: any) => m.id === tempId)
        if (msg) msg.status = 'failed'
        void db.updateMessage(this.chatId, tempId, { status: 'failed' }).catch(() => {})
        uni.showToast({ title: '客服连接中，请稍后重�?, icon: 'none' })
      } else {
        setTimeout(() => {
          const msg = this.messages.find((m: any) => m.id === tempId && m.status === 'sending')
          if (msg) {
            msg.status = 'failed'
            void db.updateMessage(this.chatId, tempId, { status: 'failed' }).catch(() => {})
          }
        }, 5000)
      }
      db.saveMessage(this.chatId, {
        id: String(newMsg.id),
        chatId: this.chatId,
        sender: this.riderName,
        senderId: this.riderId,
        senderRole: 'rider',
        content: JSON.stringify(normalizedOrder),
        messageType: 'order',
        timestamp: tempTimestamp,
        isSelf: 1,
        avatar: this.avatarUrl || '',
        status: 'sending'
      })
      this.showOrderPicker = false
      this.$nextTick(() => { this.scrollToBottom() })
    },

    openOrderDetail(order: any) {
      const normalized = this.normalizeOrder(order)
      if (!normalized) {
        uni.showToast({ title: '订单信息不完�?, icon: 'none' })
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
        content: '当前请联系平台运营处理客服问题�?,
        showCancel: false
      })
    },

    async clearMessages() {
      this.showMenu = false
      uni.showModal({
        title: '删除聊天记录',
        content: '确定要删除当前会话的本地聊天记录吗？',
        success: async (res: any) => {
          if (res.confirm) {
            try {
              await db.deleteMessagesByChatId(this.chatId)
              this.messages = []
              uni.showToast({ title: '已清除本地记�?, icon: 'success' })
            } catch (err) {
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    }
  }
})
