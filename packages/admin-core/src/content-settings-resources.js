import { extractPaginatedItems } from "../../contracts/src/http.js";

function trimText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value === true || value === 1 || value === "1" || value === "true";
}

export function createAdminPushMessageForm() {
  return {
    title: "",
    content: "",
    image_url: "",
    compress_image: true,
    is_active: false,
    scheduled_start_time: "",
    scheduled_end_time: "",
  };
}

export function normalizeAdminPushMessageFormState(message = {}) {
  return {
    ...createAdminPushMessageForm(),
    title: trimText(message.title),
    content: String(message.content || ""),
    image_url: trimText(message.image_url || message.imageUrl),
    compress_image: true,
    is_active: normalizeBoolean(message.is_active ?? message.isActive, false),
    scheduled_start_time: trimText(
      message.scheduled_start_time || message.scheduledStartTime,
    ),
    scheduled_end_time: trimText(
      message.scheduled_end_time || message.scheduledEndTime,
    ),
  };
}

export function normalizeAdminPushMessageRecord(message = {}) {
  return {
    ...message,
    ...normalizeAdminPushMessageFormState(message),
    id: message.id ?? message.message_id ?? message.messageId ?? "",
  };
}

export function createAdminCarouselForm() {
  return {
    title: "",
    image_url: "",
    link_url: "",
    link_type: "external",
    sort_order: 0,
    is_active: true,
  };
}

export function normalizeAdminCarouselRecord(record = {}) {
  return {
    ...record,
    id: record.id ?? record.carousel_id ?? record.carouselId ?? "",
    title: trimText(record.title),
    image_url: trimText(record.image_url || record.imageUrl),
    link_url: trimText(record.link_url || record.linkUrl),
    link_type: trimText(record.link_type || record.linkType) || "external",
    sort_order: normalizeNumber(record.sort_order ?? record.sortOrder, 0),
    is_active: normalizeBoolean(record.is_active ?? record.isActive, true),
  };
}

function normalizePage(payload, { listKeys, normalizeItem } = {}) {
  const page = extractPaginatedItems(payload, { listKeys });
  const items = Array.isArray(page.items) ? page.items : [];

  return {
    ...page,
    items: typeof normalizeItem === "function"
      ? items.map((item) => normalizeItem(item))
      : items,
  };
}

export function extractAdminPushMessagePage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["items", "messages", "push_messages", "records", "list"],
    normalizeItem: normalizeAdminPushMessageRecord,
  });
}

export function extractAdminCarouselPage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["items", "carousels", "records", "list"],
    normalizeItem: normalizeAdminCarouselRecord,
  });
}

export function extractAdminPushDeliveryPage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["items", "deliveries", "records", "list"],
  });
}

export function getPushDeliveryStatusTagType(status) {
  const normalized = trimText(status).toLowerCase();
  if (normalized === "acknowledged") {
    return "success";
  }
  if (normalized === "sent") {
    return "primary";
  }
  if (normalized === "dispatching" || normalized === "retry_pending") {
    return "warning";
  }
  if (normalized === "failed") {
    return "danger";
  }
  return "info";
}

export function getPushDeliveryActionTagType(action) {
  const normalized = trimText(action).toLowerCase();
  if (normalized === "opened") {
    return "success";
  }
  if (normalized === "received") {
    return "primary";
  }
  return "info";
}

export function formatPushDeliveryActionLabel(action) {
  const normalized = trimText(action).toLowerCase();
  if (normalized === "opened") {
    return "已打开";
  }
  if (normalized === "received") {
    return "已送达";
  }
  if (normalized === "dismissed") {
    return "已忽略";
  }
  if (!normalized) {
    return "未回执";
  }
  return normalized;
}

export function formatPushDeliveryTime(value) {
  const text = trimText(value);
  if (!text) {
    return "—";
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }
  return parsed.toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatPushDeliveryError(row = {}) {
  const code = trimText(row?.error_code || row?.errorCode);
  const message = trimText(row?.error_message || row?.errorMessage);
  if (code && message) {
    return `${code}: ${message}`;
  }
  if (message) {
    return message;
  }
  if (code) {
    return code;
  }
  return "—";
}

export function buildAdminPushMessageStats(message = {}, statsPayload = {}) {
  const payload =
    statsPayload && typeof statsPayload === "object" ? statsPayload : {};
  return {
    ...normalizeAdminPushMessageRecord(message),
    ...payload,
    read_rate_display:
      typeof payload.read_rate_percent === "number"
        ? `${payload.read_rate_percent.toFixed(2)}%`
        : "0.00%",
  };
}

export function validateAdminImageFile(file, maxMB = 10) {
  const isImage = Boolean(file?.type) && file.type.startsWith("image/");
  const isLtLimit = Number(file?.size || 0) / 1024 / 1024 < maxMB;

  if (!isImage) {
    return { valid: false, message: "只能上传图片文件!" };
  }
  if (!isLtLimit) {
    return { valid: false, message: `图片大小不能超过 ${maxMB}MB!` };
  }
  return { valid: true, message: "" };
}
