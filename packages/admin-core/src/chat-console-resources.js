const TIME_OPTIONS = { hour: "2-digit", minute: "2-digit" };

export function normalizeChatId(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

export function resolveMessageId(data, timestamp, fallbackPrefix = "incoming") {
  const directId = data?.id || data?.uid || data?.tsid;
  if (directId !== undefined && directId !== null && directId !== "") {
    return String(directId);
  }

  const chatId = normalizeChatId(
    data?.chatId || data?.roomId || data?.conversationId || data?.senderId || "chat",
  );
  const senderRole = String(data?.senderRole || "unknown");
  const messageType = String(data?.messageType || data?.type || "text");
  return `${fallbackPrefix}_${chatId}_${senderRole}_${timestamp}_${messageType}`;
}

function messageKey(chatId, messageId) {
  if (messageId === undefined || messageId === null || messageId === "") {
    return "";
  }
  return `${normalizeChatId(chatId)}:${String(messageId)}`;
}

function normalizeUnreadCount(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
}

export function createSeenMessageTracker(limit = 6000) {
  const seenMessageKeys = new Set();

  function hasSeenMessage(chatId, messageId) {
    const key = messageKey(chatId, messageId);
    if (!key) {
      return false;
    }
    if (seenMessageKeys.has(key)) {
      return true;
    }
    seenMessageKeys.add(key);
    if (seenMessageKeys.size > limit) {
      const first = seenMessageKeys.values().next().value;
      if (first) {
        seenMessageKeys.delete(first);
      }
    }
    return false;
  }

  return { hasSeenMessage };
}

export function isAdminSender(data) {
  const role = String(data?.senderRole || "").toLowerCase();
  const senderId = String(data?.senderId || "");
  return role === "admin" || senderId.startsWith("admin");
}

export function getMessagePreview(data) {
  if (data?.messageType === "image") {
    return "[Image]";
  }
  if (data?.messageType === "coupon") {
    return "[Coupon]";
  }
  if (data?.messageType === "order") {
    return "[Order]";
  }
  return String(data?.content || "").trim() || "[No messages yet]";
}

export function formatMessageTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("zh-CN", TIME_OPTIONS);
}

export function resolveMessageTimestamp(rawValue, fallback = Date.now()) {
  const value = Number(rawValue);
  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return fallback;
    }
    const parsed = Date.parse(trimmed.replace(" ", "T"));
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  if (rawValue instanceof Date) {
    const parsed = rawValue.getTime();
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

export function resolveConversationTimestamp(rawValue, fallback = 0) {
  if (typeof rawValue === "number" && Number.isFinite(rawValue) && rawValue > 0) {
    return rawValue;
  }
  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return fallback;
    }
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }
    }
    const parsed = new Date(trimmed.replace(" ", "T")).getTime();
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  if (rawValue instanceof Date) {
    const value = rawValue.getTime();
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return fallback;
}

export function sortChats(list = []) {
  return [...(list || [])].sort((a, b) => {
    const diff = Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
    if (diff !== 0) {
      return diff;
    }
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

export function mapLoadedChats(list) {
  return (list || []).map((chat) => {
    const updatedAt = resolveConversationTimestamp(
      chat.updatedAt || chat.updated_at || chat.lastMessageAt || chat.last_message_at || chat.timestamp,
      0,
    );
    const chatId = normalizeChatId(chat.id || chat.chatId || chat.roomId);
    return {
      id: chatId,
      name: String(chat.name || "").trim() || `Chat #${chatId || "unknown"}`,
      phone: chat.phone || "",
      role: chat.role || "user",
      avatar: chat.avatar || null,
      lastMessage: String(chat.lastMessage || chat.msg || "").trim() || "[No messages yet]",
      time: String(chat.time || "").trim() || (updatedAt ? formatMessageTime(updatedAt) : ""),
      unread: normalizeUnreadCount(chat.unread),
      updatedAt,
    };
  });
}

export function mapLoadedMessages(list) {
  return (list || []).map((item, index) => {
    const timestamp = resolveMessageTimestamp(item?.timestamp || item?.createdAt, Date.now() + index);
    return {
      id: resolveMessageId(item, timestamp, "history"),
      sender: item.sender,
      senderId: item.senderId,
      senderRole: item.senderRole,
      content: item.content,
      timestamp,
      time: item.time || formatMessageTime(timestamp),
      isSelf: item.senderRole === "admin",
      type: item.messageType || "text",
      coupon: item.coupon,
      order: item.order,
      avatar: item.avatar,
      status: item.status || "sent",
    };
  });
}

export function createOutgoingTempMessage({
  id,
  content,
  type = "text",
  sender = "Support",
  coupon,
  order,
  status,
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
    status,
  };
}

export function createIncomingDisplayMessage(data) {
  const timestamp = resolveMessageTimestamp(data?.timestamp || data?.createdAt, Date.now());
  return {
    id: resolveMessageId(data, timestamp),
    sender: data.sender,
    senderId: data.senderId,
    senderRole: data.senderRole,
    content: data.content,
    timestamp,
    time: data.time || formatMessageTime(timestamp),
    isSelf: false,
    type: data.messageType || "text",
    coupon: data.coupon,
    order: data.order,
    avatar: data.avatar,
  };
}
