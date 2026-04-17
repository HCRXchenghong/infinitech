export function resolveWalletUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

export function normalizeWalletText(value) {
  return String(value == null ? "" : value).trim();
}

export function cloneWalletItems(items, fallback = []) {
  const source = Array.isArray(items) && items.length > 0 ? items : fallback;
  return source.map((item) =>
    item && typeof item === "object" ? { ...item } : item,
  );
}

export function getWalletStorageValue(uniApp, key) {
  if (!uniApp || typeof uniApp.getStorageSync !== "function") {
    return "";
  }
  return uniApp.getStorageSync(key);
}

export function readConsumerWalletAuth(uniApp, options = {}) {
  const profile = getWalletStorageValue(uniApp, "userProfile") || {};
  const nameFallback = normalizeWalletText(options.nameFallback) || "用户";
  const userId = normalizeWalletText(
    profile.phone ||
      profile.id ||
      profile.userId ||
      getWalletStorageValue(uniApp, "userId") ||
      getWalletStorageValue(uniApp, "phone") ||
      "",
  );
  const userName = normalizeWalletText(
    profile.nickname || profile.name || nameFallback,
  );
  const token = normalizeWalletText(
    getWalletStorageValue(uniApp, "token") ||
      getWalletStorageValue(uniApp, "access_token") ||
      "",
  );
  return { userId, userName, token };
}

export function buildWalletQuery(path, params) {
  const query = Object.keys(params || {})
    .filter((key) => {
      const value = params[key];
      return value !== "" && value !== undefined && value !== null;
    })
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`,
    )
    .join("&");
  return query ? `${path}?${query}` : path;
}

export function resolveWalletField(data, key, fallback = 0) {
  if (data && data[key] !== undefined && data[key] !== null) {
    return data[key];
  }
  if (
    data &&
    data.data &&
    data.data[key] !== undefined &&
    data.data[key] !== null
  ) {
    return data.data[key];
  }
  return fallback;
}

export function normalizeWalletOptions(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload && payload.options)) {
    return payload.options;
  }
  if (Array.isArray(payload && payload.data && payload.data.options)) {
    return payload.data.options;
  }
  return [];
}

export function fenToWalletYuan(fen) {
  return (Math.abs(Number(fen || 0)) / 100).toFixed(2);
}

export function createWalletIdempotencyKey(
  prefix,
  userId,
  {
    nowFn = () => Date.now(),
    randomFn = () => Math.random(),
  } = {},
) {
  const seed = `${nowFn()}${Math.floor(randomFn() * 1000000)}`;
  return `${prefix}_${String(userId || "guest")}_${seed}`;
}

export function getWalletStatusBarHeight(uniApp, fallback = 44) {
  try {
    const systemInfo =
      uniApp && typeof uniApp.getSystemInfoSync === "function"
        ? uniApp.getSystemInfoSync() || {}
        : {};
    return Number(systemInfo.statusBarHeight || fallback);
  } catch (_error) {
    return fallback;
  }
}

export function showWalletToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

export function showWalletLoading(uniApp, payload) {
  if (uniApp && typeof uniApp.showLoading === "function") {
    uniApp.showLoading(payload);
  }
}

export function hideWalletLoading(uniApp) {
  if (uniApp && typeof uniApp.hideLoading === "function") {
    uniApp.hideLoading();
  }
}

export function navigateWalletTo(uniApp, payload) {
  if (uniApp && typeof uniApp.navigateTo === "function") {
    uniApp.navigateTo(payload);
  }
}

export function navigateWalletBack(uniApp, payload) {
  if (uniApp && typeof uniApp.navigateBack === "function") {
    uniApp.navigateBack(payload);
  }
}

export function showWalletModal(uniApp, payload) {
  return new Promise((resolve) => {
    if (!uniApp || typeof uniApp.showModal !== "function") {
      resolve({ confirm: false, cancel: true });
      return;
    }

    uniApp.showModal({
      ...payload,
      success: (result) => resolve(result || { confirm: false, cancel: true }),
      fail: () => resolve({ confirm: false, cancel: true }),
    });
  });
}
