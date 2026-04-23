import {
  normalizeOrder as normalizeCustomerServiceChatOrder,
  resolveMessageTimestamp as resolveCustomerServiceChatMessageTimestamp,
} from "./customer-service-chat-utils.js";

const DEFAULT_ROLE_CHAT_ALLOWED_ROLES = ["user", "merchant", "rider", "admin"];
const DEFAULT_ROLE_CHAT_ADMIN_ALIASES = {
  support: "admin",
  cs: "admin",
};
const DEFAULT_ROLE_CHAT_ORDER_STATUS_MAP = {
  pending: "待接单",
  accepted: "已接单",
  delivering: "配送中",
  picked_up: "配送中",
  completed: "已完成",
  cancelled: "已取消",
  priced: "待付款",
};

function trimRoleChatValue(value) {
  return String(value ?? "").trim();
}

function normalizeRoleChatOptions(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeRoleChatAllowedRoles(value) {
  const roles = Array.isArray(value) ? value : DEFAULT_ROLE_CHAT_ALLOWED_ROLES;
  const normalized = roles
    .map((role) => trimRoleChatValue(role).toLowerCase())
    .filter(Boolean);
  return normalized.length ? normalized : [...DEFAULT_ROLE_CHAT_ALLOWED_ROLES];
}

function normalizeRoleChatAdminAliases(value) {
  const aliases = normalizeRoleChatOptions(value);
  return {
    ...DEFAULT_ROLE_CHAT_ADMIN_ALIASES,
    ...aliases,
  };
}

function normalizeRoleChatSeed(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }
  return Math.floor(numericValue);
}

export function safeDecodeRoleChatValue(value) {
  try {
    return decodeURIComponent(String(value ?? ""));
  } catch (_error) {
    return String(value ?? "");
  }
}

export function normalizeRoleChatRole(value, options = {}) {
  const settings = normalizeRoleChatOptions(options);
  const allowedRoles = normalizeRoleChatAllowedRoles(settings.allowedRoles);
  const aliases = normalizeRoleChatAdminAliases(settings.aliasMap);
  const fallbackRole = allowedRoles.includes(trimRoleChatValue(settings.defaultRole).toLowerCase())
    ? trimRoleChatValue(settings.defaultRole).toLowerCase()
    : allowedRoles[0] || "user";
  const normalizedRole = trimRoleChatValue(value).toLowerCase();
  if (!normalizedRole) {
    return fallbackRole;
  }

  const resolvedRole = trimRoleChatValue(aliases[normalizedRole] || normalizedRole).toLowerCase();
  return allowedRoles.includes(resolvedRole) ? resolvedRole : fallbackRole;
}

export function resolveRoleChatMessageTimestamp(rawValue, fallback = Date.now()) {
  const resolvedFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : Date.now();
  const normalized = resolveCustomerServiceChatMessageTimestamp(rawValue, Number.NaN);
  if (Number.isFinite(normalized) && normalized > 0) {
    return normalized;
  }

  const text = trimRoleChatValue(rawValue);
  if (text) {
    const parsedValue = Date.parse(text.replace(" ", "T"));
    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      return parsedValue;
    }
  }

  return resolvedFallback;
}

export function formatRoleChatClockTime(timestamp = Date.now()) {
  const safeTimestamp = resolveRoleChatMessageTimestamp(timestamp, 0);
  const date = new Date(safeTimestamp || Date.now());
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function resolveRoleChatMessageId(payload, fallback = "message", options = {}) {
  const source = normalizeRoleChatOptions(payload);
  const settings = normalizeRoleChatOptions(options);
  const idFields = Array.isArray(settings.idFields) && settings.idFields.length
    ? settings.idFields
    : ["id", "uid", "tsid", "messageId", "mid"];

  for (const field of idFields) {
    const value = source[field];
    if (value !== undefined && value !== null && trimRoleChatValue(value)) {
      return String(value);
    }
  }

  const contentFields = Array.isArray(settings.contentFields) && settings.contentFields.length
    ? settings.contentFields
    : ["content", "text"];
  let contentValue = "";
  for (const field of contentFields) {
    const value = source[field];
    if (value !== undefined && value !== null) {
      contentValue = String(value);
      break;
    }
  }

  const timestamp = resolveRoleChatMessageTimestamp(
    source.timestamp ?? source.createdAt,
    Date.now(),
  );
  const senderRole = trimRoleChatValue(source.senderRole) || "unknown";
  const senderId = trimRoleChatValue(source.senderId) || "unknown";
  const messageType = trimRoleChatValue(source.messageType || source.type) || "text";
  const contentSeed = contentValue
    .trim()
    .slice(0, 24)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, "");

  return `${trimRoleChatValue(fallback) || "message"}_${senderRole}_${senderId}_${messageType}_${timestamp}_${contentSeed || "empty"}`;
}

