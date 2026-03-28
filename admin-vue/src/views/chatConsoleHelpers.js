const TIME_OPTIONS = { hour: '2-digit', minute: '2-digit' };

export function normalizeChatId(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function messageKey(chatId, messageId) {
  if (messageId === undefined || messageId === null || messageId === '') return '';
  return `${normalizeChatId(chatId)}:${String(messageId)}`;
}

export function createSeenMessageTracker(limit = 6000) {
  const seenMessageKeys = new Set();

  function hasSeenMessage(chatId, messageId) {
    const key = messageKey(chatId, messageId);
    if (!key) return false;
    if (seenMessageKeys.has(key)) return true;
    seenMessageKeys.add(key);
    if (seenMessageKeys.size > limit) {
      const first = seenMessageKeys.values().next().value;
      if (first) seenMessageKeys.delete(first);
    }
    return false;
  }

  return { hasSeenMessage };
}

export function isAdminSender(data) {
  const role = String(data?.senderRole || '').toLowerCase();
  const senderId = String(data?.senderId || '');
  return role === 'admin' || senderId.startsWith('admin');
}

export function getMessagePreview(data) {
  if (data?.messageType === 'image') return '[图片]';
  if (data?.messageType === 'coupon') return '[优惠券]';
  if (data?.messageType === 'order') return '[订单]';
  return data?.content || '';
}

export function formatMessageTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', TIME_OPTIONS);
}

export function resolveMessageTimestamp(rawValue, fallback = Date.now()) {
  const value = Number(rawValue);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function resolveConversationTimestamp(rawValue, fallback = 0) {
  if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue > 0) {
    return rawValue;
  }
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (!trimmed) return fallback;
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric) && numeric > 0) return numeric;
    }
    const parsed = new Date(trimmed).getTime();
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  if (rawValue instanceof Date) {
    const value = rawValue.getTime();
    if (Number.isFinite(value) && value > 0) return value;
  }
  return fallback;
}

export function sortChats(list = []) {
  return [...(list || [])].sort((a, b) => {
    const diff = Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
    if (diff !== 0) return diff;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
}

export function mapLoadedChats(list) {
  return (list || []).map((chat) => {
    const updatedAt = resolveConversationTimestamp(
      chat.updatedAt || chat.updated_at || chat.lastMessageAt || chat.last_message_at || chat.timestamp,
      0
    );
    return {
      id: normalizeChatId(chat.id),
      name: chat.name || `聊天 #${chat.id}`,
      phone: chat.phone || '',
      role: chat.role || 'user',
      avatar: chat.avatar || null,
      lastMessage: chat.lastMessage || '',
      time: chat.time || '',
      unread: chat.unread || 0,
      updatedAt
    };
  });
}

export function mapCachedMessages(list) {
  return (list || []).map((item) => ({
    timestamp: resolveMessageTimestamp(item.timestamp, Date.now()),
    id: item.id,
    sender: item.sender,
    content: item.content,
    time: formatMessageTime(resolveMessageTimestamp(item.timestamp, Date.now())),
    isSelf: item.senderRole === 'admin',
    type: item.messageType,
    coupon: item.coupon,
    order: item.order,
    avatar: item.avatar
  }));
}

export function mapLoadedMessages(list) {
  return (list || []).map((item, index) => {
    const timestamp = resolveMessageTimestamp(item?.timestamp || item?.createdAt, Date.now() + index);
    return {
      id: item.id,
      sender: item.sender,
      senderId: item.senderId,
      senderRole: item.senderRole,
      content: item.content,
      timestamp,
      time: item.time || formatMessageTime(timestamp),
      isSelf: item.senderRole === 'admin',
      type: item.messageType || 'text',
      coupon: item.coupon,
      order: item.order,
      avatar: item.avatar,
      status: item.status || 'sent'
    };
  });
}

export function createOutgoingTempMessage({
  id,
  content,
  type = 'text',
  sender = '客服',
  coupon,
  order,
  status
}) {
  const timestamp = Date.now();
  return {
    id,
    sender,
    content,
    timestamp,
    time: formatMessageTime(timestamp),
    isSelf: true,
    type,
    coupon,
    order,
    status
  };
}

export function createIncomingDisplayMessage(data) {
  const timestamp = resolveMessageTimestamp(data?.timestamp || data?.createdAt, Date.now());
  return {
    id: data.id || Date.now(),
    sender: data.sender,
    senderId: data.senderId,
    senderRole: data.senderRole,
    content: data.content,
    timestamp,
    time: data.time || formatMessageTime(timestamp),
    isSelf: false,
    type: data.messageType || 'text',
    coupon: data.coupon,
    order: data.order,
    avatar: data.avatar
  };
}

function toDbRecord(chatId, message) {
  return {
    id: message.id,
    chatId,
    sender: message.sender,
    senderId: message.senderId,
    senderRole: message.senderRole,
    content: message.content,
    messageType: message.messageType,
    coupon: message.coupon,
    order: message.order,
    imageUrl: message.imageUrl,
    avatar: message.avatar
  };
}

export function saveIncomingMessage(messageDB, chatId, message) {
  return messageDB.saveMessage({
    ...toDbRecord(chatId, message),
    timestamp: message.timestamp
  });
}

export async function saveLoadedMessages(messageDB, chatId, list) {
  await messageDB.clearMessages(chatId);

  const baseTimestamp = Date.now();
  for (const [index, message] of (list || []).entries()) {
    await messageDB.saveMessage({
      ...toDbRecord(chatId, message),
      timestamp: Number.isFinite(Number(message?.timestamp))
        ? Number(message.timestamp)
        : baseTimestamp + index
    });
  }
}

export function upsertChatFromIncoming({
  chats,
  incomingChatId,
  data,
  adminMessage,
  defaultName = '聊天'
}) {
  const incomingUpdatedAt = resolveConversationTimestamp(data?.timestamp || data?.createdAt, 0);
  let chat = chats.find((item) => normalizeChatId(item.id) === incomingChatId);
  const preview = getMessagePreview(data);

  if (!chat) {
    chat = {
      id: incomingChatId,
      name: data.sender || defaultName,
      phone: data.senderId || '',
      avatar: data.avatar || null,
      lastMessage: preview,
      time: data.time,
      unread: adminMessage ? 0 : 1,
      updatedAt: incomingUpdatedAt
    };
    chats.push(chat);
    const reordered = sortChats(chats);
    chats.splice(0, chats.length, ...reordered);
    return chat;
  }

  if (!adminMessage) chat.unread = (chat.unread || 0) + 1;
  chat.lastMessage = preview;
  chat.time = data.time;
  chat.updatedAt = incomingUpdatedAt || chat.updatedAt || 0;
  if (data.avatar && data.senderRole !== 'admin') chat.avatar = data.avatar;
  const reordered = sortChats(chats);
  chats.splice(0, chats.length, ...reordered);
  return chat;
}
