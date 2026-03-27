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

function normalizeBearerToken(raw: any) {
  const token = String(raw || '').trim()
  if (!token) return ''
  return /^bearer\s+/i.test(token) ? token : `Bearer ${token}`
}

function normalizeRiderIncomingMessage(payload: any, senderRole: 'merchant' | 'user', fallbackName: string) {
  const timestamp = Number.isFinite(Number(payload?.timestamp || payload?.createdAt))
    ? Number(payload.timestamp || payload.createdAt)
    : Date.now()
  return {
    id: payload?.id || Date.now(),
    chatId: String(payload?.chatId || `${senderRole}_${payload?.senderId || payload?.targetId || ''}`),
    sender: payload?.sender || payload?.merchantName || payload?.userName || fallbackName,
    senderId: String(payload?.senderId || payload?.merchantId || payload?.userId || ''),
    senderRole,
    content: payload?.content || '',
    messageType: payload?.messageType || 'text',
    avatar: payload?.avatar || null,
    timestamp
  }
}

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
    notification.init().catch((err) => {
      console.error('[App] Notification init failed:', err)
    })
    void startPushEventBridge()
    void this.syncPushRegistration()
    loadRiderData().finally(() => {
      if (this.isRiderOnline) {
        this.startHeartbeatLoop()
      }
    })
    setTimeout(() => { this.tryConnectSocket() }, 1500)
  },
  async onShow() {
    void this.syncPushRegistration()
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
        console.error('[App] Rider push registration failed:', err)
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
        console.error('[App] Rider heartbeat failed:', err)
      }
    },

    async tryConnectSocket() {
      if (this.isConnected) return

      const token = uni.getStorageSync('token')
      let authMode = uni.getStorageSync('authMode')
      let riderId = uni.getStorageSync('riderId')

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
        } catch (_err) {
          // ignore
        }
      }
      if (!riderId) return

      this.riderId = String(riderId)

      let socketToken = uni.getStorageSync('socket_token')
      if (!socketToken) {
        try {
          const res: any = await new Promise((resolve, reject) => {
            uni.request({
              url: `${config.SOCKET_URL}/api/generate-token`,
              method: 'POST',
              header: {
                'Content-Type': 'application/json',
                Authorization: normalizeBearerToken(token)
              },
              data: { userId: riderId, role: 'rider' },
              success: resolve,
              fail: reject
            })
          })

          let resData = res.data
          if (typeof resData === 'string') {
            try {
              resData = JSON.parse(resData)
            } catch (_err) {
              // ignore
            }
          }

          if (resData && resData.token) {
            socketToken = resData.token
            uni.setStorageSync('socket_token', socketToken)
          } else {
            console.error('[App] Missing socket token from generate-token response')
            return
          }
        } catch (err) {
          console.error('[App] Failed to fetch socket token:', err)
          return
        }
      }

      if (!socketToken) {
        console.error('[App] Socket token is empty, skip socket connection')
        return
      }

      this.connectSupportSocket(String(socketToken))
      this.connectRiderSocket(String(socketToken))
    },

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
        const isFromSelf = senderId === String(this.riderId) && payload?.senderRole === 'rider'
        if (!isFromSelf) {
          messageManager.handleNewMessage({
            id: payload?.id,
            chatId: String(payload?.chatId || this.riderId || 'rider_default'),
            sender: payload?.sender || '客服',
            senderId,
            senderRole: payload?.senderRole || 'admin',
            content: payload?.content || '',
            messageType: payload?.messageType || 'text',
            avatar: payload?.avatar || null,
            timestamp: Number.isFinite(Number(payload?.timestamp || payload?.createdAt))
              ? Number(payload.timestamp || payload.createdAt)
              : Date.now()
          })
        }
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
        console.error('[App] Support socket connect error:', err)
        this.isConnected = false
        uni.$emit('socket:disconnected', { namespace: 'support', reason: 'connect_error' })
        uni.removeStorageSync('socket_token')
        setTimeout(() => {
          this.tryConnectSocket()
        }, 3000)
      })

      sock.on('auth_error', (err: any) => {
        console.error('[App] Support socket auth error:', err)
        this.isConnected = false
        uni.$emit('socket:disconnected', { namespace: 'support', reason: 'auth_error' })
        uni.removeStorageSync('socket_token')
        setTimeout(() => {
          this.tryConnectSocket()
        }, 3000)
      })

      this.socket = sock
    },

    connectRiderSocket(token: string) {
      if (this.riderSocket) {
        this.riderSocket.disconnect()
      }

      const sock = createSocket(config.SOCKET_URL, '/rider', token).connect()

      const forwardRiderIncoming = (payload: any, senderRole: 'merchant' | 'user', fallbackName: string) => {
        const normalizedPayload = normalizeRiderIncomingMessage(payload, senderRole, fallbackName)
        messageManager.handleNewMessage(normalizedPayload)
        uni.$emit('socket:new_message', normalizedPayload)
      }

      sock.on('connect', () => {
        this.sendHeartbeat()
        sock.emit('join_rider', { riderId: this.riderId })
      })

      sock.on('merchant_message', (payload: any) => {
        forwardRiderIncoming(payload, 'merchant', '商家')
      })

      sock.on('user_message', (payload: any) => {
        forwardRiderIncoming(payload, 'user', '用户')
      })

      sock.on('connect_error', (err: any) => {
        console.error('[App] Rider socket connect error:', err)
        uni.removeStorageSync('socket_token')
        setTimeout(() => {
          this.tryConnectSocket()
        }, 3000)
      })

      sock.on('auth_error', (err: any) => {
        console.error('[App] Rider socket auth error:', err)
        uni.removeStorageSync('socket_token')
        setTimeout(() => {
          this.tryConnectSocket()
        }, 3000)
      })

      this.riderSocket = sock
    },

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
      } catch (_err) {
        // ignore non-fatal room join failures
      }
    }
  }
})
