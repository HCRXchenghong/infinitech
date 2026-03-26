import Vue from 'vue'
import riderOrderStore, { loadRiderData } from './shared-ui/riderOrderStore'
import { heartbeatRiderStatus, fetchRiderOrders } from './shared-ui/api'
import { registerCurrentPushDevice, clearPushRegistrationState } from './shared-ui/push-registration'
import { startPushEventBridge } from './shared-ui/push-events'
import messageManager from './utils/message-manager'
import createSocket from './utils/socket-io'
import config from './shared-ui/config'
import MessagePopup from './components/message-popup.vue'
import DispatchPopup from './components/dispatch-popup.vue'
import notification from './utils/notification'

Vue.component('message-popup', MessagePopup)

const RIDER_HEARTBEAT_INTERVAL = 20 * 1000

export default Vue.extend({
  components: {
    DispatchPopup
  },
  data() {
    return {
      socket: null as any,
      riderSocket: null as any,
      riderId: '',
      isConnected: false,
      heartbeatTimer: null as any
    }
  },
  computed: {
    isRiderOnline() {
      return riderOrderStore.isOnline
    }
  },
  watch: {
    isRiderOnline(isOnline: boolean) {
      if (isOnline) {
        this.startHeartbeatLoop()
      } else {
        this.stopHeartbeatLoop()
      }
    }
  },
  onLaunch() {
    // 初始化通知系统（等待 plus 就绪）
    notification.init().catch(err => {
      console.error('[App] 通知初始化失败:', err)
    })
    void startPushEventBridge()
    void this.syncPushRegistration()
    // 启动时同步一次骑手状态，避免心跳循环拿不到初始在线状态
    loadRiderData().finally(() => {
      if (this.isRiderOnline) {
        this.startHeartbeatLoop()
      }
    })
    // 延迟确保 storage 数据就绪后连接
    setTimeout(() => { this.tryConnectSocket() }, 1500)
  },
  async onShow() {
    void this.syncPushRegistration()
    // 每次回到前台先同步一次服务端状态，避免使用本地默认值
    await loadRiderData()
    if (this.isRiderOnline) {
      this.startHeartbeatLoop()
    } else {
      this.stopHeartbeatLoop()
    }
    if (!this.isConnected) {
      setTimeout(() => { this.tryConnectSocket() }, 500)
    }
  },
  methods: {
    async syncPushRegistration() {
      const token = uni.getStorageSync('token')
      const authMode = uni.getStorageSync('authMode')

      if (!token || authMode !== 'rider') {
        clearPushRegistrationState()
        return
      }

      try {
        await registerCurrentPushDevice()
      } catch (err) {
        console.error('[App] 骑手推送设备注册失败:', err)
      }
    },

    startHeartbeatLoop() {
      if (this.heartbeatTimer) return
      this.sendHeartbeat()
      this.heartbeatTimer = setInterval(() => {
        this.sendHeartbeat()
      }, RIDER_HEARTBEAT_INTERVAL)
    },

    stopHeartbeatLoop() {
      if (!this.heartbeatTimer) return
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    },

    async sendHeartbeat() {
      if (!this.isRiderOnline) return
      try {
        await heartbeatRiderStatus()
      } catch (err) {
        console.error('[App] 骑手心跳上报失败:', err)
      }
    },

    async tryConnectSocket() {
      if (this.isConnected) return

      const token = uni.getStorageSync('token')
      let authMode = uni.getStorageSync('authMode')
      let riderId = uni.getStorageSync('riderId')

      // 兼容历史版本：老数据可能没有 authMode，但已有 token+riderId
      if (!authMode && token && riderId) {
        authMode = 'rider'
        uni.setStorageSync('authMode', 'rider')
      }

      if (!token || authMode !== 'rider') {
        clearPushRegistrationState()
        return
      }

      if (!riderId) {
        try {
          await loadRiderData()
          riderId = uni.getStorageSync('riderId')
        } catch (e) { /* ignore */ }
      }
      if (!riderId) {
        return
      }

      this.riderId = String(riderId)

      // 获取 Socket token
      let socketToken = uni.getStorageSync('socket_token')
      if (!socketToken) {
        try {
          const res: any = await new Promise((resolve, reject) => {
            uni.request({
              url: config.SOCKET_URL + '/api/generate-token',
              method: 'POST',
              header: {
                'Content-Type': 'application/json',
                Authorization: /^bearer\s+/i.test(String(token || '').trim())
                  ? String(token || '').trim()
                  : `Bearer ${String(token || '').trim()}`
              },
              data: { userId: riderId, role: 'rider' },
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
            console.error('[App] 获取 socket token 失败: 无 token 返回')
            return // token 获取失败，不继续连接
          }
        } catch (e) {
          console.error('[App] 获取 socket token 失败:', e)
          return // token 获取失败，不继续连接
        }
      }

      // 确保有 token 才连接
      if (!socketToken) {
        console.error('[App] socketToken 为空，取消连接')
        return
      }

      this.connectSupportSocket(socketToken)
      this.connectRiderSocket(socketToken)
    },

    /**
     * 连接客服聊天 /support 命名空间
     * 全局监听消息，供客服页面复用
     */
    connectSupportSocket(token: string) {
      if (this.socket) {
        this.socket.disconnect()
      }

      const sock = createSocket(config.SOCKET_URL, '/support', token).connect()

      sock.on('connect', () => {
        this.isConnected = true
        this.sendHeartbeat()
        const chatId = String(this.riderId || '').trim() || 'rider_default'
        sock.emit('join_chat', {
          chatId,
          userId: this.riderId,
          role: 'rider'
        })
        this.joinSupportOrderRooms(sock)
        uni.$emit('socket:connected', { namespace: 'support' })
      })

      sock.on('new_message', (payload: any) => {
        const senderId = payload?.senderId != null ? String(payload.senderId) : ''
        const isFromSelf = senderId === String(this.riderId) && payload.senderRole === 'rider'
        if (!isFromSelf) {
          messageManager.handleNewMessage({
            id: payload.id,
            chatId: String(payload.chatId || this.riderId || 'rider_default'),
            sender: payload.sender || '客服',
            senderId,
            senderRole: payload.senderRole || 'admin',
            content: payload.content || '',
            messageType: payload.messageType || 'text',
            avatar: payload.avatar || null,
            timestamp: Date.now()
          })
        }
        // 转发给客服聊天页面（如果打开了的话）
        uni.$emit('socket:new_message', payload)
      })

      sock.on('messages_loaded', (payload: any) => {
        uni.$emit('socket:messages_loaded', payload)
      })

      sock.on('message_sent', (data: any) => {
        uni.$emit('socket:message_sent', data)
      })

      sock.on('message_read', (data: any) => {
        uni.$emit('socket:message_read', data)
      })

      sock.on('disconnect', () => {
        this.isConnected = false
        uni.$emit('socket:disconnected', { namespace: 'support' })
      })

      sock.on('connect_error', (err: any) => {
        console.error('[App] Support socket 连接错误:', err)
        this.isConnected = false
        uni.$emit('socket:disconnected', { namespace: 'support', reason: 'connect_error' })
        // 清除过期 token 并重试
        uni.removeStorageSync('socket_token')
        setTimeout(() => {
          this.tryConnectSocket()
        }, 3000)
      })

      sock.on('auth_error', (err: any) => {
        console.error('[App] Support socket 认证错误:', err)
        this.isConnected = false
        uni.$emit('socket:disconnected', { namespace: 'support', reason: 'auth_error' })
        // 清除过期 token 并重试
        uni.removeStorageSync('socket_token')
        setTimeout(() => {
          this.tryConnectSocket()
        }, 3000)
      })

      this.socket = sock
    },

    /**
     * 连接骑手专用 /rider 命名空间
     */
    connectRiderSocket(token: string) {
      if (this.riderSocket) {
        this.riderSocket.disconnect()
      }

      const sock = createSocket(config.SOCKET_URL, '/rider', token).connect()

      sock.on('connect', () => {
        this.sendHeartbeat()
        sock.emit('join_rider', { riderId: this.riderId })
      })

      sock.on('merchant_message', (payload: any) => {
        messageManager.handleNewMessage({
          id: payload.id || Date.now(),
          chatId: payload.chatId || `merchant_${payload.senderId}`,
          sender: payload.sender || payload.merchantName || '商家',
          senderId: payload.senderId || payload.merchantId,
          senderRole: 'merchant',
          content: payload.content || '',
          messageType: payload.messageType || 'text',
          avatar: payload.avatar || null,
          timestamp: Date.now()
        })
      })

      sock.on('user_message', (payload: any) => {
        messageManager.handleNewMessage({
          id: payload.id || Date.now(),
          chatId: payload.chatId || `user_${payload.senderId}`,
          sender: payload.sender || payload.userName || '顾客',
          senderId: payload.senderId || payload.userId,
          senderRole: 'user',
          content: payload.content || '',
          messageType: payload.messageType || 'text',
          avatar: payload.avatar || null,
          timestamp: Date.now()
        })
      })


      sock.on('connect_error', (err: any) => {
        console.error('[App] Rider socket 连接错误:', err)
        // 清除过期 token 并重试
        uni.removeStorageSync('socket_token')
        setTimeout(() => {
          this.tryConnectSocket()
        }, 3000)
      })

      sock.on('auth_error', (err: any) => {
        console.error('[App] Rider socket 认证错误:', err)
        // 清除过期 token 并重试
        uni.removeStorageSync('socket_token')
        setTimeout(() => {
          this.tryConnectSocket()
        }, 3000)
      })

      this.riderSocket = sock
    },

    /**
     * 获取全局 support socket（供客服页面复用）
     */
    getSupportSocket() {
      return this.socket
    },

    extractOrderList(data: any): any[] {
      if (Array.isArray(data)) return data
      if (Array.isArray(data?.orders)) return data.orders
      if (Array.isArray(data?.data)) return data.data
      if (Array.isArray(data?.data?.orders)) return data.data.orders
      return []
    },

    normalizeOrderId(raw: any): string {
      const value = raw && typeof raw === 'object'
        ? (raw.id || raw.orderId || raw.order_id || raw.daily_order_id)
        : raw
      return value === undefined || value === null ? '' : String(value).trim()
    },

    async joinSupportOrderRooms(sock: any) {
      if (!sock || !this.riderId) return
      try {
        const riderOrders = this.extractOrderList(await fetchRiderOrders())
        const roomIds = new Set<string>()
        riderOrders.forEach((order: any) => {
          const orderId = this.normalizeOrderId(order)
          if (orderId) {
            roomIds.add(`rider_${orderId}`)
            roomIds.add(`rs_${orderId}`)
          }
        })

        roomIds.forEach((chatId) => {
          sock.emit('join_chat', {
            chatId,
            userId: this.riderId,
            role: 'rider'
          })
        })

      } catch (err) {
        // join room failures are non-fatal
      }
    }
  }
})
