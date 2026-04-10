import { logger } from './logger.js';

function normalizeNotifyRole(value) {
  const role = String(value || '').trim().toLowerCase();
  if (role === 'customer') return 'user';
  if (role === 'user' || role === 'rider' || role === 'merchant' || role === 'admin') {
    return role;
  }
  return '';
}

function buildNotifyRoom(role, userId) {
  const normalizedRole = normalizeNotifyRole(role);
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedRole) return '';
  if (normalizedUserId === '*' || normalizedUserId === 'all') {
    return `${normalizedRole}_all`;
  }
  if (!normalizedUserId) return '';
  return `${normalizedRole}_${normalizedUserId}`;
}

export function publishRealtimeEvent(notifyNamespace, eventName, recipients, payload) {
  if (!notifyNamespace) {
    return { emittedRooms: [], emittedCount: 0 };
  }

  const rooms = [];
  const seenRooms = new Set();
  const safeEventName = String(eventName || '').trim() || 'business_notification';

  for (const recipient of Array.isArray(recipients) ? recipients : []) {
    const room = buildNotifyRoom(recipient?.role, recipient?.userId);
    if (!room || seenRooms.has(room)) continue;
    seenRooms.add(room);
    rooms.push(room);
    notifyNamespace.to(room).emit(safeEventName, payload);
  }

  return {
    emittedRooms: rooms,
    emittedCount: rooms.length
  };
}

export function setupNotifyNamespace({ io, authMiddleware, addOnlineUser, removeOnlineUser }) {
  const notifyNamespace = io.of('/notify');
  notifyNamespace.use(authMiddleware);

  notifyNamespace.on('connection', (socket) => {
    logger.info('Notify connected:', socket.userId, 'Role:', socket.userRole);
    addOnlineUser(socket.id, socket.userId, socket.userRole);

    const selfRoom = buildNotifyRoom(socket.userRole, socket.userId);
    if (selfRoom) {
      socket.join(selfRoom);
    }
    const normalizedRole = normalizeNotifyRole(socket.userRole);
    if (normalizedRole) {
      socket.join(`${normalizedRole}_all`);
    }

    socket.emit('notify_ready', {
      userId: socket.userId,
      role: socket.userRole,
      room: selfRoom
    });

    socket.on('disconnect', () => {
      removeOnlineUser(socket.id);
      logger.info('Notify disconnected:', socket.userId);
    });
  });

  return {
    notifyNamespace
  };
}
