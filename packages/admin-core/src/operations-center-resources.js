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

export function formatCooperationType(type) {
  if (type === "feedback") {
    return "用户反馈";
  }
  if (type === "cooperation") {
    return "商务合作";
  }
  return trimText(type) || "未分类";
}

export function getCooperationTypeTagType(type) {
  return type === "feedback" ? "info" : "success";
}

export function normalizeOperationsCooperationRecord(record = {}) {
  return {
    ...record,
    id: record.id ?? record.cooperation_id ?? record.cooperationId ?? "",
    company: trimText(record.company),
    cooperation_type: trimText(record.cooperation_type || record.cooperationType),
    contact_name: trimText(record.contact_name || record.contactName),
    contact_phone: trimText(record.contact_phone || record.contactPhone),
    description: trimText(record.description),
    created_at: record.created_at ?? record.createdAt ?? "",
    status: trimText(record.status) || "pending",
    admin_remark: trimText(record.admin_remark || record.adminRemark),
  };
}

export function extractOperationsCooperationPage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["items", "cooperations", "records", "list"],
    normalizeItem: normalizeOperationsCooperationRecord,
  });
}

export function extractOperationsInviteCodePage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["items", "codes", "records", "list"],
  });
}

export function extractOperationsInviteRecordPage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["items", "invite_records", "records", "list"],
  });
}

export function extractOperationsRedemptionPage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["items", "redemptions", "records", "list"],
  });
}

export function createOperationsGoodForm() {
  return {
    id: null,
    name: "",
    points: 0,
    ship_fee: 0,
    tag: "",
    type: "goods",
    desc: "",
    is_active: true,
  };
}

export function normalizeOperationsGoodRecord(record = {}) {
  return {
    ...record,
    id: record.id ?? record.good_id ?? record.goodId ?? null,
    name: trimText(record.name),
    points: normalizeNumber(record.points, 0),
    ship_fee: normalizeNumber(record.ship_fee ?? record.shipFee, 0),
    tag: trimText(record.tag),
    type: trimText(record.type) || "goods",
    desc: trimText(record.desc || record.description),
    is_active: normalizeBoolean(record.is_active ?? record.isActive, true),
  };
}

export function createOperationsGoodFormState(record = {}) {
  if (!record || Object.keys(record).length === 0) {
    return createOperationsGoodForm();
  }
  return {
    ...createOperationsGoodForm(),
    ...normalizeOperationsGoodRecord(record),
  };
}

export function extractOperationsGoodsPage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["items", "goods", "records", "list"],
    normalizeItem: normalizeOperationsGoodRecord,
  });
}
