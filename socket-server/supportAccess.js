import { fetchOrderDetailWithAuth } from './socketIdentity.js';

const ORDER_ACCESS_TTL_MS = 30 * 1000;
const orderAccessCache = new Map();

function cleanupOrderAccessCache() {
  const now = Date.now();
  for (const [key, value] of orderAccessCache.entries()) {
    if (!value || value.expiresAt <= now) {
      orderAccessCache.delete(key);
    }
  }
}

function getCacheKey(socket, chatId) {
  return `${socket?.sessionId || socket?.id || 'anonymous'}:${normalizeChatId(chatId)}`;
}

function getAllowedSupportRooms(socket) {
  const userId = String(socket?.userId || '').trim();
  const role = String(socket?.userRole || '').trim().toLowerCase();

  if (!userId) return [];

  switch (role) {
    case 'user':
      return [userId, `user_${userId}`];
    case 'rider':
      return [userId, `rider_${userId}`];
    case 'merchant':
      return [userId, `merchant_${userId}`];
    default:
      return [];
  }
}

function parseOrderRoom(chatId) {
  const normalizedChatId = normalizeChatId(chatId);
  if (!normalizedChatId) return null;

  if (normalizedChatId.startsWith('rider_')) {
    return {
      type: 'user_rider',
      orderId: normalizedChatId.slice('rider_'.length),
      allowedRoles: ['user', 'rider']
    };
  }

  if (normalizedChatId.startsWith('shop_')) {
    return {
      type: 'user_merchant',
      orderId: normalizedChatId.slice('shop_'.length),
      allowedRoles: ['user', 'merchant']
    };
  }

  if (normalizedChatId.startsWith('rs_')) {
    return {
      type: 'merchant_rider',
      orderId: normalizedChatId.slice('rs_'.length),
      allowedRoles: ['merchant', 'rider']
    };
  }

  return null;
}

async function canAccessOrderRoom(socket, orderRoom) {
  if (!orderRoom) return false;
  if (!orderRoom.allowedRoles.includes(String(socket?.userRole || '').toLowerCase())) {
    return false;
  }
  if (!socket?.authToken) {
    return false;
  }

  cleanupOrderAccessCache();
  const cacheKey = getCacheKey(socket, `${orderRoom.type}:${orderRoom.orderId}`);
  const cached = orderAccessCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.allowed;
  }

  try {
    await fetchOrderDetailWithAuth(orderRoom.orderId, socket.authToken);
    orderAccessCache.set(cacheKey, {
      allowed: true,
      expiresAt: Date.now() + ORDER_ACCESS_TTL_MS
    });
    return true;
  } catch (_err) {
    orderAccessCache.set(cacheKey, {
      allowed: false,
      expiresAt: Date.now() + ORDER_ACCESS_TTL_MS
    });
    return false;
  }
}

export function normalizeChatId(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export async function authorizeSupportChatAccess(socket, chatId) {
  const normalizedChatId = normalizeChatId(chatId);
  if (!normalizedChatId) {
    return {
      allowed: false,
      chatId: '',
      reason: 'missing chat id'
    };
  }

  if (String(socket?.userRole || '').toLowerCase() === 'admin') {
    return {
      allowed: true,
      chatId: normalizedChatId,
      scope: 'admin'
    };
  }

  if (getAllowedSupportRooms(socket).includes(normalizedChatId)) {
    return {
      allowed: true,
      chatId: normalizedChatId,
      scope: 'official_support'
    };
  }

  const orderRoom = parseOrderRoom(normalizedChatId);
  if (!orderRoom) {
    return {
      allowed: false,
      chatId: normalizedChatId,
      reason: 'chat access denied'
    };
  }

  const allowed = await canAccessOrderRoom(socket, orderRoom);
  return {
    allowed,
    chatId: normalizedChatId,
    scope: orderRoom.type,
    orderId: orderRoom.orderId,
    reason: allowed ? '' : 'chat access denied'
  };
}
