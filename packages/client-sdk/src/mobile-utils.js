const UID_PATTERN = /^(?:\d{14}|\d{18})$/;
const TSID_PATTERN = /^(?:\d{24}|\d{28})$/;

const ROLE_CODE_MAP = {
  user: 6,
  rider: 7,
  admin: 8,
  merchant: 9,
};

const ORDER_STATUS_TEXT_MAP = {
  pending: "待接单",
  accepted: "待出餐",
  delivering: "配送中",
  completed: "已完成",
  cancelled: "已取消",
  refunded: "已退款",
  rejected: "已拒绝",
};

const ORDER_STATUS_COLOR_MAP = {
  pending: "#ef4444",
  accepted: "#f97316",
  delivering: "#009bf5",
  completed: "#10b981",
  cancelled: "#6b7280",
  refunded: "#6b7280",
  rejected: "#6b7280",
};

function resolveUniApp(uniApp) {
  const candidate = uniApp || globalThis.uni;
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  return candidate;
}

function normalizeDateInput(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number" || typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function zeroPad(value) {
  return String(value).padStart(2, "0");
}

export function formatUserId(id, _role) {
  const raw = String(id ?? "").trim();
  if (!raw) {
    return "";
  }

  if (UID_PATTERN.test(raw) || TSID_PATTERN.test(raw)) {
    return raw;
  }

  return raw;
}

export function formatRoleId(id, roleType) {
  return formatUserId(id, ROLE_CODE_MAP[roleType]);
}

export function formatTime(value) {
  const date = normalizeDateInput(value);
  if (!date) {
    return "";
  }

  return `${date.getFullYear()}-${zeroPad(date.getMonth() + 1)}-${zeroPad(date.getDate())} ${zeroPad(date.getHours())}:${zeroPad(date.getMinutes())}:${zeroPad(date.getSeconds())}`;
}

export function formatRelativeTime(timestamp, options = {}) {
  const time = Number(timestamp);
  if (!Number.isFinite(time)) {
    return "";
  }

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const diff = now - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "刚刚";
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  }
  if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`;
  }

  const date = new Date(time);
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

export function formatMoney(amount) {
  const parsed = Number(amount);
  return (Number.isFinite(parsed) ? parsed : 0).toFixed(2);
}

export const formatPrice = formatMoney;

export function debounce(fn, delay = 300) {
  let timer = null;
  return function debounced(...args) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

export function throttle(fn, delay = 300) {
  let timer = null;
  return function throttled(...args) {
    if (timer) {
      return;
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

export function deepClone(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item));
  }

  const clone = {};
  for (const key of Object.keys(value)) {
    clone[key] = deepClone(value[key]);
  }
  return clone;
}

export function showToast(title, icon = "none", options = {}) {
  const { uniApp: injectedUniApp, ...payloadOptions } = options;
  const uniApp = resolveUniApp(injectedUniApp);
  if (!uniApp || typeof uniApp.showToast !== "function") {
    return false;
  }

  uniApp.showToast({
    title,
    icon,
    duration: 2000,
    ...payloadOptions,
  });
  return true;
}

export function showLoading(title = "加载中...", options = {}) {
  const { uniApp: injectedUniApp, ...payloadOptions } = options;
  const uniApp = resolveUniApp(injectedUniApp);
  if (!uniApp || typeof uniApp.showLoading !== "function") {
    return false;
  }

  uniApp.showLoading({
    title,
    mask: true,
    ...payloadOptions,
  });
  return true;
}

export function hideLoading(options = {}) {
  const uniApp = resolveUniApp(options.uniApp);
  if (!uniApp || typeof uniApp.hideLoading !== "function") {
    return false;
  }

  uniApp.hideLoading();
  return true;
}

export function showConfirm(content, title = "提示", options = {}) {
  const {
    uniApp: injectedUniApp,
    success: onSuccess,
    fail: onFail,
    ...payloadOptions
  } = options;
  const uniApp = resolveUniApp(injectedUniApp);
  if (!uniApp || typeof uniApp.showModal !== "function") {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    uniApp.showModal({
      title,
      content,
      ...payloadOptions,
      success(result) {
        if (typeof onSuccess === "function") {
          onSuccess(result);
        }
        resolve(Boolean(result?.confirm));
      },
      fail(error) {
        if (typeof onFail === "function") {
          onFail(error);
        }
        resolve(false);
      },
    });
  });
}

export function getOrderStatusText(status) {
  return ORDER_STATUS_TEXT_MAP[status] || "未知";
}

export function getOrderStatusColor(status) {
  return ORDER_STATUS_COLOR_MAP[status] || "#6b7280";
}
