import { logger } from './logger.js';
import { normalizeMessageData } from './messagePayload.js';
import { authorizeSupportChatAccess, normalizeChatId } from './supportAccess.js';
import { requestBackend } from './socketIdentity.js';
import { buildSocketRequestId } from './requestId.js';
import {
  recordHistoryRefreshWrite,
  recordMessageHistoryFallback
} from './database.js';

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toBoolean(value, fallback) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

const SUPPORT_HISTORY_FALLBACK_ENABLED = toBoolean(process.env.SOCKET_ENABLE_HISTORY_FALLBACK, false);

export function getSupportHistoryFallbackConfig() {
  return {
    enabled: SUPPORT_HISTORY_FALLBACK_ENABLED
  };
}

function getSupportFallbackMessages(getMessages, chatId) {
  if (!SUPPORT_HISTORY_FALLBACK_ENABLED || typeof getMessages !== 'function') {
    return [];
  }
  return getMessages('support', chatId);
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

function resolveSupportPreview(messageType, content) {
  switch (String(messageType || 'text')) {
    case 'image':
      return '[图片]';
    case 'coupon':
      return '[优惠券]';
    case 'order':
      return '[订单]';
    case 'audio':
      return '[语音]';
    case 'location':
      return '[位置]';
    default:
      return String(content || '').trim() || '[消息]';
  }
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

  const timestamp = resolveBackendMessageTimestamp(backendMessage, Number(localMessage?.timestamp) || Date.now());
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
  if (!authHeader || !chatId || !message) return;
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
      logger.warn(`消息同步到 Go 失败 request_id=${requestId}:`, response.status, data?.error || '');
      return null;
    }
    return mergeBackendMessage(message, data);
  } catch (err) {
    logger.warn(`消息同步到 Go 失败 request_id=${requestId}:`, err?.message || err);
    return null;
  }
}

async function markConversationReadOnBackend(socket, chatId, markAllReadFn = null) {
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
      logger.warn(`会话已读状态同步失败 request_id=${requestId}:`, response.status, data?.error || '');
      return;
    }
    if (SUPPORT_HISTORY_FALLBACK_ENABLED && typeof markAllReadFn === 'function') {
      markAllReadFn('support', normalizedChatId, socket.userId);
    }
  } catch (err) {
    logger.warn(`会话已读状态同步失败 request_id=${requestId}:`, err?.message || err);
  }
}

async function fetchConversationListFromBackend(socket) {
  const authHeader = String(socket?.authToken || '').trim();
  if (!authHeader) return [];
  const requestId = buildSocketRequestId(socket, 'list-conversations');

  try {
    const { response, data } = await requestBackend('/api/messages/conversations', {
      headers: { Authorization: authHeader },
      requestId
    });
    if (response.ok && Array.isArray(data)) {
      return data;
    }
    logger.warn(`会话列表从 Go 加载失败 request_id=${requestId}，回退本地列表:`, response.status, data?.error || '');
  } catch (err) {
    logger.warn(`会话列表从 Go 加载失败 request_id=${requestId}，回退本地列表:`, err?.message || err);
  }

  return [];
}

async function fetchMessagesFromBackend(socket, chatId, fallbackMessages = []) {
  const authHeader = String(socket?.authToken || '').trim();
  const normalizedChatId = normalizeChatId(chatId);
  if (!authHeader || !normalizedChatId) return [];
  const requestId = buildSocketRequestId(socket, 'load-messages', normalizedChatId);
  const canUseFallback = SUPPORT_HISTORY_FALLBACK_ENABLED
    && Array.isArray(fallbackMessages)
    && fallbackMessages.length > 0;

  try {
    const { response, data } = await requestBackend(`/api/messages/${encodeURIComponent(normalizedChatId)}`, {
      headers: { Authorization: authHeader },
      requestId
    });
    if (response.ok && Array.isArray(data)) {
      return data;
    }
    if (canUseFallback) {
      recordMessageHistoryFallback();
    }
    logger.warn(`消息历史从 Go 加载失败 request_id=${requestId}，回退本地历史:`, response.status, data?.error || '');
  } catch (err) {
    if (canUseFallback) {
      recordMessageHistoryFallback();
    }
    logger.warn(`消息历史从 Go 加载失败 request_id=${requestId}，回退本地历史:`, err?.message || err);
  }

  return canUseFallback ? fallbackMessages : [];
}

