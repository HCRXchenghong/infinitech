import io from 'socket.io-client';
import { db } from './database.js';
import { getAuthUser } from './auth.js';
import { API_CONFIG } from './config.js';
import {
  clearCachedSocketToken as clearCachedSocketTokenCache,
  resolveSocketToken,
} from '../../packages/client-sdk/src/realtime-token.js';

const SOCKET_TOKEN_KEY = 'socket_token';
const SOCKET_TOKEN_ACCOUNT_KEY = 'socket_token_account_key';

function getSocketUrl() {
  const bffUrl = API_CONFIG.BFF_BASE_URL || process.env.VUE_APP_SOCKET_URL || '';
  if (!bffUrl) return '';
  return bffUrl.replace(':25500', ':9898');
}

function getSocketIdentity() {
  const user = getAuthUser();
  const userId = String(user?.id || user?.phone || '').trim();
  if (!userId) {
    return null;
  }

  return {
    userId,
    role: 'admin',
    cacheKey: `admin:${userId}`
  };
}

function clearCachedSocketToken() {
  clearCachedSocketTokenCache({
    uniApp: uni,
    tokenStorageKey: SOCKET_TOKEN_KEY,
    tokenAccountKeyStorageKey: SOCKET_TOKEN_ACCOUNT_KEY,
  });
}

async function getSocketToken() {
  try {
    const identity = getSocketIdentity();
    if (!identity) {
      clearCachedSocketToken();
      return null;
    }

    return await resolveSocketToken({
      uniApp: uni,
      userId: identity.userId,
      role: identity.role,
      accountKey: identity.cacheKey,
      socketUrl: getSocketUrl(),
      authToken: String(uni.getStorageSync(API_CONFIG.TOKEN_KEY) || ''),
      tokenStorageKey: SOCKET_TOKEN_KEY,
      tokenAccountKeyStorageKey: SOCKET_TOKEN_ACCOUNT_KEY,
      missingAuthorizationMessage: 'missing auth token for socket request',
      missingSocketUrlMessage: 'socket url is not configured',
      missingTokenMessage: 'missing socket token from response',
    });
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
        clearCachedSocketToken();
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
