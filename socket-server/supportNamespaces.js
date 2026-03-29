import { logger } from './logger.js';
import { normalizeMessageData } from './messagePayload.js';
import { authorizeSupportChatAccess, normalizeChatId } from './supportAccess.js';
import { requestBackend } from './socketIdentity.js';
import { buildSocketRequestId } from './requestId.js';

export function getSupportHistoryFallbackConfig() {
  return {
    enabled: false
  };
}

function emitSupportMessage(supportNamespace, chatId, message) {
  const roomName = `chat_${chatId}`;
  const room = supportNamespace.adapter.rooms.get(roomName);
  if (room && room.size > 0) {
    room.forEach((socketId) => {
      const client = supportNamespace.sockets.get(socketId);
      if (!client) return;
      if (client.userRole === 'admin') return;
      client.emit('new_message', message);
    });
  }
  supportNamespace.to('support_admin_all').emit('new_message', message);
}

function emitMonitorMessage(monitorNamespace, message) {
  monitorNamespace.to('monitor_all').emit('new_message', message);
}

function emitAccessDenied(socket, eventName, chatId) {
  socket.emit(eventName, {
    chatId: normalizeChatId(chatId),
    message: 'chat access denied'
  });
}

function resolveBackendMessageTimestamp(rawMessage, fallback = Date.now()) {
  const candidates = [
    rawMessage?.timestamp,
    rawMessage?.createdAt,
    rawMessage?.updatedAt
  ];

  for (const candidate of candidates) {
    const numericValue = Number(candidate);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }

    const stringValue = String(candidate || '').trim();
    if (!stringValue) continue;

    const parsed = Date.parse(stringValue.replace(' ', 'T'));
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function mergeBackendMessage(localMessage, backendMessage) {
  if (!backendMessage || typeof backendMessage !== 'object') {
    return localMessage;
  }

  const timestamp = resolveBackendMessageTimestamp(
    backendMessage,
    Number(localMessage?.timestamp) || Date.now()
  );

  return {
    ...localMessage,
    ...backendMessage,
    id: backendMessage.id || localMessage.id,
    legacyId: backendMessage.legacyId || localMessage.legacyId || localMessage.id,
    externalMessageId:
      backendMessage.externalMessageId
      || localMessage.externalMessageId
      || String(localMessage.id || ''),
    timestamp,
    createdAt: backendMessage.createdAt ?? backendMessage.timestamp ?? localMessage.createdAt,
    updatedAt: backendMessage.updatedAt ?? localMessage.updatedAt,
    time:
      String(backendMessage.time || '').trim()
      || new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      }),
    status: backendMessage.status || localMessage.status || 'sent'
  };
}

function normalizeBackendTargetRole(value, socketUserRole = '') {
  const normalized = String(value || '').trim().toLowerCase();
  switch (normalized) {
    case 'merchant':
    case 'shop':
      return 'merchant';
    case 'rider':
      return 'rider';
    case 'user':
    case 'customer':
      return 'user';
    case 'admin':
    case 'support':
    case 'cs':
      return 'admin';
    default:
      return socketUserRole === 'admin' ? 'user' : 'admin';
  }
}

async function syncMessageToBackend(socket, chatId, rawData, message) {
  const authHeader = String(socket?.authToken || '').trim();
  if (!authHeader || !chatId || !message) return null;
  const requestId = buildSocketRequestId(socket, 'sync-message', chatId);

  const payload = {
    chatId,
    externalMessageId: String(message.id || ''),
    senderId: message.senderId,
    senderRole: message.senderRole,
    senderName: message.sender,
    content: message.content,
    messageType: message.messageType,
    coupon: message.coupon,
    order: message.order,
    imageUrl: message.imageUrl,
    avatar: message.avatar,
    targetType: normalizeBackendTargetRole(rawData?.targetType || rawData?.role, socket?.userRole),
    targetId: String(rawData?.targetId || '').trim(),
    targetPhone: String(rawData?.targetPhone || '').trim(),
    targetName: String(rawData?.targetName || rawData?.name || '').trim(),
    targetAvatar: String(rawData?.targetAvatar || rawData?.avatar || '').trim()
  };

  try {
    const { response, data } = await requestBackend('/api/messages/sync', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: payload,
      requestId
    });
    if (!response.ok) {
      logger.warn(
        `message sync to Go failed request_id=${requestId}:`,
        response.status,
        data?.error || ''
      );
      return null;
    }
    return mergeBackendMessage(message, data);
  } catch (err) {
    logger.warn(`message sync to Go failed request_id=${requestId}:`, err?.message || err);
    return null;
  }
}