function refreshFallbackHistory(replaceMessages, chatId, messages) {
  if (!SUPPORT_HISTORY_FALLBACK_ENABLED) {
    return;
  }

  if (typeof replaceMessages !== 'function') {
    return;
  }

  const normalizedChatId = normalizeChatId(chatId);
  if (!normalizedChatId || !Array.isArray(messages)) {
    return;
  }

  try {
    replaceMessages('support', normalizedChatId, messages.map((message) => ({
      ...message,
      chatId: normalizedChatId
    })));
    recordHistoryRefreshWrite(messages.length);
  } catch (err) {
    logger.warn(`客服历史回写本地兜底库失败 chatId=${normalizedChatId}:`, err?.message || err);
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

function createSupportMessageHandler({ saveMessage, reconcileMessage, supportNamespace, monitorNamespace }) {
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

      if (!SUPPORT_HISTORY_FALLBACK_ENABLED) {
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
      }

      const result = saveMessage(chatType, normalizedChatId, messageData);
      const timestamp = Number.isFinite(Number(result?.timestamp))
        ? Number(result.timestamp)
        : Date.now();
      const createdAt = String(result?.createdAt || '');
      const time = new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const localMessage = {
        id: result.uid || result.lastInsertRowid,
        legacyId: result.lastInsertRowid,
        uid: result.uid || '',
        tsid: result.tsid || '',
        chatId: normalizedChatId,
        sender: messageData.sender,
        senderId: messageData.senderId,
        senderRole: messageData.senderRole,
        content: messageData.content,
        timestamp,
        createdAt,
        time,
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

      const syncedMessage = await syncMessageToBackend(socket, normalizedChatId, data, localMessage);
      const message = syncedMessage || localMessage;
      if (syncedMessage && typeof reconcileMessage === 'function') {
        reconcileMessage(chatType, normalizedChatId, localMessage.id, localMessage.legacyId, syncedMessage);
      }

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
  removeOnlineUser,
  getMessages,
  saveMessage,
  reconcileMessage,
  clearMessages,
  replaceMessages,
  markAsRead,
  markAllRead,
  getUnreadCount
}) {
  const monitorNamespace = io.of('/monitor');
  const supportNamespace = io.of('/support');
  const handleSendMessage = createSupportMessageHandler({
    saveMessage,
    reconcileMessage,
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

    socket.on('load_all_chats', () => {
      void (async () => {
        const chatList = await fetchConversationListFromBackend(socket);
        socket.emit('all_chats_loaded', { chats: chatList });
      })();
    });

    socket.on('join_chat', async (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId) {
        emitAccessDenied(socket, 'join_chat_denied', data?.chatId);
        return;
      }
      socket.join(`chat_${chatId}`);
      await markConversationReadOnBackend(socket, chatId, markAllRead);
      logger.info(`Monitor admin joined chat_${chatId}`);
    });

    socket.on('load_messages', async (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId) {
        emitAccessDenied(socket, 'load_messages_denied', data?.chatId);
        return;
      }
      const fallbackMessages = getSupportFallbackMessages(getMessages, chatId);
      const messages = await fetchMessagesFromBackend(socket, chatId, fallbackMessages);
      if (messages !== fallbackMessages) {
        refreshFallbackHistory(replaceMessages, chatId, messages);
      }
      socket.emit('messages_loaded', { chatId, messages });
      await markConversationReadOnBackend(socket, chatId, markAllRead);
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
      if (SUPPORT_HISTORY_FALLBACK_ENABLED) {
        markAsRead(data.messageId);
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
      if (SUPPORT_HISTORY_FALLBACK_ENABLED) {
        markAllRead('support', chatId, socket.userId);
      }
      socket.to(`chat_${chatId}`).emit('all_messages_read', { chatId, readBy: socket.userId });
      await markConversationReadOnBackend(socket, chatId, markAllRead);
    });

    socket.on('clear_messages', (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId) {
        emitAccessDenied(socket, 'clear_messages_denied', data?.chatId);
        return;
      }
      if (SUPPORT_HISTORY_FALLBACK_ENABLED) {
        clearMessages('support', chatId);
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
      await markConversationReadOnBackend(socket, access.chatId, markAllRead);
      logger.info(`${socket.userRole} ${socket.userId} (${socket.id}) joined chat_${access.chatId}`);
    });

    socket.on('load_all_chats', () => {
      if (socket.userRole !== 'admin') {
        socket.emit('all_chats_loaded', { chats: [] });
        return;
      }

      void (async () => {
        const chatList = await fetchConversationListFromBackend(socket);
        socket.emit('all_chats_loaded', { chats: chatList });
      })();
    });

    socket.on('load_messages', async (data) => {
      const access = await authorizeSupportChatAccess(socket, data?.chatId);
      if (!access.allowed) {
        emitAccessDenied(socket, 'load_messages_denied', data?.chatId);
        return;
      }

      const fallbackMessages = getSupportFallbackMessages(getMessages, access.chatId);
      const messages = await fetchMessagesFromBackend(socket, access.chatId, fallbackMessages);
      if (messages !== fallbackMessages) {
        refreshFallbackHistory(replaceMessages, access.chatId, messages);
      }
      socket.emit('messages_loaded', { chatId: access.chatId, messages });
      await markConversationReadOnBackend(socket, access.chatId, markAllRead);
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

      if (SUPPORT_HISTORY_FALLBACK_ENABLED) {
        markAsRead(data.messageId);
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

      if (SUPPORT_HISTORY_FALLBACK_ENABLED) {
        markAllRead('support', access.chatId, socket.userId);
      }
      socket.to(`chat_${access.chatId}`).emit('all_messages_read', { chatId: access.chatId, readBy: socket.userId });
      await markConversationReadOnBackend(socket, access.chatId, markAllRead);
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
