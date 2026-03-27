import { io } from 'socket.io-client';
import { ElMessage } from 'element-plus';
import messageDB from './messageDB';
import { getToken as getAdminToken } from './runtime';

const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
const envSocketUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SOCKET_URL) || '';
const SOCKET_BASE_URL = isDev ? '' : envSocketUrl;
const SOCKET_HTTP_BASE = isDev ? '/socket-api' : envSocketUrl;

function buildSocketAuthHeader() {
  const token = String(getAdminToken() || '').trim();
  if (!token) return '';
  return /^bearer\s+/i.test(token) ? token : `Bearer ${token}`;
}

async function getSocketToken() {
  let token = localStorage.getItem('socket_token');
  if (token) return token;

  const authHeader = buildSocketAuthHeader();
  if (!authHeader) return null;

  try {
    const res = await fetch(`${SOCKET_HTTP_BASE}/api/generate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify({ userId: 'admin', role: 'admin' })
    });

    if (!res.ok) {
      throw new Error(`generate socket token failed: ${res.status}`);
    }

    const data = await res.json();
    token = data.token;
    if (token) {
      localStorage.setItem('socket_token', token);
    }
    return token || null;
  } catch (_err) {
    return null;
  }
}

class SocketService {
  constructor() {
    this.sockets = new Map();
    this.currentSocket = null;
    this.listeners = new Map();
    this.lastErrorAt = new Map();
  }

  async connect(namespace = '') {
    if (this.sockets.has(namespace)) {
      const socket = this.sockets.get(namespace);
      this.currentSocket = socket;
      if (!socket.connected) socket.connect();
      return socket;
    }

    const token = await getSocketToken();
    const url = `${SOCKET_BASE_URL}${namespace}`;

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      autoConnect: true,
      auth: { token }
    });

    socket.on('connect_error', (error) => {
      const message = String(error?.message || '');
      if (/\u8ba4\u8bc1\u5931\u8d25/.test(message)) {
        localStorage.removeItem('socket_token');
        socket.disconnect();
        this.sockets.delete(namespace);
      }

      const now = Date.now();
      const last = this.lastErrorAt.get(namespace) || 0;
      if (now - last > 5000) {
        ElMessage.error('连接服务器失败');
        this.lastErrorAt.set(namespace, now);
      }
    });

    this.sockets.set(namespace, socket);
    this.currentSocket = socket;
    return socket;
  }

  emit(event, data) {
    const namespace = arguments.length > 2 ? arguments[2] : null;
    const socket = namespace ? this.sockets.get(namespace) : this.currentSocket;
    if (socket && socket.connected) {
      socket.emit(event, data);
      if (event === 'send_message' && data.chatId) {
        messageDB.saveMessage({
          chatId: data.chatId,
          sender: data.sender || '客服',
          senderId: data.senderId,
          senderRole: data.senderRole,
          content: data.content,
          messageType: data.messageType,
          coupon: data.coupon,
          order: data.order,
          imageUrl: data.imageUrl,
          timestamp: Number.isFinite(Number(data?.timestamp || data?.createdAt))
            ? Number(data.timestamp || data.createdAt)
            : Date.now()
        }).catch(() => {});
      }
    }
  }

  on(event, callback) {
    const namespace = arguments.length > 2 ? arguments[2] : null;
    const socket = namespace ? this.sockets.get(namespace) : this.currentSocket;
    if (socket) {
      const wrappedCallback = (data) => {
        if (event === 'new_message' && data.chatId) {
          messageDB.saveMessage({
            chatId: data.chatId,
            sender: data.sender,
            senderId: data.senderId,
            senderRole: data.senderRole,
            content: data.content,
            messageType: data.messageType,
            coupon: data.coupon,
            order: data.order,
            imageUrl: data.imageUrl,
            timestamp: Number.isFinite(Number(data?.timestamp || data?.createdAt))
              ? Number(data.timestamp || data.createdAt)
              : Date.now()
          }).catch((err) => console.error('Failed to cache message:', err));
        }
        callback(data);
      };
      socket.off(event, wrappedCallback);
      socket.on(event, wrappedCallback);
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(wrappedCallback);
    }
  }

  off(event, callback) {
    const namespace = arguments.length > 2 ? arguments[2] : null;
    const socket = namespace ? this.sockets.get(namespace) : this.currentSocket;
    if (socket) {
      socket.off(event, callback);
    }
  }

  disconnect(namespace = '') {
    if (namespace) {
      const socket = this.sockets.get(namespace);
      if (socket) {
        socket.disconnect();
        this.sockets.delete(namespace);
      }
    } else {
      this.sockets.forEach((socket) => socket.disconnect());
      this.sockets.clear();
      this.listeners.clear();
      this.currentSocket = null;
    }
  }
}

const socketService = new SocketService();
export { SOCKET_BASE_URL, SOCKET_HTTP_BASE };
export default socketService;
