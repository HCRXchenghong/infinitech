import { extractEnvelopeData, extractPaginatedItems } from "../../contracts/src/http.js";

function trimMessageText(value) {
  return String(value || "").trim();
}

export const CONSUMER_NOTIFICATION_READ_EVENT = "official-notification-read";
export const CONSUMER_REALTIME_NOTIFICATION_REFRESH_EVENT =
  "realtime:refresh:notifications";
export const CONSUMER_MESSAGE_SESSION_VISIBLE_MAX_AGE =
  30 * 24 * 60 * 60 * 1000;
export const DEFAULT_CONSUMER_NOTIFICATION_PAGE_SIZE = 20;
export const DEFAULT_CONSUMER_NOTIFICATION_SOURCE = "悦享e食";

export const DEFAULT_CONSUMER_MESSAGE_CENTER_UI = {
  title: "消息",
  clearUnread: "清除未读",
  notificationName: "官方通知",
  notificationTag: "系统",
  noNotification: "暂无通知",
  emptyTitle: "暂无消息",
  emptyHint: "你的会话会显示在这里",
  footer: "仅显示最近一个月的消息",
  clearUnreadSuccess: "已清除未读",
  clearUnreadFailure: "清除未读失败，请稍后重试",
  roleRider: "骑手",
  roleShop: "商家",
  roleSupport: "客服",
  emptyTime: "--:--",
  tabs: {
    all: "全部",
    rider: "骑手",
    shop: "商家",
    notification: "通知",
  },
};

export const DEFAULT_CONSUMER_MESSAGE_TABS = [
  { id: "all" },
  { id: "rider" },
  { id: "shop" },
  { id: "notification" },
];

export function createDefaultConsumerMessageTabs() {
  return DEFAULT_CONSUMER_MESSAGE_TABS.map((item) => ({ ...item }));
}

export function normalizeConsumerMessageRole(role) {
  const value = trimMessageText(role).toLowerCase();
  if (value === "rider") return "rider";
  if (value === "shop" || value === "merchant") return "shop";
  return "cs";
}

