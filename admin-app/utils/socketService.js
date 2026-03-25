import io from 'socket.io-client';
import { db } from './database.js';
import { API_CONFIG } from './config.js';

function getSocketUrl() {
  const bffUrl = API_CONFIG.BFF_BASE_URL || process.env.VUE_APP_SOCKET_URL || '';
  if (!bffUrl) return '';
  return bffUrl.replace(':25500', ':9898');
}

function buildSocketAuthHeader() {
  try {
    const token = String(uni.getStorageSync(API_CONFIG.TOKEN_KEY) || '').trim();
    if (!token) return '';
    return /^bearer\s+/i.test(token) ? token : `Bearer ${token}`;
  } catch (_err) {
    return '';
  }
}

async function getSocketToken() {
  try {
    const cached = uni.getStorageSync('socket_token');
    if (cached) {
      return String(cached);
    }

    const authHeader = buildSocketAuthHeader();
    if (!authHeader) {
      return null;
    }

    const response = await new Promise((resolve, reject) => {
      uni.request({
        url: `${getSocketUrl()}/api/generate-token`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          Authorization: authHeader
        },
        data: {
          userId: 'admin',
          role: 'admin'
        },
        success: resolve,
        fail: reject
      });
    });

    const payload = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    const token = payload?.token ? String(payload.token) : '';
    if (!token) {
      return null;
    }

    uni.setStorageSync('socket_token', token);
    return token;
  } catch (_err) {
    return null;
  }
}

class SocketService {
  constructor() {
    this.socket = null;
    this.namespace = null;
  }

  async connect(namespace = '/support') {
    if (this.socket && this.socket.connected && this.namespace === namespace) {
      return this.socket;
    }

    const token = await getSocketToken();
    const socketUrl = getSocketUrl();
    const url = `${socketUrl}${namespace}`;
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      auth: { token }
    });

    this.namespace = namespace;

    this.socket.on('connect_error', (error) => {
      const message = String(error?.message || '');
      if (/\u8ba4\u8bc1\u5931\u8d25/.test(message)) {
        uni.removeStorageSync('socket_token');
        this.socket.disconnect();
        this.socket = null;
        this.namespace = null;
      }
    });

    return this.socket;
  }

  async emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);

      if (event === 'send_message' && data.chatId) {
        try {
          await db.open();
          await db.saveMessages(data.chatId, [{
            id: Date.now().toString(),
            senderId: data.senderId,
            sender: data.sender || '瀹㈡湇',
            content: data.content,
            messageType: data.messageType,
            timestamp: Date.now(),
            isSelf: true
          }]);
        } catch (_err) {
          // ignore cache failures
        }
      }
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.off(event);
      this.socket.on(event, async (data) => {
        if (event === 'new_message' && data.chatId) {
          try {
            await db.open();
            await db.saveMessages(data.chatId, [{
              id: data.id?.toString() || Date.now().toString(),
              senderId: data.senderId,
              sender: data.sender,
              content: data.content,
              messageType: data.messageType,
              timestamp: Date.now(),
              isSelf: data.senderRole === 'admin'
            }]);
          } catch (_err) {
            // ignore cache failures
          }
        }
        callback(data);
      });
    }
  }

  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.namespace = null;
    }
  }
}

export default new SocketService();
