import createSocket from './socket-io'
import config from './config'

type QueuedMessage = {
  roomId: string
  text: string
}

class SocketService {
  private socket: any = null
  private static instance: SocketService
  private messageQueue: QueuedMessage[] = []
  private isConnected = false
  private isConnecting = false
  private token = ''

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  public connect(token: string = '') {
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

    socket.on('msg', (data: any) => {
      uni.$emit('chat-message', data)
    })
  }

  public joinRoom(roomId: string) {
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

  public send(roomId: string, text: string) {
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

  private flushQueue() {
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

  public close() {
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