export function parseConsumerMessageTimestamp(raw) {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return 0;
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }
    }
    const parsed = new Date(trimmed).getTime();
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  if (raw instanceof Date) {
    const value = raw.getTime();
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

export function formatConsumerMessageClock(
  raw,
  emptyLabel = DEFAULT_CONSUMER_MESSAGE_CENTER_UI.emptyTime,
) {
  if (typeof raw === "string") {
    const match = raw.trim().match(/(\d{2}:\d{2})$/);
    if (match) {
      return match[1];
    }
  }

  const timestamp = parseConsumerMessageTimestamp(raw);
  if (!timestamp) {
    return emptyLabel;
  }

  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export function resolveConsumerMessageSessionUpdatedAt(item = {}) {
  const candidates = [
    item.updatedAt,
    item.updated_at,
    item.lastMessageAt,
    item.last_message_at,
    item.latestAt,
    item.latest_at,
    item.timestamp,
    item.createdAt,
    item.created_at,
  ];

  for (const candidate of candidates) {
    const value = parseConsumerMessageTimestamp(candidate);
    if (value > 0) {
      return value;
    }
  }

  return 0;
}

export function isConsumerMessageSessionRecent(
  item = {},
  now = Date.now(),
  maxAge = CONSUMER_MESSAGE_SESSION_VISIBLE_MAX_AGE,
) {
  const updatedAt = Number(item.updatedAt || 0);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
    return true;
  }
  return now - updatedAt <= maxAge;
}

export function sortConsumerMessageSessions(list = []) {
  return list.slice().sort((a, b) => {
    const diff = Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
    if (diff !== 0) {
      return diff;
    }
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

export function resolveConsumerMessageSessionId(item = {}, role = "cs", roomId = "") {
  const directId = item.id || item.chatId || roomId;
  if (directId) {
    return String(directId);
  }

  const targetSeed =
    item.targetId ||
    item.orderId ||
    item.userId ||
    item.riderId ||
    item.shopId ||
    item.senderId ||
    item.name ||
    "unknown";

  return `session_${role}_${String(targetSeed)}`;
}

export function resolveConsumerMessageDefaultName(
  role,
  supportTitle = DEFAULT_CONSUMER_MESSAGE_CENTER_UI.roleSupport,
  ui = DEFAULT_CONSUMER_MESSAGE_CENTER_UI,
) {
  if (role === "rider") return ui.roleRider;
  if (role === "shop") return ui.roleShop;
  return trimMessageText(supportTitle) || ui.roleSupport;
}

export function getConsumerMessageRoleTag(
  role,
  supportTitle = DEFAULT_CONSUMER_MESSAGE_CENTER_UI.roleSupport,
  ui = DEFAULT_CONSUMER_MESSAGE_CENTER_UI,
) {
  const tags = {
    rider: ui.roleRider,
    shop: ui.roleShop,
    cs: trimMessageText(supportTitle) || ui.roleSupport,
  };
  return tags[role] || "";
}

export function getConsumerMessageRoleTagClass(role) {
  const classes = {
    rider: "tag-rider",
    shop: "tag-shop",
    cs: "tag-cs",
  };
  return classes[role] || "";
}

export function normalizeConsumerMessageSession(
  item = {},
  {
    supportTitle = DEFAULT_CONSUMER_MESSAGE_CENTER_UI.roleSupport,
    ui = DEFAULT_CONSUMER_MESSAGE_CENTER_UI,
  } = {},
) {
  const role = normalizeConsumerMessageRole(item.role);
  const roomId = trimMessageText(item.roomId || item.chatId || item.id);
  const updatedAt = resolveConsumerMessageSessionUpdatedAt(item);

  return {
    id: resolveConsumerMessageSessionId(item, role, roomId),
    roomId,
    role,
    orderId: trimMessageText(item.orderId),
    targetId: trimMessageText(item.targetId),
    name:
      trimMessageText(item.name) ||
      resolveConsumerMessageDefaultName(role, supportTitle, ui),
    avatarUrl: trimMessageText(
      item.avatarUrl ||
        item.avatar ||
        (role === "shop"
          ? "/static/images/default-shop.svg"
          : role === "cs"
            ? "/static/images/logo.png"
            : "/static/images/default-avatar.svg"),
    ),
    tag: getConsumerMessageRoleTag(role, supportTitle, ui),
    tagClass: getConsumerMessageRoleTagClass(role),
    time:
      trimMessageText(item.time) ||
      formatConsumerMessageClock(updatedAt, ui.emptyTime),
    unread: Number(item.unread || 0),
    online: item.online === true,
    updatedAt,
  };
}

export function extractConsumerConversationRecords(payload) {
  const data = extractEnvelopeData(payload);
  if (Array.isArray(data)) {
    return data;
  }
  return extractPaginatedItems(payload, {
    listKeys: ["conversations", "items", "records", "list"],
  }).items;
}

export function normalizeConsumerMessageSessions(
  payload,
  options = {},
) {
  return sortConsumerMessageSessions(
    extractConsumerConversationRecords(payload)
      .map((item) => normalizeConsumerMessageSession(item, options))
      .filter((item) => item.roomId && isConsumerMessageSessionRecent(item)),
  );
}

export function filterConsumerMessageSessions(sessions = [], currentTab = "all") {
  if (currentTab === "all") return sessions;
  if (currentTab === "rider") {
    return sessions.filter((item) => item.role === "rider");
  }
  if (currentTab === "shop") {
    return sessions.filter((item) => item.role === "shop");
  }
  if (currentTab === "notification") {
    return [];
  }
  return sessions;
}

export function shouldShowConsumerMessageEmptyState(
  sessions = [],
  currentTab = "all",
) {
  return (
    filterConsumerMessageSessions(sessions, currentTab).length === 0 &&
    currentTab !== "all" &&
    currentTab !== "notification"
  );
}

export function shouldShowConsumerMessageFooter(
  sessions = [],
  currentTab = "all",
) {
  return (
    filterConsumerMessageSessions(sessions, currentTab).length > 0 ||
    currentTab === "all" ||
    currentTab === "notification"
  );
}

export function buildConsumerMessageNotificationSummary(
  payload,
  ui = DEFAULT_CONSUMER_MESSAGE_CENTER_UI,
) {
  const data = extractEnvelopeData(payload);
  const source =
    data && typeof data === "object" && !Array.isArray(data)
      ? data
      : payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload
        : {};
  const unread = Number(source.unreadCount || source.unread_count || 0);
  const latestTime = trimMessageText(source.latestAt || source.latest_at);

  return {
    unread: Number.isFinite(unread) ? unread : 0,
    time: latestTime
      ? formatConsumerMessageClock(latestTime, ui.noNotification)
      : ui.noNotification,
  };
}

export function buildConsumerMessageChatPageUrl(item = {}) {
  const normalizedRole = normalizeConsumerMessageRole(item.role);
  const chatType = normalizedRole === "cs" ? "support" : "direct";
  const roomId = trimMessageText(item.roomId || item.id);

  return (
    "/pages/message/chat/index?chatType=" +
    encodeURIComponent(chatType) +
    "&roomId=" +
    encodeURIComponent(roomId) +
    "&name=" +
    encodeURIComponent(item.name || "") +
    "&role=" +
    encodeURIComponent(item.role || normalizedRole) +
    "&avatar=" +
    encodeURIComponent(item.avatarUrl || "") +
    "&targetId=" +
    encodeURIComponent(item.targetId || "") +
    "&orderId=" +
    encodeURIComponent(item.orderId || "")
  );
}

export function normalizeConsumerNotificationRecord(item = {}) {
  const source =
    item && typeof item === "object" && !Array.isArray(item) ? item : {};
  return {
    ...source,
    id: trimMessageText(source.id || source.notificationId || source.notification_id),
    title: trimMessageText(source.title),
    summary: trimMessageText(
      source.summary || source.description || source.excerpt,
    ),
    source: trimMessageText(source.source) || DEFAULT_CONSUMER_NOTIFICATION_SOURCE,
    cover: trimMessageText(
      source.cover || source.coverUrl || source.image || source.banner,
    ),
    created_at: trimMessageText(source.created_at || source.createdAt || source.time),
    is_read: Boolean(source.is_read ?? source.isRead),
    isRead: Boolean(source.is_read ?? source.isRead),
  };
}

export function extractConsumerNotificationRecords(payload) {
  const data = extractEnvelopeData(payload);
  if (Array.isArray(data)) {
    return data;
  }
  return extractPaginatedItems(payload, {
    listKeys: ["notifications", "items", "records", "list"],
  }).items;
}

export function buildConsumerNotificationPageResult(
  payload,
  pageSize = DEFAULT_CONSUMER_NOTIFICATION_PAGE_SIZE,
) {
  const items = extractConsumerNotificationRecords(payload).map(
    normalizeConsumerNotificationRecord,
  );
  return {
    items,
    hasMore: items.length >= Number(pageSize || DEFAULT_CONSUMER_NOTIFICATION_PAGE_SIZE),
  };
}

export function appendConsumerNotificationRecords(existing = [], incoming = []) {
  const merged = [];
  const seen = new Set();
  for (const item of [...existing, ...incoming]) {
    const normalized = normalizeConsumerNotificationRecord(item);
    const key = normalized.id || `${normalized.title}_${normalized.created_at}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(normalized);
  }
  return merged;
}

export function markConsumerNotificationRecordRead(records = [], targetId = "") {
  const normalizedTargetId = trimMessageText(targetId);
  if (!normalizedTargetId) {
    return records;
  }
  return records.map((item) => {
    const normalized = normalizeConsumerNotificationRecord(item);
    if (normalized.id !== normalizedTargetId) {
      return normalized;
    }
    return {
      ...normalized,
      is_read: true,
      isRead: true,
    };
  });
}
