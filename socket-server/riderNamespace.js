import { logger } from './logger.js';
import { normalizeMessageData } from './messagePayload.js';

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
  return {
    id: result.lastInsertRowid,
    chatId,
    sender: messageData.sender,
    senderId: messageData.senderId,
    senderRole: messageData.senderRole,
    content: messageData.content,
    messageType: messageData.messageType,
    avatar: messageData.avatar,
    timestamp: Date.now()
  };
}

function emitMessageSentAck(socket, messageId) {
  socket.emit('message_sent', { messageId, status: 'sent' });
}

function relayMessageToRider({ socket, riderNamespace, saveMessage, data, fromType, senderDefault, eventName }) {
  const riderId = String(data?.riderId || '').trim();
  if (!riderId) {
    socket.emit(`${eventName}_denied`, { message: 'missing riderId' });
    return;
  }

  const chatId = generateRiderChatId(riderId, socket.userId, fromType);
  const message = saveAndBuildRiderMessage(saveMessage, chatId, {
    chatId,
    content: data?.content,
    sender: data?.sender || senderDefault,
    messageType: data?.messageType || 'text',
    avatar: data?.avatar || ''
  }, socket);

  riderNamespace.to(`rider_${riderId}`).emit(eventName, message);
  emitMessageSentAck(socket, message.id);

  logger.info(`Rider relay ${message.senderRole} ${message.senderId} -> rider ${riderId}, chatId: ${chatId}`);
}

function relayRiderMessage({ socket, riderNamespace, saveMessage, data }) {
  const targetId = String(data?.targetId || '').trim();
  const targetType = String(data?.targetType || '').trim().toLowerCase();
  if (!targetId || !['merchant', 'user'].includes(targetType)) {
    socket.emit('rider_send_message_denied', { message: 'invalid rider chat target' });
    return;
  }

  const chatId = generateRiderChatId(socket.userId, targetId, targetType);
  const message = saveAndBuildRiderMessage(saveMessage, chatId, {
    chatId,
    content: data?.content,
    sender: '骑手',
    messageType: data?.messageType || 'text',
    avatar: data?.avatar || ''
  }, socket);

  if (targetType === 'merchant') {
    riderNamespace.to(`merchant_${targetId}`).emit('rider_message', message);
  } else {
    riderNamespace.to(`user_${targetId}`).emit('rider_message', message);
  }

  emitMessageSentAck(socket, message.id);
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
  const onlineRiders = new Map();

  riderNamespace.on('connection', (socket) => {
    logger.info('Rider connected:', socket.userId, 'Role:', socket.userRole);
    addOnlineUser(socket.id, socket.userId, socket.userRole);

    socket.on('join_rider', () => {
      if (!ensureSocketRole(socket, 'rider', 'join_rider')) {
        return;
      }

      const riderId = String(socket.userId || '').trim();
      socket.join(`rider_${riderId}`);
      onlineRiders.set(riderId, socket.id);
      logger.info(`Rider ${riderId} joined room rider_${riderId}`);
    });

    socket.on('send_to_rider', (data) => {
      if (!ensureSocketRole(socket, 'merchant', 'send_to_rider')) {
        return;
      }

      relayMessageToRider({
        socket,
        riderNamespace,
        saveMessage,
        data,
        fromType: 'merchant',
        senderDefault: '商家',
        eventName: 'merchant_message'
      });
    });

    socket.on('user_send_to_rider', (data) => {
      if (!ensureSocketRole(socket, 'user', 'user_send_to_rider')) {
        return;
      }

      relayMessageToRider({
        socket,
        riderNamespace,
        saveMessage,
        data,
        fromType: 'user',
        senderDefault: '顾客',
        eventName: 'user_message'
      });
    });

    socket.on('rider_send_message', (data) => {
      if (!ensureSocketRole(socket, 'rider', 'rider_send_message')) {
        return;
      }

      relayRiderMessage({
        socket,
        riderNamespace,
        saveMessage,
        data
      });
    });

    socket.on('disconnect', () => {
      for (const [riderId, sid] of onlineRiders.entries()) {
        if (sid === socket.id) {
          onlineRiders.delete(riderId);
          break;
        }
      }
      removeOnlineUser(socket.id);
      logger.info('Rider disconnected:', socket.userId);
    });
  });

  return {
    riderNamespace,
    onlineRiders
  };
}