async function markConversationReadOnBackend(socket, chatId) {
  const authHeader = String(socket?.authToken || '').trim();
  const normalizedChatId = normalizeChatId(chatId);
  if (!authHeader || !normalizedChatId) return;
  const requestId = buildSocketRequestId(socket, 'mark-read', normalizedChatId);

  try {
    const { response, data } = await requestBackend(
      `/api/messages/conversations/${encodeURIComponent(normalizedChatId)}/read`,
      {
        method: 'POST',
        headers: { Authorization: authHeader },
        requestId
      }
    );
    if (!response.ok && response.status !== 404) {
      logger.warn(
        `conversation read sync failed request_id=${requestId}:`,
        response.status,
        data?.error || ''
      );
    }
  } catch (err) {
    logger.warn(`conversation read sync failed request_id=${requestId}:`, err?.message || err);
  }
}

function createTransientSupportMessageId(chatId, data, messageData, timestamp) {
  const normalizedChatId = normalizeChatId(chatId);
  const tempId = String(data?.tempId || '').trim();
  if (tempId) {
    return `transient:${normalizedChatId}:${tempId}`;
  }

  const senderId = String(messageData?.senderId || 'anonymous').trim() || 'anonymous';
  const messageType = String(messageData?.messageType || 'text').trim() || 'text';
  return `transient:${normalizedChatId}:${senderId}:${messageType}:${timestamp}`;
}

function buildTransientSupportMessage(chatId, data, messageData, chatType, isMonitorIntervention) {
  const normalizedChatId = normalizeChatId(chatId);
  const timestamp = Date.now();
  const createdAt = new Date(timestamp).toISOString();
  const transientId = createTransientSupportMessageId(normalizedChatId, data, messageData, timestamp);

  return {
    id: transientId,
    legacyId: '',
    uid: '',
    tsid: '',
    externalMessageId: transientId,
    chatId: normalizedChatId,
    sender: messageData.sender,
    senderId: messageData.senderId,
    senderRole: messageData.senderRole,
    content: messageData.content,
    timestamp,
    createdAt,
    updatedAt: createdAt,
    time: new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    messageType: messageData.messageType,
    coupon: messageData.coupon,
    order: messageData.order,
    imageUrl: messageData.imageUrl,
    avatar: messageData.avatar,
    status: 'sent',
    chatType,
    officialIntervention: isMonitorIntervention,
    interventionLabel: isMonitorIntervention ? '官方介入' : ''
  };
}

function createSupportMessageHandler({ supportNamespace, monitorNamespace }) {
  return async function handleSendMessage(data, socket, chatType = 'support') {
    try {
      const normalizedChatId = normalizeChatId(data?.chatId);
      if (!normalizedChatId) {
        return null;
      }

      const isMonitorIntervention = socket?.nsp?.name === '/monitor' && socket?.userRole === 'admin';
      const messageData = normalizeMessageData(data, socket);
      if (isMonitorIntervention) {
        messageData.sender = '官方客服';
        messageData.senderRole = 'admin';
        if (String(messageData.messageType || 'text') === 'text') {
          const raw = String(messageData.content || '');
          messageData.content = raw.startsWith('[官方介入]') ? raw : `[官方介入] ${raw}`;
        }
      }

      const localMessage = buildTransientSupportMessage(
        normalizedChatId,
        data,
        messageData,
        chatType,
        isMonitorIntervention
      );
      const syncedMessage = await syncMessageToBackend(socket, normalizedChatId, data, localMessage);
      const message = syncedMessage || localMessage;

      logger.info('Broadcasting message:', message);
      emitSupportMessage(supportNamespace, normalizedChatId, message);
      emitMonitorMessage(monitorNamespace, message);

      socket.emit('message_sent', {
        chatId: normalizedChatId,
        tempId: data.tempId,
        messageId: message.id,
        status: 'sent',
        officialIntervention: isMonitorIntervention,
        timestamp: message.timestamp,
        createdAt: message.createdAt,
        time: message.time
      });

      return message;
    } catch (err) {
      logger.error('handleSendMessage error:', err);
      return null;
    }
  };
}

