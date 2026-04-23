import { normalizeRoleChatRole } from "./role-chat-portal.js";

const DEFAULT_ROLE_CHAT_ROUTE_BASE_URL = "/pages/service/index";
const DEFAULT_ROLE_CHAT_ALLOWED_ROLES = ["user", "merchant", "rider", "admin"];
const DEFAULT_ROLE_CHAT_ORDER_ID_FIELDS = [
  "id",
  "orderId",
  "order_id",
  "daily_order_id",
];

function trimRoleChatNavigationValue(value) {
  return String(value ?? "").trim();
}

function encodeRoleChatNavigationValue(value) {
  return encodeURIComponent(trimRoleChatNavigationValue(value));
}

function normalizeRoleChatNavigationFields(value, fallback) {
  const fields = Array.isArray(value) ? value : fallback;
  const normalized = fields
    .map((field) => trimRoleChatNavigationValue(field))
    .filter(Boolean);
  return normalized.length ? normalized : [...fallback];
}

export function resolveRoleChatOrderId(record, fields = DEFAULT_ROLE_CHAT_ORDER_ID_FIELDS) {
  const source = record && typeof record === "object" && !Array.isArray(record) ? record : {};
  const orderIdFields = normalizeRoleChatNavigationFields(fields, DEFAULT_ROLE_CHAT_ORDER_ID_FIELDS);

  for (const field of orderIdFields) {
    const value = source[field];
    if (value !== undefined && value !== null) {
      const text = trimRoleChatNavigationValue(value);
      if (text) {
        return text;
      }
    }
  }

  return "";
}

export function buildRoleChatRouteUrl(options = {}) {
  const settings = options && typeof options === "object" && !Array.isArray(options) ? options : {};
  const baseUrl = trimRoleChatNavigationValue(settings.baseUrl) || DEFAULT_ROLE_CHAT_ROUTE_BASE_URL;
  const chatId = trimRoleChatNavigationValue(settings.chatId);
  const normalizedRole = normalizeRoleChatRole(settings.role, {
    allowedRoles: settings.allowedRoles || DEFAULT_ROLE_CHAT_ALLOWED_ROLES,
    defaultRole: "user",
  });
  const query = [
    `chatId=${encodeRoleChatNavigationValue(chatId)}`,
    `role=${encodeRoleChatNavigationValue(normalizedRole)}`,
  ];

  const name = trimRoleChatNavigationValue(settings.name);
  const targetId = trimRoleChatNavigationValue(settings.targetId);
  const orderId = trimRoleChatNavigationValue(settings.orderId);

  if (name) {
    query.push(`name=${encodeRoleChatNavigationValue(name)}`);
  }
  if (targetId) {
    query.push(`targetId=${encodeRoleChatNavigationValue(targetId)}`);
  }
  if (orderId) {
    query.push(`orderId=${encodeRoleChatNavigationValue(orderId)}`);
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return query.length ? `${baseUrl}${separator}${query.join("&")}` : baseUrl;
}

export function navigateToRoleChat(uniApp, options = {}) {
  const url = buildRoleChatRouteUrl(options);
  uniApp?.navigateTo?.({ url });
  return url;
}
