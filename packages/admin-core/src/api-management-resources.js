function normalizeTrimmedText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized || fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(text)) {
      return true;
    }
    if (["0", "false", "no", "off", ""].includes(text)) {
      return false;
    }
  }
  return fallback;
}

export const PUBLIC_API_PERMISSION_CATALOG = Object.freeze([
  {
    key: "orders",
    label: "订单数据",
    type: "primary",
    description: "适合订单列表、订单详情、订单统计类调用。",
    examples: Object.freeze([
      "/api/public/orders",
      "/api/public/orders/:id",
      "/api/public/orders/stats",
    ]),
  },
  {
    key: "users",
    label: "用户数据",
    type: "success",
    description: "适合用户列表、用户详情、用户统计类调用。",
    examples: Object.freeze([
      "/api/public/users",
      "/api/public/users/:id",
      "/api/public/users/stats",
    ]),
  },
  {
    key: "riders",
    label: "骑手数据",
    type: "warning",
    description: "适合骑手列表、骑手详情、骑手统计类调用。",
    examples: Object.freeze([
      "/api/public/riders",
      "/api/public/riders/:id",
      "/api/public/riders/stats",
    ]),
  },
  {
    key: "merchants",
    label: "商户数据",
    type: "success",
    description: "适合商户列表、商户详情和商户基础信息查询。",
    examples: Object.freeze([
      "/api/public/merchants",
      "/api/public/merchants/:id",
    ]),
  },
  {
    key: "products",
    label: "商品数据",
    type: "primary",
    description: "适合商品列表、商品详情和商品筛选类调用。",
    examples: Object.freeze([
      "/api/public/products",
      "/api/public/products/:id",
    ]),
  },
  {
    key: "categories",
    label: "分类数据",
    type: "info",
    description: "适合商品分类树、分类筛选和导航类调用。",
    examples: Object.freeze([
      "/api/public/categories",
      "/api/public/categories/tree",
    ]),
  },
  {
    key: "dashboard",
    label: "仪表盘数据",
    type: "info",
    description: "适合平台统计、用户排行、骑手排行类调用。",
    examples: Object.freeze([
      "/api/public/dashboard/stats",
      "/api/public/dashboard/user-ranks",
      "/api/public/dashboard/rider-ranks",
    ]),
  },
  {
    key: "all",
    label: "全部数据",
    type: "danger",
    description: "包含全部权限，适合内部系统或统一数据中台使用。",
    examples: Object.freeze(["包含以上全部公开接口"]),
  },
]);

export const PUBLIC_API_RESOURCE_PERMISSIONS = Object.freeze(
  PUBLIC_API_PERMISSION_CATALOG.filter((item) => item.key !== "all").map(
    (item) => item.key,
  ),
);

export const PUBLIC_API_PERMISSION_OPTIONS = Object.freeze(
  PUBLIC_API_PERMISSION_CATALOG.map((item) =>
    Object.freeze({ value: item.key, label: item.label }),
  ),
);

const PUBLIC_API_PERMISSION_LABELS = Object.freeze(
  PUBLIC_API_PERMISSION_CATALOG.reduce((result, item) => {
    result[item.key] = item.label;
    return result;
  }, {}),
);

function parsePermissionTokens(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeTrimmedText(item)).filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  const text = value.trim();
  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed)
      ? parsed.map((item) => normalizeTrimmedText(item)).filter(Boolean)
      : [text];
  } catch (_error) {
    return text
      .split(",")
      .map((item) => normalizeTrimmedText(item))
      .filter(Boolean);
  }
}

export function normalizePublicApiPermissionList(value) {
  const selected = new Set(parsePermissionTokens(value));
  const normalized = PUBLIC_API_RESOURCE_PERMISSIONS.filter((permission) =>
    selected.has(permission),
  );

  if (
    selected.has("all") ||
    normalized.length === PUBLIC_API_RESOURCE_PERMISSIONS.length
  ) {
    return [...PUBLIC_API_RESOURCE_PERMISSIONS, "all"];
  }

  return normalized;
}

export function getPublicApiPermissionLabel(permission) {
  const normalized = normalizeTrimmedText(permission);
  return PUBLIC_API_PERMISSION_LABELS[normalized] || normalized;
}

export function normalizePublicApiRecord(item = {}) {
  return {
    ...item,
    name: normalizeTrimmedText(item?.name),
    path: normalizeTrimmedText(item?.path),
    permissions: normalizePublicApiPermissionList(item?.permissions),
    api_key: normalizeTrimmedText(item?.api_key),
    description: normalizeTrimmedText(item?.description),
    is_active: normalizeBoolean(item?.is_active, true),
  };
}

export function normalizePublicApiList(items = []) {
  return (Array.isArray(items) ? items : []).map((item) =>
    normalizePublicApiRecord(item),
  );
}

export function createPublicApiFormState(source = {}) {
  const normalized = normalizePublicApiRecord(source);
  return {
    name: normalized.name,
    path: normalized.path,
    permissions: [...normalized.permissions],
    api_key: normalized.api_key,
    description: normalized.description,
    is_active: normalized.is_active,
  };
}

export function buildPublicApiPayload(source = {}) {
  return createPublicApiFormState(source);
}

export function buildPublicApiSummary(rows = []) {
  const items = normalizePublicApiList(rows);
  return {
    total: items.length,
    active: items.filter((item) => item.is_active).length,
    allScoped: items.filter((item) => item.permissions.includes("all")).length,
    withPath: items.filter((item) => item.path).length,
  };
}

export function resolvePublicApiPermissionSelection(
  value,
  previousSelection = [],
) {
  const selected = parsePermissionTokens(value);
  const previous = normalizePublicApiPermissionList(previousSelection);
  const prevHadAll = previous.includes("all");
  const currentHadAll = selected.includes("all");
  const selectedResources = PUBLIC_API_RESOURCE_PERMISSIONS.filter((permission) =>
    selected.includes(permission),
  );
  let nextSelection = [...selectedResources];

  if (currentHadAll && !prevHadAll) {
    nextSelection = [...PUBLIC_API_RESOURCE_PERMISSIONS, "all"];
  } else if (
    currentHadAll &&
    prevHadAll &&
    selectedResources.length < PUBLIC_API_RESOURCE_PERMISSIONS.length
  ) {
    nextSelection = [...selectedResources];
  } else if (
    !currentHadAll &&
    selectedResources.length === PUBLIC_API_RESOURCE_PERMISSIONS.length
  ) {
    nextSelection = [...PUBLIC_API_RESOURCE_PERMISSIONS, "all"];
  }

  return nextSelection;
}

export function generatePublicApiKey(length = 32) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
  }

  let key = "";
  for (let index = 0; index < length; index += 1) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}
