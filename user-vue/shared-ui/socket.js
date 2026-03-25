import createSocket from '../utils/socket-io'
import config from './config'

class SocketService {
  constructor() {
    this.socket = null
    this.messageQueue = []
    this.isConnected = false
    this.isConnecting = false
    this.token = ''
  }

  static getInstance() {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  connect(token = '') {
    if (token) {
      this.token = String(token)
    }

    if (this.socket && this.isConnected) {
      this.flushQueue()
      return
    }

    if (this.isConnecting) {
      return
    }

    this.isConnecting = true

    if (this.socket) {
      try {
        this.socket.disconnect()
      } catch (_) {
        // ignore stale socket cleanup errors
      }
      this.socket = null
    }

    const socket = createSocket(config.SOCKET_URL, '/support', this.token).connect()
    this.socket = socket

    socket.on('connect', () => {
      this.isConnected = true
      this.isConnecting = false
      this.flushQueue()
    })

    socket.on('disconnect', () => {
      this.isConnected = false
      this.isConnecting = false
    })

    socket.on('connect_error', () => {
      this.isConnecting = false
    })

    socket.on('auth_error', () => {
      this.isConnected = false
      this.isConnecting = false
      this.token = ''
    })

    socket.on('msg', (data) => {
      uni.$emit('chat-message', data)
    })
  }

  joinRoom(roomId) {
    if (!roomId) {
      return
    }

    this.connect()
    if (this.socket && this.isConnected) {
      this.socket.emit('join', roomId)
      return
    }

    this.messageQueue.push({ roomId, text: '' })
  }

  send(roomId, text) {
    if (!roomId || !text) {
      return
    }

    if (this.socket && this.isConnected) {
      this.socket.emit('msg', { room: roomId, text })
      return
    }

    this.messageQueue.push({ roomId, text })
    this.connect()
  }

  flushQueue() {
    if (!this.socket || !this.isConnected || this.messageQueue.length === 0) {
      return
    }

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (!message) {
        continue
      }
      if (message.text) {
        this.socket.emit('msg', { room: message.roomId, text: message.text })
      } else {
        this.socket.emit('join', message.roomId)
      }
    }
  }

  close() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnected = false
    this.isConnecting = false
    this.messageQueue = []
  }
}

export default SocketService.getInstance()
