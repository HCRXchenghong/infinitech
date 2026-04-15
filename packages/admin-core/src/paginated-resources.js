import { extractEnvelopeData, extractPaginatedItems } from "../../contracts/src/http.js";

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function resolveSummaryField(source = {}, key) {
  if (!key) {
    return undefined;
  }
  if (source[key] !== undefined) {
    return source[key];
  }
  if (!key.includes("_")) {
    return undefined;
  }
  const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
  return source[camelKey];
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

function normalizeSummary(source = {}, keys = []) {
  const summary = {};
  for (const key of keys) {
    summary[key] = normalizeNumber(resolveSummaryField(source, key), 0);
  }
  return summary;
}

function buildListResult(payload, options = {}) {
  const data = extractEnvelopeData(payload);
  const summaryKeys = Array.isArray(options.summaryKeys) ? options.summaryKeys : [];
  const page = extractPaginatedItems(payload, {
    listKeys: options.listKeys,
  });
  const source = data && typeof data === "object" ? data : {};
  const nestedSummary = source.summary && typeof source.summary === "object" ? source.summary : null;
  const summarySource = nestedSummary || source;

  return {
    items: page.items,
    total: page.total,
    page: page.page,
    limit: page.limit,
    summary: normalizeSummary(summarySource, summaryKeys),
    pagination: {
      page: page.page,
      limit: page.limit,
      total: page.total,
    },
  };
}

export function extractContactPhoneAuditPage(payload = {}) {
  return buildListResult(payload, {
    summaryKeys: ["total", "clicked", "opened", "failed"],
  });
}

export function extractRTCCallAuditPage(payload = {}) {
  return buildListResult(payload, {
    summaryKeys: ["total", "accepted", "ended", "failed", "complaints"],
  });
}

export function extractRTCCallAuditRecord(payload = {}) {
  const data = extractEnvelopeData(payload);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }
  return data;
}

export function extractShopReviewPage(payload = {}) {
  return buildListResult(payload, {
    listKeys: ["items", "list"],
    summaryKeys: ["goodCount", "badCount", "avgRating"],
  });
}

export function extractRiderReviewPage(payload = {}) {
  const page = buildListResult(payload, {
    listKeys: ["items", "list"],
    summaryKeys: ["rating", "rating_count"],
  });

  return {
    ...page,
    summary: {
      ...page.summary,
      ratingCount: page.summary.rating_count,
    },
  };
}