export function createRoleChatLocalMessageId(options = {}) {
  const settings = normalizeRoleChatOptions(options);
  const timestamp = resolveRoleChatMessageTimestamp(settings.timestamp, Date.now());
  const seed = normalizeRoleChatSeed(settings.seed) + 1;
  const prefix = trimRoleChatValue(settings.prefix) || "local";
  const chatId = trimRoleChatValue(settings.chatId) || "chat";

  return {
    id: `${prefix}_${chatId}_${timestamp}_${seed}`,
    seed,
    timestamp,
  };
}

function resolveRoleChatTargetId(options = {}) {
  const settings = normalizeRoleChatOptions(options);
  const targetId = trimRoleChatValue(settings.targetId);
  if (targetId) {
    return targetId;
  }

  const normalizedRole = normalizeRoleChatRole(settings.role, {
    allowedRoles: settings.allowedRoles,
    aliasMap: settings.aliasMap,
    defaultRole: settings.defaultRole,
  });
  if (normalizedRole === "admin") {
    return trimRoleChatValue(settings.adminFallbackTargetId) || "support";
  }

  return "";
}

export function buildRoleChatConversationPayload(options = {}) {
  const settings = normalizeRoleChatOptions(options);
  const payload = {
    chatId: trimRoleChatValue(settings.chatId),
    targetType: trimRoleChatValue(settings.targetType) || "user",
    targetId: resolveRoleChatTargetId({
      targetId: settings.targetId,
      role: settings.role,
      adminFallbackTargetId: settings.adminFallbackTargetId,
      allowedRoles: settings.allowedRoles,
      aliasMap: settings.aliasMap,
      defaultRole: settings.defaultRole,
    }),
    targetPhone: trimRoleChatValue(settings.targetPhone),
    targetName: trimRoleChatValue(settings.targetName),
    targetAvatar: trimRoleChatValue(settings.targetAvatar),
  };

  if (Object.prototype.hasOwnProperty.call(settings, "targetOrderId")) {
    payload.targetOrderId = trimRoleChatValue(settings.targetOrderId);
  }

  return payload;
}

export function buildRoleChatOutgoingPayload(options = {}) {
  const settings = normalizeRoleChatOptions(options);
  return {
    ...buildRoleChatConversationPayload(settings),
    senderId: trimRoleChatValue(settings.senderId),
    senderRole: trimRoleChatValue(settings.senderRole),
    sender: trimRoleChatValue(settings.sender),
    avatar: trimRoleChatValue(settings.avatar),
    messageType: trimRoleChatValue(settings.messageType) || "text",
    content: settings.content ?? "",
    tempId: trimRoleChatValue(settings.tempId),
    ...normalizeRoleChatOptions(settings.extraFields),
  };
}

export function normalizeRoleChatOrder(order) {
  const normalized = normalizeCustomerServiceChatOrder(order);
  if (!normalized) {
    return null;
  }

  let raw = order;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (_error) {
      raw = {};
    }
  }
  const rawSource = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const source = normalized && typeof normalized === "object"
    ? normalized
    : {};
  const sourceAmount =
    rawSource.amount !== undefined && rawSource.amount !== null
      ? rawSource.amount
      : rawSource.price !== undefined && rawSource.price !== null
        ? rawSource.price
        : rawSource.deliveryFee !== undefined && rawSource.deliveryFee !== null
          ? rawSource.deliveryFee
          : rawSource.delivery_fee !== undefined && rawSource.delivery_fee !== null
            ? rawSource.delivery_fee
            : rawSource.totalPrice !== undefined && rawSource.totalPrice !== null
              ? rawSource.totalPrice
              : rawSource.total_price !== undefined && rawSource.total_price !== null
                ? rawSource.total_price
                : source.amount !== undefined && source.amount !== null
                  ? source.amount
                  : 0;
  const amount = Number(sourceAmount);

  return {
    ...source,
    amount: Number.isFinite(amount) ? amount : 0,
    shopName: rawSource.shopName || rawSource.shop_name || rawSource.food_shop || source.shopName || "",
  };
}

export function formatRoleChatOrderNo(order) {
  const normalized = normalizeRoleChatOrder(order);
  if (!normalized) {
    return "--";
  }

  return normalized.orderNo || normalized.order_no || normalized.daily_order_id || normalized.id || "--";
}

export function formatRoleChatOrderAmount(order) {
  const normalized = normalizeRoleChatOrder(order);
  if (!normalized) {
    return "0.00";
  }

  return Number(normalized.amount || 0).toFixed(2);
}

export function getRoleChatOrderStatusText(order, statusMap = DEFAULT_ROLE_CHAT_ORDER_STATUS_MAP) {
  const normalized = normalizeRoleChatOrder(order);
  if (!normalized) {
    return "订单信息";
  }

  if (normalized.statusText) {
    return normalized.statusText;
  }

  const status = trimRoleChatValue(normalized.status);
  if (!status) {
    return "订单信息";
  }

  return statusMap[status] || status || "订单信息";
}
