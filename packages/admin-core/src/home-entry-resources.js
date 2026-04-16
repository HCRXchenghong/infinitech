function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized || fallback;
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  const normalized = normalizeText(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return Boolean(value);
}

function normalizeStringList(items, fallback = []) {
  const source = Array.isArray(items) ? items : fallback;
  return source.map((item) => normalizeText(item)).filter(Boolean);
}

export const DEFAULT_ADMIN_HOME_ENTRY_PREVIEW_CLIENT = "user-vue";

export function createAdminHomeEntryLocalKey(seed = "entry") {
  return `${normalizeText(seed, "entry")}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeAdminHomeEntry(source = {}) {
  const key = normalizeText(source.key);
  const clientScopes =
    Array.isArray(source.client_scopes) && source.client_scopes.length
      ? normalizeStringList(source.client_scopes)
      : ["user-vue", "app-mobile"];
  return {
    localKey: normalizeText(source.localKey) || createAdminHomeEntryLocalKey(key || "entry"),
    key,
    label: normalizeText(source.label),
    icon: normalizeText(source.icon, "✨"),
    icon_type: normalizeText(source.icon_type, "emoji"),
    bg_color: normalizeText(source.bg_color, "#F3F4F6"),
    sort_order: normalizeNumber(source.sort_order, 0),
    enabled: normalizeBoolean(source.enabled, true),
    city_scopes: normalizeStringList(source.city_scopes),
    client_scopes: clientScopes,
    route_type: normalizeText(source.route_type, "page"),
    route_value: normalizeText(source.route_value),
    badge_text: normalizeText(source.badge_text),
  };
}

export function createAdminHomeEntryDraft(entries = []) {
  const nextIndex = Array.isArray(entries) ? entries.length + 1 : 1;
  const maxSort = Array.isArray(entries)
    ? entries.reduce(
        (result, item) => Math.max(result, normalizeNumber(item?.sort_order, 0)),
        0,
      )
    : 0;

  return normalizeAdminHomeEntry({
    key: `custom_${nextIndex}`,
    label: "新入口",
    sort_order: maxSort + 10,
  });
}

export function getAdminHomeEntryRoutePlaceholder(routeType) {
  if (routeType === "feature") {
    return "errand / medicine / dining_buddy / charity";
  }
  if (routeType === "category") {
    return "food / groupbuy / dessert_drinks ...";
  }
  if (routeType === "external") {
    return "https://example.com";
  }
  return "/pages/activity/index";
}

export function normalizeAdminHomeEntrySettings(payload = {}) {
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  return {
    entries: entries.map((item) => normalizeAdminHomeEntry(item)),
  };
}

export function buildAdminHomeEntryPreviewEntries(
  entries = [],
  previewClient = DEFAULT_ADMIN_HOME_ENTRY_PREVIEW_CLIENT,
) {
  return normalizeStringList([previewClient]).length
    ? entries
        .map((item) => normalizeAdminHomeEntry(item))
        .filter((entry) => entry.enabled)
        .filter(
          (entry) =>
            !entry.client_scopes.length ||
            entry.client_scopes.includes(previewClient),
        )
        .sort(
          (left, right) =>
            normalizeNumber(left.sort_order, 0) - normalizeNumber(right.sort_order, 0),
        )
    : [];
}

export function canAdminHomeEntryShowImageIcon(entry = {}) {
  const iconType = normalizeText(entry.icon_type);
  return iconType === "image" || iconType === "external";
}

export function validateAdminHomeEntries(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      valid: false,
      message: "至少保留一个首页入口",
    };
  }

  const seen = new Set();
  for (const item of entries) {
    const entry = normalizeAdminHomeEntry(item);
    if (!entry.key) {
      return {
        valid: false,
        message: "首页入口 key 不能为空",
      };
    }
    if (seen.has(entry.key)) {
      return {
        valid: false,
        message: `首页入口 key 重复：${entry.key}`,
      };
    }
    seen.add(entry.key);
    if (!entry.label) {
      return {
        valid: false,
        message: `入口 ${entry.key} 的显示名称不能为空`,
      };
    }
    if (!entry.route_value) {
      return {
        valid: false,
        message: `入口 ${entry.key} 的路由值不能为空`,
      };
    }
  }

  return {
    valid: true,
    message: "",
  };
}

export function buildAdminHomeEntrySettingsPayload(entries = []) {
  return {
    entries: (Array.isArray(entries) ? entries : []).map((item) => {
      const { localKey, ...entry } = normalizeAdminHomeEntry(item);
      return entry;
    }),
  };
}
