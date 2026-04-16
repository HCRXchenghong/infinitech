import { extractPaginatedItems } from "../../contracts/src/http.js";
import { DEFAULT_NOTIFICATION_SOURCE } from "../../domain-core/src/notification-content.js";

function trimText(value) {
  return String(value == null ? "" : value).trim();
}

function isPublished(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function timeToNumber(raw) {
  if (!raw) {
    return 0;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }
  return date.getTime();
}

export function normalizeAdminNotificationRecord(raw = {}) {
  const normalized = {
    ...raw,
    id: raw.id ?? raw.notification_id ?? raw.notificationId ?? "",
    title: trimText(raw.title),
    source: trimText(raw.source) || DEFAULT_NOTIFICATION_SOURCE,
    cover: trimText(raw.cover),
    is_published: isPublished(raw.is_published ?? raw.isPublished),
    created_at: raw.created_at ?? raw.createdAt ?? "",
    updated_at: raw.updated_at ?? raw.updatedAt ?? "",
  };

  return normalized;
}

export function extractAdminNotificationPage(payload = {}) {
  const page = extractPaginatedItems(payload, {
    listKeys: ["items", "notifications", "records", "list"],
  });

  return {
    ...page,
    items: Array.isArray(page.items)
      ? page.items.map((item) => normalizeAdminNotificationRecord(item))
      : [],
  };
}

export function sortAdminNotificationsByUpdatedAt(records = []) {
  return (Array.isArray(records) ? records : [])
    .map((item) => normalizeAdminNotificationRecord(item))
    .sort(
      (left, right) =>
        timeToNumber(right.updated_at || right.created_at) -
        timeToNumber(left.updated_at || left.created_at),
    );
}

export function filterAdminNotifications(records = [], filters = {}) {
  const keyword = trimText(filters.keyword).toLowerCase();
  const status = trimText(filters.status) || "all";

  return (Array.isArray(records) ? records : []).filter((item) => {
    const normalized = normalizeAdminNotificationRecord(item);
    const title = trimText(normalized.title).toLowerCase();
    const source = trimText(normalized.source).toLowerCase();
    const matchKeyword =
      !keyword || title.includes(keyword) || source.includes(keyword);

    if (!matchKeyword) {
      return false;
    }
    if (status === "published") {
      return normalized.is_published;
    }
    if (status === "draft") {
      return !normalized.is_published;
    }
    return true;
  });
}

export function buildAdminNotificationSummary(records = []) {
  const normalized = Array.isArray(records)
    ? records.map((item) => normalizeAdminNotificationRecord(item))
    : [];
  const published = normalized.filter((item) => item.is_published).length;

  return {
    total: normalized.length,
    published,
    draft: normalized.length - published,
  };
}

export function formatAdminNotificationStatus(value) {
  return isPublished(value) ? "已发布" : "草稿";
}

export function getAdminNotificationStatusTagType(value) {
  return isPublished(value) ? "success" : "info";
}

export function formatAdminNotificationTime(raw) {
  if (!raw) {
    return "-";
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return String(raw);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}
