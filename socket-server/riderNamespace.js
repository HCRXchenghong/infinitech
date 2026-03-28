import { logger } from './logger.js';
import { normalizeMessageData } from './messagePayload.js';
import { requestBackend } from './socketIdentity.js';
import { buildSocketRequestId } from './requestId.js';

function resolveMessageTimestamp(rawValue, fallback = Date.now()) {
  const numericValue = Number(rawValue);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }

  const stringValue = String(rawValue || '').trim();
  if (!stringValue) return fallback;

  const parsed = Date.parse(stringValue.replace(' ', 'T'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function mergeBackendMessage(localMessage, backendMessage) {
  if (!backendMessage || typeof backendMessage !== 'object') {
    return localMessage;
  }

  const timestamp = resolveMessageTimestamp(
    backendMessage?.timestamp ?? backendMessage?.createdAt ?? backendMessage?.updatedAt,
    Number(localMessage?.timestamp) || Date.now()
  );

  return {
    ...localMessage,
    ...backendMessage,
    id: backendMessage.id || localMessage.id,
    legacyId: backendMessage.legacyId || localMessage.legacyId || localMessage.id,
    externalMessageId: backendMessage.externalMessageId || localMessage.externalMessageId || String(localMessage.id || ''),
    timestamp,
    createdAt: backendMessage.createdAt ?? backendMessage.timestamp ?? localMessage.createdAt,
    updatedAt: backendMessage.updatedAt ?? localMessage.updatedAt,
    time: String(backendMessage.time || '').trim()
      || new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    status: backendMessage.status || localMessage.status || 'sent'
  };
}

function generateRiderChatId(riderId, otherId, type) {
  const str = `${type}_${riderId}_${otherId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash;
  }
  return (Math.abs(hash) % 900000) + 100000;
}

function ensureSocketRole(socket, expectedRole, eventName) {
  if (String(socket?.userRole || '').toLowerCase() === expectedRole) {
    return true;
  }

  socket.emit(`${eventName}_denied`, {
    message: `${eventName} requires ${expectedRole} role`
  });
  return false;
}

function saveAndBuildRiderMessage(saveMessage, chatId, messageInput, socket) {
  const messageData = normalizeMessageData(messageInput, socket);
  const result = saveMessage('rider_chat', chatId, messageData);
  const timestamp = resolveMessageTimestamp(result?.timestamp ?? result?.createdAt, Date.now());
  const createdAt = String(result?.createdAt || '');
  return {
    id: result.lastInsertRowid,
    chatId,
    sender: messageData.sender,
    senderId: messageData.senderId,
    senderRole: messageData.senderRole,
    content: messageData.content,
    messageType: messageData.messageType,
    avatar: messageData.avatar,
    timestamp,
    createdAt,
    time: new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  };
}

function emitMessageSentAck(socket, message, tempId) {
  socket.emit('message_sent', {
    tempId,
    messageId: message?.id,
    status: 'sent',
    timestamp: message?.timestamp,
    createdAt: message?.createdAt,
    time: message?.time
  });
}

async function syncRiderMessageToBackend(socket, message, target = {}) {
  const authHeader = String(socket?.authToken || '').trim();
  if (!authHeader || !message?.chatId) return;
  const requestId = buildSocketRequestId(socket, 'sync-rider-message', message.chatId);

  const payload = {
    chatId: String(message.chatId),
    externalMessageId: String(message.id || ''),
    senderId: String(message.senderId || ''),
    senderRole: String(message.senderRole || ''),
    senderName: String(message.sender || ''),
    content: message.content,
    messageType: message.messageType,
    avatar: message.avatar || '',
    targetType: String(target.type || '').trim().toLowerCase(),
    targetId: String(target.id || '').trim(),
    targetPhone: String(target.phone || '').trim(),
    targetName: String(target.name || '').trim(),
    targetAvatar: String(target.avatar || '').trim()
  };

  try {
    const { response, data } = await requestBackend('/api/messages/sync', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: payload,
      requestId
    });
    if (!response.ok) {
      logger.warn(`Rider message sync to Go failed request_id=${requestId}:`, response.status, data?.error || '');
      return null;
    }
    return mergeBackendMessage(message, data);
  } catch (err) {
    logger.warn(`Rider message sync to Go failed request_id=${requestId}:`, err?.message || err);
    return null;
  }
}

async function relayMessageToRider({
  socket,
  riderNamespace,
  saveMessage,
  data,
  fromType,
  senderDefault,
  eventName
}) {
  const riderId = String(data?.riderId || '').trim();
  if (!riderId) {
    socket.emit(`${eventName}_denied`, { message: 'missing riderId' });
    return;
  }

  const chatId = generateRiderChatId(riderId, socket.userId, fromType);
  const localMessage = saveAndBuildRiderMessage(saveMessage, chatId, {
    chatId,
    content: data?.content,
    sender: data?.sender || senderDefault,
    messageType: data?.messageType || 'text',
    avatar: data?.avatar || ''
  }, socket);

  const syncedMessage = await syncRiderMessageToBackend(socket, localMessage, {
    type: 'rider',
    id: riderId,
    phone: data?.riderPhone,
    name: data?.riderName,
    avatar: data?.riderAvatar
  });

  const message = syncedMessage || localMessage;
  riderNamespace.to(`rider_${riderId}`).emit(eventName, message);
  emitMessageSentAck(socket, message, data?.tempId);

  logger.info(`Rider relay ${message.senderRole} ${message.senderId} -> rider ${riderId}, chatId: ${chatId}`);
}

async function relayRiderMessage({ socket, riderNamespace, saveMessage, data }) {
  const targetId = String(data?.targetId || '').trim();
  const targetType = String(data?.targetType || '').trim().toLowerCase();
  if (!targetId || !['merchant', 'user'].includes(targetType)) {
    socket.emit('rider_send_message_denied', { message: 'invalid rider chat target' });
    return;
  }

  const chatId = generateRiderChatId(socket.userId, targetId, targetType);
  const localMessage = saveAndBuildRiderMessage(saveMessage, chatId, {
    chatId,
    content: data?.content,
    sender: data?.sender || '骑手',
    messageType: data?.messageType || 'text',
    avatar: data?.avatar || ''
  }, socket);

  const syncedMessage = await syncRiderMessageToBackend(socket, localMessage, {
    type: targetType,
    id: targetId,
    phone: data?.targetPhone,
    name: data?.targetName,
    avatar: data?.targetAvatar
  });

  const message = syncedMessage || localMessage;

  if (targetType === 'merchant') {
    riderNamespace.to(`merchant_${targetId}`).emit('rider_message', message);
  } else {
    riderNamespace.to(`user_${targetId}`).emit('rider_message', message);
  }

  emitMessageSentAck(socket, message, data?.tempId);
  logger.info(`Rider ${socket.userId} -> ${targetType} ${targetId}, chatId: ${chatId}`);
}

export function setupRiderNamespace({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser,
  saveMessage
}) {
  const riderNamespace = io.of('/rider');
  riderNamespace.use(authMiddleware);

  riderNamespace.on('connection', (socket) => {
    logger.info('Rider connected:', socket.userId, 'Role:', socket.userRole);
    addOnlineUser(socket.id, socket.userId, socket.userRole);

    socket.on('join_rider', () => {
      if (!ensureSocketRole(socket, 'rider', 'join_rider')) {
        return;
      }

      const riderId = String(socket.userId || '').trim();
      socket.join(`rider_${riderId}`);
      logger.info(`Rider ${riderId} joined room rider_${riderId}`);
    });

    socket.on('send_to_rider', async (data) => {
      if (!ensureSocketRole(socket, 'merchant', 'send_to_rider')) {
        return;
      }

      await relayMessageToRider({
        socket,
        riderNamespace,
        saveMessage,
        data,
        fromType: 'merchant',
        senderDefault: '商家',
        eventName: 'merchant_message'
      });
    });

    socket.on('user_send_to_rider', async (data) => {
      if (!ensureSocketRole(socket, 'user', 'user_send_to_rider')) {
        return;
      }

      await relayMessageToRider({
        socket,
        riderNamespace,
        saveMessage,
        data,
        fromType: 'user',
        senderDefault: '用户',
        eventName: 'user_message'
      });
    });

    socket.on('rider_send_message', async (data) => {
      if (!ensureSocketRole(socket, 'rider', 'rider_send_message')) {
        return;
      }

      await relayRiderMessage({
        socket,
        riderNamespace,
        saveMessage,
        data
      });
    });

    socket.on('disconnect', () => {
      removeOnlineUser(socket.id);
      logger.info('Rider disconnected:', socket.userId);
    });
  });

  return {
    riderNamespace
  };
}
