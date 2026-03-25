class SocketIO {
  constructor(url, namespace = '', token = '') {
    this.socket = null
    this.url = url || ''
    this.namespace = ''
    this.eventHandlers = {}
    this.connected = false
    this.hasConnected = false
    this.token = token || ''

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
      if (this.token) {
        this.send(`40${this.namespace},${JSON.stringify({ token: this.token })}`)
      } else {
        this.send(`40${this.namespace}`)
      }
    })

    this.socket.onMessage((res) => {
      const msg = res.data
      this.handleMessage(msg)
    })

    this.socket.onError((err) => {
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

  buildWsUrl() {
    const base = this.url.replace('http://', 'ws://').replace('https://', 'wss://')
    return `${base}/socket.io/?EIO=4&transport=websocket`
  }

  handleMessage(msg) {
    if (!msg) return

    if (msg === '2') {
      this.send('3')
      return
    }

    if (msg.indexOf('44') === 0) {
      console.error('Socket 认证失败:', msg)
      try {
        uni.removeStorageSync('socket_token')
      } catch (e) {
        console.error('[Socket] 清除 token 失败:', e)
      }
      this.fire('auth_error', { message: '认证失败' })
      return
    }

    if (msg === '40' || msg === `40${this.namespace}` || msg.indexOf(`40${this.namespace},`) === 0) {
      if (!this.hasConnected) {
        this.hasConnected = true
        this.fire('connect')
      }
      return
    }

    if (msg.indexOf('42') === 0) {
      const parsed = this.parseEvent(msg)
      if (parsed && this.eventHandlers[parsed.event]) {
        this.eventHandlers[parsed.event](parsed.payload)
      }
    }
  }

  parseEvent(msg) {
    let payload = msg.substring(2)
    if (this.namespace) {
      const prefix = `${this.namespace},`
      if (payload.indexOf(prefix) === 0) {
        payload = payload.substring(prefix.length)
      } else if (payload.indexOf(this.namespace) === 0) {
        payload = payload.substring(this.namespace.length)
        if (payload.indexOf(',') === 0) {
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

  send(data) {
    if (this.socket) {
      this.socket.send({ data })
    }
  }

  fire(event, payload) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event](payload)
    }
  }

  on(event, callback) {
    this.eventHandlers[event] = callback
  }

  emit(event, data) {
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

export default function createSocket(url, namespace = '', token = '') {
  return new SocketIO(url, namespace, token)
}
