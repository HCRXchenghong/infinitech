import { logger } from './logger.js';
import { normalizeMessageData } from './messagePayload.js';
import { authorizeSupportChatAccess, normalizeChatId } from './supportAccess.js';

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

function buildSupportChatList(db, getUnreadCount, userId, options = {}) {
  const defaultRole = options.defaultRole || 'user';
  const fallbackRoleFromRow = Boolean(options.fallbackRoleFromRow);
  const chats = db.prepare(`
    SELECT m.chat_id, m.sender, m.sender_id, m.sender_role, m.content, m.message_type, m.created_at
    FROM messages m
    INNER JOIN (
      SELECT chat_id, MAX(id) as max_id
      FROM messages
      WHERE chat_type = 'support'
      GROUP BY chat_id
    ) latest ON m.id = latest.max_id
    ORDER BY m.created_at DESC
  `).all();

  return chats.map((row) => {
    const nameRow = db.prepare(`
      SELECT sender, sender_id, sender_role, avatar FROM messages
      WHERE chat_type = 'support' AND chat_id = ? AND sender_role != 'admin'
      ORDER BY id DESC LIMIT 1
    `).get(row.chat_id);

    return {
      id: row.chat_id,
      name: nameRow ? nameRow.sender : row.sender,
      phone: nameRow ? nameRow.sender_id : (row.sender_id || ''),
      role: nameRow
        ? nameRow.sender_role
        : (fallbackRoleFromRow ? (row.sender_role || defaultRole) : defaultRole),
      avatar: nameRow ? nameRow.avatar : null,
      lastMessage: resolveSupportPreview(row.message_type, row.content),
      time: new Date(row.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      unread: getUnreadCount('support', row.chat_id, userId)
    };
  });
}

function createSupportMessageHandler({ saveMessage, supportNamespace, monitorNamespace }) {
  return function handleSendMessage(data, socket, chatType = 'support') {
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

      const result = saveMessage(chatType, normalizedChatId, messageData);
      const message = {
        id: result.lastInsertRowid,
        chatId: normalizedChatId,
        sender: messageData.sender,
        senderId: messageData.senderId,
        senderRole: messageData.senderRole,
        content: messageData.content,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
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

      logger.info('Broadcasting message:', message);
      emitSupportMessage(supportNamespace, normalizedChatId, message);
      emitMonitorMessage(monitorNamespace, message);

      socket.emit('message_sent', {
        tempId: data.tempId,
        messageId: message.id,
        status: 'sent',
        officialIntervention: isMonitorIntervention
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
  db,
  getMessages,
  saveMessage,
  clearMessages,
  markAsRead,
  markAllRead,
  getUnreadCount
}) {
  const monitorNamespace = io.of('/monitor');
  const supportNamespace = io.of('/support');
  const handleSendMessage = createSupportMessageHandler({
    saveMessage,
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
      const chatList = buildSupportChatList(db, getUnreadCount, socket.userId, { defaultRole: 'user' });
      socket.emit('all_chats_loaded', { chats: chatList });
    });

    socket.on('join_chat', (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId) {
        emitAccessDenied(socket, 'join_chat_denied', data?.chatId);
        return;
      }
      socket.join(`chat_${chatId}`);
      logger.info(`Monitor admin joined chat_${chatId}`);
    });

    socket.on('load_messages', (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId) {
        emitAccessDenied(socket, 'load_messages_denied', data?.chatId);
        return;
      }
      const messages = getMessages('support', chatId);
      socket.emit('messages_loaded', { chatId, messages });
    });

    socket.on('send_message', (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId) {
        emitAccessDenied(socket, 'message_denied', data?.chatId);
        return;
      }
      handleSendMessage({ ...data, chatId }, socket);
    });

    socket.on('mark_read', (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId || !data?.messageId) {
        emitAccessDenied(socket, 'mark_read_denied', data?.chatId);
        return;
      }
      markAsRead(data.messageId);
      socket.to(`chat_${chatId}`).emit('message_read', { messageId: data.messageId, readBy: socket.userId });
    });

    socket.on('mark_all_read', (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId) {
        emitAccessDenied(socket, 'mark_all_read_denied', data?.chatId);
        return;
      }
      markAllRead('support', chatId, socket.userId);
      socket.to(`chat_${chatId}`).emit('all_messages_read', { chatId, readBy: socket.userId });
    });

    socket.on('clear_messages', (data) => {
      const chatId = normalizeChatId(data?.chatId);
      if (!chatId) {
        emitAccessDenied(socket, 'clear_messages_denied', data?.chatId);
        return;
      }
      clearMessages('support', chatId);
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
      logger.info(`${socket.userRole} ${socket.userId} (${socket.id}) joined chat_${access.chatId}`);
    });

    socket.on('load_all_chats', () => {
      if (socket.userRole !== 'admin') {
        socket.emit('all_chats_loaded', { chats: [] });
        return;
      }

      const chatList = buildSupportChatList(db, getUnreadCount, socket.userId, {
        defaultRole: 'user',
        fallbackRoleFromRow: true
      });
      socket.emit('all_chats_loaded', { chats: chatList });
    });

    socket.on('load_messages', async (data) => {
      const access = await authorizeSupportChatAccess(socket, data?.chatId);
      if (!access.allowed) {
        emitAccessDenied(socket, 'load_messages_denied', data?.chatId);
        return;
      }

      const messages = getMessages('support', access.chatId);
      socket.emit('messages_loaded', { chatId: access.chatId, messages });
    });

    socket.on('send_message', async (data) => {
      const access = await authorizeSupportChatAccess(socket, data?.chatId);
      if (!access.allowed) {
        emitAccessDenied(socket, 'message_denied', data?.chatId);
        return;
      }

      handleSendMessage({ ...data, chatId: access.chatId }, socket);
    });

    socket.on('mark_read', async (data) => {
      const access = await authorizeSupportChatAccess(socket, data?.chatId);
      if (!access.allowed || !data?.messageId) {
        emitAccessDenied(socket, 'mark_read_denied', data?.chatId);
        return;
      }

      markAsRead(data.messageId);
      socket.to(`chat_${access.chatId}`).emit('message_read', { messageId: data.messageId, readBy: socket.userId });
    });

    socket.on('mark_all_read', async (data) => {
      const access = await authorizeSupportChatAccess(socket, data?.chatId);
      if (!access.allowed) {
        emitAccessDenied(socket, 'mark_all_read_denied', data?.chatId);
        return;
      }

      markAllRead('support', access.chatId, socket.userId);
      socket.to(`chat_${access.chatId}`).emit('all_messages_read', { chatId: access.chatId, readBy: socket.userId });
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
