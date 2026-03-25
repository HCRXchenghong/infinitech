import createSocket from '@/utils/socket-io'
import config from '@/shared-ui/config'
import { request } from '@/shared-ui/api.js'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from '@/shared-ui/support-runtime.js'
import OrderDetailPopup from '@/components/OrderDetailPopup.vue'
import { normalizeIncomingMessage as normalizeIncomingMessagePayload, normalizeOrder as normalizeOrderPayload, formatOrderNo as formatOrderNoValue, formatOrderAmount as formatOrderAmountValue, getOrderStatusText as getOrderStatusTextValue } from './chat-utils'

export default {
  components: {
    OrderDetailPopup
  },
  data() {
    const supportRuntime = getCachedSupportRuntimeSettings()
    return {
      statusBarHeight: 44,
      inputText: '',
      messages: [],
      scrollToView: '',
      userId: '',
      userName: '用户',
      avatarUrl: '',
      chatId: 'user_default',
      showOrderPicker: false,
      showMenu: false,
      recentOrders: [],
      showOrderDetailPopup: false,
      currentOrderDetail: null,
      socket: null,
      isConnected: false,
      socketToken: '',
      socketInitializing: false,
      reconnectTimer: null,
      supportTitle: supportRuntime.title,
      supportWelcomeMessage: supportRuntime.welcomeMessage
    }
  },
  onLoad() {
    const systemInfo = uni.getSystemInfoSync()
    this.statusBarHeight = systemInfo.statusBarHeight || 44

    // 获取用户信息
    const userId = uni.getStorageSync('userId')
    if (userId) {
      this.userId = String(userId)
      this.chatId = this.userId
    }

    const profile = uni.getStorageSync('userProfile')
    if (profile) {
      if (!this.userId && (profile.id || profile.userId || profile.phone)) {
        this.userId = String(profile.id || profile.userId || profile.phone)
        this.chatId = this.userId
      }
      if (profile.nickname) this.userName = profile.nickname
      if (profile.name) this.userName = profile.name
      if (profile.avatarUrl) this.avatarUrl = profile.avatarUrl
    }
    if (!this.chatId) {
      this.chatId = this.userId || 'user_default'
    }

    // 加载最近订单
    this.loadRecentOrders()

    this.loadSupportRuntimeConfig()
      .finally(() => {
        this.addWelcomeMessage()
        this.initSocket()
      })
  },
  onUnload() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.disconnectSocket()
  },
  methods: {
    async loadSupportRuntimeConfig() {
      const supportRuntime = await loadSupportRuntimeSettings()
      this.supportTitle = supportRuntime.title
      this.supportWelcomeMessage = supportRuntime.welcomeMessage
      if (typeof uni.setNavigationBarTitle === 'function') {
        uni.setNavigationBarTitle({ title: this.supportTitle })
      }
    },

    buildSocketAuthHeader() {
      const token = String(uni.getStorageSync('token') || uni.getStorageSync('access_token') || '').trim()
      if (!token) {
        return {}
      }
      return {
        Authorization: /^bearer\s+/i.test(token) ? token : `Bearer ${token}`
      }
    },

    async initSocket() {
      if (this.socketInitializing) {
        return
      }
      if (!this.userId) {
        const profile = uni.getStorageSync('userProfile') || {}
        const fallbackUserId = profile.id || profile.userId || profile.phone || uni.getStorageSync('phone')
        if (fallbackUserId) {
          this.userId = String(fallbackUserId)
          this.chatId = this.userId
        }
      }
      if (!this.userId) {
        return
      }

      this.socketInitializing = true

      // 获取或生成 socket token
      let socketToken = uni.getStorageSync('socket_token')
      if (!socketToken) {
        try {
          const res = await new Promise((resolve, reject) => {
            uni.request({
              url: config.SOCKET_URL + '/api/generate-token',
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

          let resData = res.data
          if (typeof resData === 'string') {
            try { resData = JSON.parse(resData) } catch(e) {}
          }

          if (resData && resData.token) {
            socketToken = resData.token
            uni.setStorageSync('socket_token', socketToken)
          } else {
            console.error('获取 socket token 失败: 无 token 返回')
            uni.showToast({ title: '连接失败', icon: 'none' })
            this.socketInitializing = false
            return
          }
        } catch (e) {
          console.error('获取 socket token 失败:', e)
          uni.showToast({ title: '连接失败', icon: 'none' })
          this.socketInitializing = false
          return
        }
      }

      this.socketToken = socketToken
      this.connectSocket()
      this.socketInitializing = false
    },

    connectSocket() {
      if (this.socket) {
        this.socket.disconnect()
      }

      const sock = createSocket(config.SOCKET_URL, '/support', this.socketToken).connect()

      sock.on('connect', () => {
        this.isConnected = true

        // 加入聊天室
        sock.emit('join_chat', {
          chatId: this.chatId,
          userId: this.userId,
          role: 'user'
        })
      })

      sock.on('new_message', (payload) => {
        const senderId = payload?.senderId != null ? String(payload.senderId) : ''
        const isFromSelf = senderId === String(this.userId) && payload.senderRole === 'user'

        if (!isFromSelf) {
          this.messages.push(this.normalizeIncomingMessage(payload, false))
          this.$nextTick(() => {
            this.scrollToBottom()
          })
        }
      })

      sock.on('messages_loaded', (payload) => {
        if (payload && payload.messages) {
          this.messages = payload.messages.map((m) =>
            this.normalizeIncomingMessage(m, m.senderRole === 'user')
          )
          this.$nextTick(() => {
            this.scrollToBottom()
          })
        }
      })

      sock.on('message_sent', (data) => {
        const msg = this.messages.find(m => m.id === data.tempId)
        if (msg) {
          msg.id = data.messageId
          msg.status = 'sent'
        }
      })

      sock.on('disconnect', () => {
        this.isConnected = false
      })

      sock.on('connect_error', (err) => {
        console.error('Socket.IO 连接错误:', err)
        this.isConnected = false
        uni.showToast({ title: '连接异常', icon: 'none' })
        this.scheduleReconnect()
      })

      sock.on('auth_error', (err) => {
        console.error('Socket.IO 认证错误:', err)
        this.isConnected = false
        uni.showToast({ title: '认证失败', icon: 'none' })

        uni.removeStorageSync('socket_token')
        this.scheduleReconnect()
      })

      this.socket = sock
    },

    scheduleReconnect() {
      if (this.reconnectTimer) {
        return
      }
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.initSocket()
      }, 3000)
    },

    disconnectSocket() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
        this.isConnected = false
      }
      this.socketInitializing = false
    },
    normalizeIncomingMessage(payload, isSelf) {
      return normalizeIncomingMessagePayload(payload, isSelf)
    },
    normalizeOrder(order) {
      return normalizeOrderPayload(order)
    },
    formatOrderNo(order) {
      return formatOrderNoValue(order)
    },
    formatOrderAmount(order) {
      return formatOrderAmountValue(order)
    },
    getOrderStatusText(order) {
      return getOrderStatusTextValue(order)
    },

    addWelcomeMessage() {
      this.messages.push({
        id: Date.now(),
        content: this.supportWelcomeMessage,
        type: 'text',
        isSelf: false
      })
    },

    sendMessage() {
      if (!this.inputText.trim()) return

      if (!this.isConnected) {
        uni.showToast({ title: '未连接到服务器', icon: 'none' })
        return
      }

      const tempId = Date.now()
      const newMsg = {
        id: tempId,
        content: this.inputText,
        type: 'text',
        isSelf: true,
        status: 'sending'
      }
      this.messages.push(newMsg)

      this.socket.emit('send_message', {
        chatId: this.chatId,
        senderId: this.userId,
        senderRole: 'user',
        type: 'support',
        messageType: 'text',
        content: this.inputText,
        sender: this.userName,
        avatar: this.avatarUrl,
        tempId
      })

      setTimeout(() => {
        const msg = this.messages.find(m => m.id === tempId && m.status === 'sending')
        if (msg) msg.status = 'failed'
      }, 5000)

      this.inputText = ''
      this.$nextTick(() => {
        this.scrollToBottom()
      })
    },

    resendMessage(msg) {
      msg.status = 'sending'
      const tempId = Date.now()
      msg.id = tempId

      this.socket.emit('send_message', {
        chatId: this.chatId,
        senderId: this.userId,
        senderRole: 'user',
        type: 'support',
        messageType: msg.type,
        content: msg.type === 'order'
          ? JSON.stringify(msg.order || this.normalizeOrder(msg.content) || {})
          : msg.content,
        sender: this.userName,
        avatar: this.avatarUrl,
        tempId
      })

      setTimeout(() => {
        if (msg.status === 'sending') msg.status = 'failed'
      }, 5000)
    },

    chooseImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0]
          uni.showLoading({ title: '上传中...' })

          uni.uploadFile({
            url: config.SOCKET_URL + '/api/upload',
            filePath: tempFilePath,
            name: 'file',
            success: (uploadRes) => {
              uni.hideLoading()
              try {
                const data = JSON.parse(uploadRes.data)
                if (data.url) {
                  const tempId = Date.now()
                  const newMsg = {
                    id: tempId,
                    content: data.url,
                    type: 'image',
                    isSelf: true,
                    status: 'sending'
                  }
                  this.messages.push(newMsg)

                  this.socket.emit('send_message', {
                    chatId: this.chatId,
                    senderId: this.userId,
                    senderRole: 'user',
                    type: 'support',
                    messageType: 'image',
                    content: data.url,
                    sender: this.userName,
                    avatar: this.avatarUrl,
                    tempId
                  })

                  this.$nextTick(() => {
                    this.scrollToBottom()
                  })
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

    sendOrder(order) {
      if (!this.isConnected) {
        uni.showToast({ title: '未连接到服务器', icon: 'none' })
        return
      }
      const normalizedOrder = this.normalizeOrder(order)
      if (!normalizedOrder || !normalizedOrder.id) {
        uni.showToast({ title: '订单信息异常', icon: 'none' })
        return
      }
      const tempId = Date.now()
      const newMsg = {
        id: tempId,
        content: '',
        type: 'order',
        isSelf: true,
        order: normalizedOrder,
        status: 'sending'
      }
      this.messages.push(newMsg)

      this.socket.emit('send_message', {
        chatId: this.chatId,
        senderId: this.userId,
        senderRole: 'user',
        type: 'support',
        messageType: 'order',
        content: JSON.stringify(normalizedOrder),
        sender: this.userName,
        avatar: this.avatarUrl,
        tempId
      })

      setTimeout(() => {
        const msg = this.messages.find((m) => m.id === tempId && m.status === 'sending')
        if (msg) msg.status = 'failed'
      }, 5000)

      this.showOrderPicker = false
      this.$nextTick(() => {
        this.scrollToBottom()
      })
    },

    async loadRecentOrders() {
      if (!this.userId) {
        this.recentOrders = []
        return
      }

      try {
        const data = await request({
          url: `/api/orders/user/${encodeURIComponent(this.userId)}`,
          method: 'GET'
        })
        const list = Array.isArray(data) ? data : []
        this.recentOrders = list
          .map((item) => this.normalizeOrder(item))
          .filter((item) => item && item.id)
          .slice(0, 10)
      } catch (error) {
        const cachedOrders = uni.getStorageSync('recentOrders') || []
        this.recentOrders = cachedOrders
          .map((item) => this.normalizeOrder(item))
          .filter((item) => item && item.id && String(item.userId || item.user_id || this.userId) === String(this.userId))
          .slice(0, 10)
      }
    },

    openOrderDetail(order) {
      const normalized = this.normalizeOrder(order)
      if (!normalized || !normalized.id) {
        uni.showToast({ title: '订单信息不完整', icon: 'none' })
        return
      }
      this.currentOrderDetail = normalized
      this.showOrderDetailPopup = true
    },

    previewImage(url) {
      uni.previewImage({
        urls: [url],
        current: url
      })
    },

    scrollToBottom() {
      if (this.messages.length > 0) {
        this.scrollToView = 'msg-' + this.messages[this.messages.length - 1].id
      }
    },

    goBack() {
      uni.navigateBack()
    },

    clearMessages() {
      this.showMenu = false
      uni.showModal({
        title: '清空聊天记录',
        content: '确定要清空所有聊天记录吗？',
        success: (res) => {
          if (res.confirm) {
            this.messages = []
            this.addWelcomeMessage()
            uni.showToast({ title: '已清空', icon: 'success' })
          }
        }
      })
    }
  }
}
