const HOME_FEATURE_ROUTES = {
  errand: "/pages/errand/home/index",
  medicine: "/pages/medicine/home",
  dining_buddy: "/pages/dining-buddy/index",
  charity: "/pages/charity/index",
};

const HOME_CATEGORY_ROUTES = {
  food: "/pages/category/food/index",
  groupbuy: "/pages/category/index/index?category=团购",
  dessert_drinks: "/pages/category/dessert/index",
  supermarket_convenience: "/pages/category/market/index",
  leisure_entertainment: "/pages/category/index/index?category=休闲娱乐",
  life_services: "/pages/category/index/index?category=生活服务",
};

const SAFE_HOME_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);

export function normalizeHomeSelectedAddress(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    return String(
      value.address || value.detail || value.name || value.label || "",
    ).trim();
  }
  return "";
}

export function normalizeHomeWeatherRefreshMinutes(raw, fallback = 10) {
  const fallbackValue = Number.isFinite(Number(fallback))
    ? Math.min(1440, Math.max(1, Math.floor(Number(fallback))))
    : 10;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallbackValue;
  return Math.min(1440, Math.max(1, Math.floor(parsed)));
}

export function shouldRefreshHomeWeather(
  lastRefreshAt,
  weatherRefreshMinutes,
  now = Date.now(),
) {
  if (!lastRefreshAt) return true;
  const intervalMs =
    normalizeHomeWeatherRefreshMinutes(weatherRefreshMinutes) * 60 * 1000;
  return now - Number(lastRefreshAt) >= intervalMs;
}

export function buildHomeLocationDisplay(data = {}) {
  const address = normalizeHomeSelectedAddress(data.address);
  if (address) {
    return address;
  }

  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  }

  return "";
}

export function buildHomeLocationErrorCopy(error) {
  const errMsg = String(error?.errMsg || error?.message || "").trim();
  const isPermissionIssue =
    errMsg.includes("geolocation:12") ||
    errMsg.includes("permission") ||
    errMsg.includes("权限");
  return isPermissionIssue ? "定位权限异常，请手动选址" : "定位失败，请手动选址";
}

function normalizeHomeExternalUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    if (!SAFE_HOME_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      return "";
    }
    return parsed.toString();
  } catch (_error) {
    return "";
  }
}

export function buildHomeCategoryNavigation(category) {
  const source =
    category && typeof category === "object" && !Array.isArray(category)
      ? category
      : {};
  const label = String(source.label || source.name || "").trim();
  if (!label) {
    return {
      type: "error",
      message: "分类信息错误",
    };
  }

  const routeType = String(source.routeType || source.route_type || "").trim();
  const routeValue = String(source.routeValue || source.route_value || "").trim();

  if (routeType === "feature") {
    const target = HOME_FEATURE_ROUTES[routeValue];
    if (target) {
      return { type: "navigate", url: target };
    }
  }

  if (routeType === "category") {
    const target = HOME_CATEGORY_ROUTES[routeValue];
    if (target) {
      return { type: "navigate", url: target };
    }
  }

  if (routeType === "page" && routeValue) {
    return { type: "navigate", url: routeValue };
  }

  if (routeType === "external") {
    const target = normalizeHomeExternalUrl(routeValue);
    if (target) {
      return { type: "external", url: target };
    }
  }

  return {
    type: "navigate",
    url: `/pages/category/index/index?category=${encodeURIComponent(label)}`,
  };
}

export function buildHomeFeedCollections(
  payload = {},
  {
    normalizeFeaturedProductProjection = (item) => item,
    normalizeShopProjection = (item) => item,
  } = {},
) {
  return {
    shops: Array.isArray(payload.shops)
      ? payload.shops.map((item) => normalizeShopProjection(item))
      : [],
    featuredProducts: Array.isArray(payload.products)
      ? payload.products.map((item) => normalizeFeaturedProductProjection(item))
      : [],
  };
}