export function setupSupportNamespaces({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser
}) {
  const monitorNamespace = io.of('/monitor');
  const supportNamespace = io.of('/support');
  const handleSendMessage = createSupportMessageHandler({
    supportNamespace,
    monitorNamespace
  });

  monitorNamespace.use(authMiddleware);
  monitorNamespace.on('connection', (socket) => {
    if (socket.userRole !== 'admin') {
      socket.emit('error', { message: 'monitor namespace requires admin role' });
      socket.disconnect(true);
      return;
    }

    logger.info('Monitor connected:', socket.userId);
    addOnlineUser(socket.id, socket.userId, socket.userRole);

    socket.on('join_monitor', () => {
      socket.join('monitor_all');
      logger.info(`Admin ${socket.userId} (${socket.id}) joined monitor`);
    });

    socket.on('join_chat', async (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId) {
        emitAccessDenied(socket, 'join_chat_denied', data?.chatId);
        return;
      }
      socket.join(`chat_${chatId}`);
      await markConversationReadOnBackend(socket, chatId);
      logger.info(`Monitor admin joined chat_${chatId}`);
    });

    socket.on('send_message', async (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId) {
        emitAccessDenied(socket, 'message_denied', data?.chatId);
        return;
      }
      await handleSendMessage({ ...data, chatId }, socket);
    });

    socket.on('mark_read', (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId || !data?.messageId) {
        emitAccessDenied(socket, 'mark_read_denied', data?.chatId);
        return;
      }
      socket.to(`chat_${chatId}`).emit('message_read', {
        chatId,
        messageId: data.messageId,
        readBy: socket.userId
      });
    });

    socket.on('mark_all_read', async (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId) {
        emitAccessDenied(socket, 'mark_all_read_denied', data?.chatId);
        return;
      }
      socket.to(`chat_${chatId}`).emit('all_messages_read', { chatId, readBy: socket.userId });
      await markConversationReadOnBackend(socket, chatId);
    });

    socket.on('clear_messages', (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId) {
        emitAccessDenied(socket, 'clear_messages_denied', data?.chatId);
        return;
      }
      supportNamespace.to(`chat_${chatId}`).emit('messages_cleared', { chatId });
      monitorNamespace.to(`chat_${chatId}`).emit('messages_cleared', { chatId });
    });

    socket.on('disconnect', () => {
      removeOnlineUser(socket.id);
      logger.info('Monitor disconnected:', socket.userId);
    });
  });

  supportNamespace.use(authMiddleware);
  supportNamespace.on('connection', (socket) => {
    logger.info('Support connected:', socket.userId);
    addOnlineUser(socket.id, socket.userId, socket.userRole);

    if (socket.userRole === 'admin') {
      socket.join('support_admin_all');
    }

    socket.on('join_chat', async (data) => {
      const access = await authorizeSupportChatAccess(socket, data?.chatId);
      if (!access.allowed) {
        emitAccessDenied(socket, 'join_chat_denied', data?.chatId);
        return;
      }

      socket.join(`chat_${access.chatId}`);
      await markConversationReadOnBackend(socket, access.chatId);
      logger.info(`${socket.userRole} ${socket.userId} (${socket.id}) joined chat_${access.chatId}`);
    });

    socket.on('send_message', async (data) => {
      const access = await authorizeSupportChatAccess(socket, data?.chatId);
      if (!access.allowed) {
        emitAccessDenied(socket, 'message_denied', data?.chatId);
        return;
      }

      await handleSendMessage({ ...data, chatId: access.chatId }, socket);
    });

    socket.on('mark_read', async (data) => {
      const access = await authorizeSupportChatAccess(socket, data?.chatId);
      if (!access.allowed || !data?.messageId) {
        emitAccessDenied(socket, 'mark_read_denied', data?.chatId);
        return;
      }

      socket.to(`chat_${access.chatId}`).emit('message_read', {
        chatId: access.chatId,
        messageId: data.messageId,
        readBy: socket.userId
      });
    });

    socket.on('mark_all_read', async (data) => {
      const access = await authorizeSupportChatAccess(socket, data?.chatId);
      if (!access.allowed) {
        emitAccessDenied(socket, 'mark_all_read_denied', data?.chatId);
        return;
      }

      socket.to(`chat_${access.chatId}`).emit('all_messages_read', {
        chatId: access.chatId,
        readBy: socket.userId
      });
      await markConversationReadOnBackend(socket, access.chatId);
    });

    socket.on('clear_messages', (data) => {
      socket.emit('clear_messages_denied', {
        chatId: data?.chatId,
        message: '仅平台监控可彻底删除聊天记录'
      });
    });

    socket.on('disconnect', () => {
      removeOnlineUser(socket.id);
      logger.info('Support disconnected:', socket.userId);
    });
  });

  return {
    monitorNamespace,
    supportNamespace
  };
}
