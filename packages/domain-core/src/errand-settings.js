function trimText(value, fallback = "") {
  const normalized = String(value == null ? "" : value).trim();
  return normalized || fallback;
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
  }
  return Boolean(value);
}

export const DEFAULT_ERRAND_SERVICE_ROUTE_MAP = Object.freeze({
  buy: "/pages/errand/buy/index",
  deliver: "/pages/errand/deliver/index",
  pickup: "/pages/errand/pickup/index",
  do: "/pages/errand/do/index",
});

const DEFAULT_ERRAND_SERVICE_RECORDS = Object.freeze([
  Object.freeze({
    key: "buy",
    label: "帮我买",
    desc: "代买商品",
    icon: "购",
    color: "#ff6b00",
    enabled: true,
    sort_order: 10,
    route: DEFAULT_ERRAND_SERVICE_ROUTE_MAP.buy,
    service_fee_hint: "",
  }),
  Object.freeze({
    key: "deliver",
    label: "帮我送",
    desc: "同城配送",
    icon: "送",
    color: "#009bf5",
    enabled: true,
    sort_order: 20,
    route: DEFAULT_ERRAND_SERVICE_ROUTE_MAP.deliver,
    service_fee_hint: "",
  }),
  Object.freeze({
    key: "pickup",
    label: "帮我取",
    desc: "快递代取",
    icon: "取",
    color: "#10b981",
    enabled: true,
    sort_order: 30,
    route: DEFAULT_ERRAND_SERVICE_ROUTE_MAP.pickup,
    service_fee_hint: "",
  }),
  Object.freeze({
    key: "do",
    label: "帮我办",
    desc: "排队代办",
    icon: "办",
    color: "#8b5cf6",
    enabled: true,
    sort_order: 40,
    route: DEFAULT_ERRAND_SERVICE_ROUTE_MAP.do,
    service_fee_hint: "",
  }),
]);

const DEFAULT_ERRAND_SERVICE_MAP = Object.freeze(
  DEFAULT_ERRAND_SERVICE_RECORDS.reduce((result, item) => {
    result[item.key] = item;
    return result;
  }, {}),
);

export function resolveErrandServiceRoute(key, route = "") {
  const normalizedKey = trimText(key);
  const normalizedRoute = trimText(route);
  return normalizedRoute || DEFAULT_ERRAND_SERVICE_ROUTE_MAP[normalizedKey] || "";
}

export function createErrandService(source = {}) {
  const key = trimText(source.key || source.id);
  const preset = DEFAULT_ERRAND_SERVICE_MAP[key] || null;

  return {
    key,
    label: trimText(source.label, preset?.label || ""),
    desc: trimText(source.desc, preset?.desc || ""),
    icon: trimText(source.icon, preset?.icon || ""),
    color: trimText(source.color, preset?.color || ""),
    enabled: normalizeBoolean(source.enabled, preset?.enabled ?? true),
    sort_order: normalizeNumber(
      source.sort_order ?? source.sortOrder,
      preset?.sort_order ?? 0,
    ),
    route: resolveErrandServiceRoute(key, source.route || preset?.route || ""),
    service_fee_hint: trimText(
      source.service_fee_hint ?? source.serviceFeeHint,
      preset?.service_fee_hint || "",
    ),
  };
}

export function createDefaultErrandSettings() {
  return {
    page_title: "跑腿",
    hero_title: "同城跑腿",
    hero_desc: "帮买、帮送、帮取、帮办统一走真实订单链路",
    detail_tip: "",
    services: DEFAULT_ERRAND_SERVICE_RECORDS.map((item) => ({ ...item })),
  };
}

function normalizeErrandSettingsSource(
  source = {},
  { fallbackServices = true } = {},
) {
  const defaults = createDefaultErrandSettings();
  const services = Array.isArray(source.services) ? source.services : [];

  return {
    page_title: trimText(source.page_title, defaults.page_title),
    hero_title: trimText(source.hero_title, defaults.hero_title),
    hero_desc: trimText(source.hero_desc, defaults.hero_desc),
    detail_tip: trimText(source.detail_tip, defaults.detail_tip),
    services: services.length
      ? services.map((item) => createErrandService(item))
      : fallbackServices
        ? defaults.services
        : [],
  };
}

export function normalizeErrandSettings(source = {}) {
  return normalizeErrandSettingsSource(source, { fallbackServices: true });
}

export function getSortedErrandServices(services = []) {
  return (Array.isArray(services) ? services : []).slice().sort((left, right) => {
    const leftSortOrder = normalizeNumber(left?.sort_order ?? left?.sortOrder, 0);
    const rightSortOrder = normalizeNumber(
      right?.sort_order ?? right?.sortOrder,
      0,
    );
    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder;
    }
    return trimText(left?.key).localeCompare(trimText(right?.key), "zh-CN");
  });
}

export function getEnabledErrandServices(services = []) {
  return getSortedErrandServices(services).filter(
    (item) => item && item.enabled !== false,
  );
}

export function validateErrandSettings(source = {}) {
  const heroTitle = trimText(source.hero_title);
  const services = Array.isArray(source.services) ? source.services : [];

  if (!heroTitle) {
    return { valid: false, message: "跑腿主标题不能为空" };
  }
  if (!services.length) {
    return { valid: false, message: "至少需要保留一个跑腿服务" };
  }

  const seenKeys = new Set();
  for (const service of services) {
    const key = trimText(service?.key || service?.id);
    const label = trimText(service?.label);
    if (!key || !label) {
      return { valid: false, message: "跑腿服务 key 和名称不能为空" };
    }
    if (seenKeys.has(key)) {
      return { valid: false, message: "跑腿服务 key 不能重复" };
    }
    seenKeys.add(key);
  }

  return { valid: true, message: "" };
}

export function buildErrandSettingsPayload(source = {}) {
  const normalized = normalizeErrandSettingsSource(source, {
    fallbackServices: false,
  });

  return {
    page_title: normalized.page_title,
    hero_title: normalized.hero_title,
    hero_desc: normalized.hero_desc,
    detail_tip: normalized.detail_tip,
    services: getSortedErrandServices(normalized.services).map((item) => ({
      key: trimText(item.key),
      label: trimText(item.label),
      desc: trimText(item.desc),
      icon: trimText(item.icon),
      color: trimText(item.color),
      enabled: item.enabled !== false,
      sort_order: normalizeNumber(item.sort_order ?? item.sortOrder, 0),
      route: resolveErrandServiceRoute(item.key, item.route),
      service_fee_hint: trimText(item.service_fee_hint ?? item.serviceFeeHint),
    })),
  };
}

export function buildErrandHomeViewModel(source = {}) {
  const normalized = normalizeErrandSettings(source);

  return {
    pageTitle: normalized.page_title,
    heroTitle: normalized.hero_title,
    heroDesc: normalized.hero_desc,
    detailTip: normalized.detail_tip,
    services: getEnabledErrandServices(normalized.services).map((item) => ({
      id: item.key,
      key: item.key,
      name: item.label,
      desc: item.desc,
      icon: item.icon,
      color: item.color,
      route: resolveErrandServiceRoute(item.key, item.route),
      serviceFeeHint: trimText(item.service_fee_hint ?? item.serviceFeeHint),
    })),
  };
}
