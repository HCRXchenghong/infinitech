import { extractPaginatedItems } from "../../contracts/src/http.js";

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
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

export function extractAdminUserPage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["users", "items"],
  });
}

export function normalizeAdminRiderSummary(raw = {}) {
  return {
    ...raw,
    is_online: raw.is_online === 1 || raw.is_online === true,
    rating: normalizeNumber(raw.rating, 0),
    rating_count: normalizeNumber(raw.rating_count ?? raw.ratingCount, 0),
  };
}

export function extractAdminRiderPage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["riders", "items"],
    normalizeItem: normalizeAdminRiderSummary,
  });
}

export function normalizeAdminMerchantSummary(raw = {}) {
  return {
    ...raw,
    owner_name: String(raw.owner_name || raw.ownerName || raw.name || "").trim(),
    shopCount: normalizeNumber(raw.shopCount ?? raw.shop_count, 0),
  };
}

export function extractAdminMerchantPage(payload = {}) {
  return normalizePage(payload, {
    listKeys: ["merchants", "items"],
    normalizeItem: normalizeAdminMerchantSummary,
  });
}
