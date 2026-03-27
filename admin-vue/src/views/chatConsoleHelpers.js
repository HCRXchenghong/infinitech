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

export function mapLoadedChats(list) {
  return (list || []).map((chat) => ({
    id: normalizeChatId(chat.id),
    name: chat.name || `聊天 #${chat.id}`,
    phone: chat.phone || '',
    role: chat.role || 'user',
    avatar: chat.avatar || null,
    lastMessage: chat.lastMessage || '',
    time: chat.time || '',
    unread: chat.unread || 0
  }));
}

export function mapCachedMessages(list) {
  return (list || []).map((item) => ({
    id: item.id,
    sender: item.sender,
    content: item.content,
    time: formatMessageTime(item.timestamp || Date.now()),
    isSelf: item.senderRole === 'admin',
    type: item.messageType,
    coupon: item.coupon,
    order: item.order,
    avatar: item.avatar
  }));
}

export function mapLoadedMessages(list) {
  return (list || []).map((item) => ({
    id: item.id,
    sender: item.sender,
    senderId: item.senderId,
    senderRole: item.senderRole,
    content: item.content,
    time: item.time,
    isSelf: item.senderRole === 'admin',
    type: item.messageType || 'text',
    coupon: item.coupon,
    order: item.order,
    avatar: item.avatar,
    status: item.status || 'sent'
  }));
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
  return {
    id,
    sender,
    content,
    time: formatMessageTime(Date.now()),
    isSelf: true,
    type,
    coupon,
    order,
    status
  };
}

export function createIncomingDisplayMessage(data) {
  return {
    id: data.id || Date.now(),
    sender: data.sender,
    senderId: data.senderId,
    senderRole: data.senderRole,
    content: data.content,
    time: data.time,
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
      unread: adminMessage ? 0 : 1
    };
    chats.unshift(chat);
    return chat;
  }

  if (!adminMessage) chat.unread = (chat.unread || 0) + 1;
  chat.lastMessage = preview;
  chat.time = data.time;
  if (data.avatar && data.senderRole !== 'admin') chat.avatar = data.avatar;
  return chat;
}
