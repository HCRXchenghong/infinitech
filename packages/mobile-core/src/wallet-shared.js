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

export function extractWalletItems(payload, candidates = ["items", "list", "records", "data"]) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const keys = Array.isArray(candidates) && candidates.length > 0
    ? candidates
    : ["items", "list", "records", "data"];
  const sources = [
    payload,
    payload && payload.data,
    payload && payload.data && payload.data.data,
  ].filter((source) => source && typeof source === "object");

  for (const source of sources) {
    if (Array.isArray(source)) {
      return source;
    }
    for (const key of keys) {
      if (Array.isArray(source[key])) {
        return source[key];
      }
    }
  }

  return [];
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
  return extractWalletItems(payload, ["options", "items", "list", "records", "data"]);
}

export function fenToWalletYuan(fen) {
  return (Math.abs(Number(fen || 0)) / 100).toFixed(2);
}

export function formatWalletDateTime(value, fallback = "--") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
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

export function normalizeWalletFlowStatus(payload, nestedKey) {
  const nested =
    nestedKey && payload && typeof payload === "object"
      ? payload[nestedKey]
      : null;
  return normalizeWalletText(
    (payload && payload.status) ||
      (nested && nested.status) ||
      (payload && payload.transactionStatus),
  ).toLowerCase();
}

export function normalizeWalletArrivalText(payload, nestedKey) {
  const nested =
    nestedKey && payload && typeof payload === "object"
      ? payload[nestedKey]
      : null;
  return normalizeWalletText(
    (payload && payload.arrivalText) ||
      (nested && nested.arrivalText),
  );
}

export function normalizeWalletWithdrawFailureReason(payload, nestedKey) {
  const nested =
    nestedKey && payload && typeof payload === "object"
      ? payload[nestedKey]
      : null;
  const responseData = nested && nested.responseData;
  return normalizeWalletText(
    (payload && payload.rejectReason) ||
      (payload && payload.reason) ||
      (payload && payload.transferResult) ||
      (nested &&
        (nested.rejectReason ||
          nested.reason ||
          nested.transferResult ||
          (responseData &&
            (responseData.rejectReason ||
              responseData.reason ||
              responseData.transferResult)))),
  );
}

export function isWalletRechargeSuccessStatus(status) {
  return ["success", "completed", "paid"].includes(
    normalizeWalletText(status).toLowerCase(),
  );
}

export function isWalletWithdrawSuccessStatus(status) {
  return ["success", "completed"].includes(
    normalizeWalletText(status).toLowerCase(),
  );
}

export function isWalletFailureStatus(status) {
  return ["failed", "rejected", "cancelled", "closed"].includes(
    normalizeWalletText(status).toLowerCase(),
  );
}

export function walletFlowStatusLabel(status, fallback = "处理中") {
  const normalized = normalizeWalletText(status).toLowerCase();
  return (
    {
      awaiting_client_pay: "待支付",
      pending: "处理中",
      pending_review: "待审核",
      pending_transfer: "待打款",
      processing: "处理中",
      transferring: "转账中",
      success: "成功",
      completed: "成功",
      paid: "已支付",
      failed: "失败",
      rejected: "已驳回",
      cancelled: "已取消",
      closed: "已关闭",
    }[normalized] ||
    normalized ||
    fallback
  );
}

export function sortWalletTransactions(items) {
  return extractWalletItems(items).slice().sort((left, right) => {
    const leftTime = new Date(left?.created_at || left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.created_at || right?.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
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

export function showWalletActionSheet(uniApp, payload) {
  return new Promise((resolve) => {
    if (!uniApp || typeof uniApp.showActionSheet !== "function") {
      resolve({ tapIndex: -1, cancel: true });
      return;
    }

    uniApp.showActionSheet({
      ...payload,
      success: (result) => resolve(result || { tapIndex: -1, cancel: true }),
      fail: () => resolve({ tapIndex: -1, cancel: true }),
    });
  });
}
