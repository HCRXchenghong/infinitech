class SocketIO {
  declare private socket: any
  declare private url: string
  declare private namespace: string
  declare private eventHandlers: Record<string, Function>
  declare private connected: boolean
  declare private hasConnected: boolean
  declare private token: string

  constructor(url: string, namespace: string = '', token: string = '') {
    this.socket = null
    this.url = url
    this.namespace = ''
    this.eventHandlers = {}
    this.connected = false
    this.hasConnected = false
    this.token = token
    if (namespace) {
      this.namespace = namespace.startsWith('/') ? namespace : `/${namespace}`
    }
  }

  connect() {
    const wsUrl = this.buildWsUrl()

    this.socket = uni.connectSocket({
      url: wsUrl,
      complete: () => {}
    })

    this.socket.onOpen(() => {
      this.connected = true
      // Socket.IO v4: 发送带 auth token 的 CONNECT 包
      if (this.token) {
        this.send(`40${this.namespace},${JSON.stringify({ token: this.token })}`)
      } else {
        this.send(`40${this.namespace}`)
      }
    })

    this.socket.onMessage((res: any) => {
      const msg = res.data
      this.handleMessage(msg)
    })

    this.socket.onError((err: any) => {
      console.error('WebSocket error:', err)
      this.fire('connect_error', err)
    })

    this.socket.onClose(() => {
      this.connected = false
      this.hasConnected = false
      this.fire('disconnect')
    })

    return this
  }

  private buildWsUrl() {
    const base = this.url.replace('http://', 'ws://').replace('https://', 'wss://')
    return `${base}/socket.io/?EIO=4&transport=websocket`
  }

  private handleMessage(msg: string) {
    if (!msg) return

    if (msg === '2') {
      this.send('3')
      return
    }

    // 认证错误 (44 = namespace error) - 合并处理
    if (msg.startsWith('44')) {
      console.error('Socket 认证失败:', msg)
      // 清除过期的 socket_token
      try {
        uni.removeStorageSync('socket_token')
        uni.removeStorageSync('socket_token_account_key')
      } catch(e) {
        console.error('[Socket] 清除 token 失败:', e)
      }
      // 仅触发认证错误，避免业务层重复触发重连流程
      this.fire('auth_error', { message: '认证失败' })
      return
    }

    if (msg === '40' || msg === `40${this.namespace}` || msg.startsWith(`40${this.namespace},`)) {
      if (!this.hasConnected) {
        this.hasConnected = true
        this.fire('connect')
      }
      return
    }

    if (msg.startsWith('42')) {
      const parsed = this.parseEvent(msg)
      if (parsed && this.eventHandlers[parsed.event]) {
        this.eventHandlers[parsed.event](parsed.payload)
      }
    }
  }

  private parseEvent(msg: string) {
    let payload = msg.substring(2)
    if (this.namespace) {
      const prefix = `${this.namespace},`
      if (payload.startsWith(prefix)) {
        payload = payload.substring(prefix.length)
      } else if (payload.startsWith(this.namespace)) {
        payload = payload.substring(this.namespace.length)
        if (payload.startsWith(',')) {
          payload = payload.substring(1)
        }
      }
    }
    if (!payload) return null
    try {
      const data = JSON.parse(payload)
      return { event: data[0], payload: data[1] }
    } catch (e) {
      console.error('Parse error:', e)
      return null
    }
  }

  private send(data: string) {
    if (this.socket) {
      this.socket.send({ data })
    }
  }

  private fire(event: string, payload?: any) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event](payload)
    }
  }

  on(event: string, callback: Function) {
    this.eventHandlers[event] = callback
  }

  emit(event: string, data: any) {
    if (this.connected) {
      const prefix = this.namespace ? `${this.namespace},` : ''
      const msg = '42' + prefix + JSON.stringify([event, data])
      this.send(msg)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
      this.connected = false
      this.hasConnected = false
    }
  }
}

export default function createSocket(url: string, namespace: string = '', token: string = '') {
  return new SocketIO(url, namespace, token)
}
