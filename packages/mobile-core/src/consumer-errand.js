import { readConsumerStoredProfile } from "./consumer-profile-storage.js";

const ERRAND_SERVICE_META = {
  errand_buy: {
    serviceType: "errand_buy",
    name: "帮我买",
    summary: "代买商品",
  },
  errand_deliver: {
    serviceType: "errand_deliver",
    name: "帮我送",
    summary: "同城配送",
  },
  errand_pickup: {
    serviceType: "errand_pickup",
    name: "帮我取",
    summary: "快递代取",
  },
  errand_do: {
    serviceType: "errand_do",
    name: "帮我办",
    summary: "排队代办",
  },
  errand_generic: {
    serviceType: "errand_generic",
    name: "跑腿服务",
    summary: "同城跑腿",
  },
};

function normalizeServiceType(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (!text) return "";
  if (text === "errand_buy" || text === "buy" || text === "purchase") {
    return "errand_buy";
  }
  if (text === "errand_deliver" || text === "deliver" || text === "delivery") {
    return "errand_deliver";
  }
  if (text === "errand_pickup" || text === "pickup" || text === "pick_up") {
    return "errand_pickup";
  }
  if (text === "errand_do" || text === "do" || text === "task") {
    return "errand_do";
  }
  return text;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickText(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function pickDefined(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function formatDateTime(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date
      .toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(/\//g, "-");
  } catch (_error) {
    return String(value);
  }
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_error) {
    return {};
  }
  return {};
}

export function getCurrentUserIdentity(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const profile = readConsumerStoredProfile({ uniApp });

  return {
    userId: pickText(profile.phone, profile.id, profile.userId),
    phone: pickText(profile.phone),
    name: pickText(
      profile.name,
      profile.nickname,
      profile.username,
      profile.userName,
    ),
  };
}

export function requireCurrentUserIdentity(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const identity = getCurrentUserIdentity({ uniApp });

  if (identity.userId) {
    return identity;
  }

  uniApp?.showToast?.({ title: "请先登录", icon: "none" });

  const loginUrl = options.loginUrl || "/pages/auth/login/index";
  const schedule =
    typeof options.schedule === "function"
      ? options.schedule
      : (callback, delay) => globalThis.setTimeout(callback, delay);

  schedule(
    () => {
      uniApp?.navigateTo?.({ url: loginUrl });
    },
    Number(options.navigateDelayMs) || 300,
  );

  return null;
}

export function getErrandServiceMeta(serviceType) {
  return (
    ERRAND_SERVICE_META[normalizeServiceType(serviceType)] ||
    ERRAND_SERVICE_META.errand_generic
  );
}

export function isErrandOrder(order = {}) {
  const serviceType = normalizeServiceType(
    order.serviceType || order.service_type,
  );
  if (serviceType.startsWith("errand_")) return true;
  return Boolean(
    order.errandRequest ||
    order.errand_request ||
    order.errandLocation ||
    order.errand_location ||
    order.errandRequirements ||
    order.errand_requirements,
  );
}

export function buildErrandOrderPayload(config = {}, identity = {}) {
  const serviceType = normalizeServiceType(config.serviceType);
  const meta = getErrandServiceMeta(serviceType);
  const serviceName = pickText(config.serviceName, meta.name);
  const shopName = pickText(config.shopName, "跑腿服务");
  const totalPrice = Math.max(0, toNumber(config.totalPrice));
  const deliveryFee = Math.max(0, toNumber(config.deliveryFee));
  const estimatedAmount = Math.max(0, toNumber(config.estimatedAmount));
  const tipAmount = Math.max(0, toNumber(config.tipAmount));
  const pickup = pickText(config.pickup);
  const dropoff = pickText(config.dropoff);
  const itemDescription = pickText(config.itemDescription, meta.name);
  const preferredTime = pickText(config.preferredTime);
  const remark = pickText(config.remark);

  return {
    userId: pickText(identity.userId),
    phone: pickText(identity.phone),
    name: pickText(identity.name),
    bizType: "takeout",
    shopName,
    serviceType,
    serviceDescription: serviceName,
    items: itemDescription,
    price: totalPrice,
    totalPrice,
    productPrice: estimatedAmount,
    deliveryFee,
    address: dropoff,
    preferredTime,
    errandLocation: { pickup, dropoff },
    errandRequest: {
      serviceType,
      serviceName,
      itemDescription,
      estimatedAmount,
      tipAmount,
      ...config.requestExtra,
    },
    errandRequirements: {
      preferredTime,
      remark,
      ...config.requirementsExtra,
    },
  };
}

export function mapErrandOrderDetail(order = {}) {
  const request = parseJsonObject(order.errandRequest || order.errand_request);
  const location = parseJsonObject(
    order.errandLocation || order.errand_location,
  );
  const requirements = parseJsonObject(
    order.errandRequirements || order.errand_requirements,
  );
  const serviceType =
    normalizeServiceType(order.serviceType || order.service_type) ||
    "errand_generic";
  const meta = getErrandServiceMeta(serviceType);
  const statusText = pickText(
    order.statusText,
    order.status_text,
    order.status,
    "待接单",
  );
  const pickup = pickText(
    location.pickup,
    request.buyAddress,
    request.pickupAddress,
    request.pickup,
  );
  const dropoff = pickText(
    location.dropoff,
    request.targetAddress,
    request.deliveryAddress,
    serviceType === "errand_do" ? "" : order.address,
  );
  const item = pickText(
    order.items,
    request.itemDescription,
    request.taskDescription,
    meta.name,
  );
  const productPrice = pickDefined(order.productPrice, order.product_price);
  const deliveryFeeValue = pickDefined(order.deliveryFee, order.delivery_fee);
  const totalPriceValue = pickDefined(
    order.totalPrice,
    order.total_price,
    order.price,
  );
  const amount = Math.max(
    0,
    toNumber(request.estimatedAmount, toNumber(productPrice, 0)),
  );
  const deliveryFee = Math.max(0, toNumber(deliveryFeeValue));
  const totalPrice = Math.max(0, toNumber(totalPriceValue));
  const preferredTime = pickText(
    requirements.preferredTime,
    order.preferredTime,
    order.preferred_time,
    request.deliveryTime,
  );
  const remark = pickText(requirements.remark, request.remark);

  return {
    id: pickText(order.id, order.daily_order_id),
    serviceType,
    serviceName: meta.name,
    serviceSummary: meta.summary,
    status: String(order.status || "")
      .trim()
      .toLowerCase(),
    statusText,
    riderName: pickText(order.riderName, order.rider_name),
    riderPhone: pickText(order.riderPhone, order.rider_phone),
    pickup,
    dropoff,
    item,
    amount,
    deliveryFee,
    totalPrice,
    preferredTime,
    remark,
    createdAt: pickText(order.createdAt, order.created_at, order.time),
    createdAtText: formatDateTime(
      order.createdAt || order.created_at || order.time,
    ),
  };
}

export function mapErrandOrderSummary(order = {}) {
  const detail = mapErrandOrderDetail(order);
  return {
    id: detail.id,
    status: detail.statusText,
    item: detail.item,
    serviceName: detail.serviceName,
    totalPrice: detail.totalPrice,
    createdAtText: detail.createdAtText,
  };
}
