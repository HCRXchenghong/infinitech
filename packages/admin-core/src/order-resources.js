import { extractPaginatedItems } from "../../contracts/src/http.js";

function normalizeText(value) {
  return String(value == null ? "" : value).trim();
}

export function extractAdminOrderPage(payload = {}) {
  return extractPaginatedItems(payload, {
    listKeys: ["orders", "items", "list", "records"],
  });
}

export function normalizeAdminOrderBizType(order = {}) {
  const value = normalizeText(order?.bizType || order?.biz_type).toLowerCase();
  if (value === "groupbuy") {
    return "groupbuy";
  }
  return "takeout";
}

export function canAdminOrderQuickDispatch(order = {}) {
  if (!order || order.status !== "pending") {
    return false;
  }
  if (normalizeAdminOrderBizType(order) === "groupbuy") {
    return false;
  }
  const riderId = normalizeText(order.rider_id);
  const riderName = normalizeText(order.rider_name);
  const riderPhone = normalizeText(order.rider_phone);
  return !riderId && !riderName && !riderPhone;
}

export function getAdminOrderStatusText(status, order = {}) {
  if (normalizeAdminOrderBizType(order) === "groupbuy") {
    const groupbuyText = {
      pending_payment: "待支付",
      paid_unused: "待核销",
      redeemed: "已核销",
      refunding: "退款中",
      refunded: "已退款",
      expired: "已过期",
      cancelled: "已取消",
    };
    return groupbuyText[status] || "团购订单";
  }

  if (order?.service_type === "phone_film" || order?.service_type === "massage") {
    if (status === "completed") return "已完成";
    if (status === "cancelled") return "已取消";
    if (status === "pending") return "待确认";
    return "待上门";
  }

  const texts = {
    draft: "草稿",
    pending: "待接单",
    accepted: "进行中",
    delivering: "配送中",
    priced: "待付款",
    completed: "已完成",
    cancelled: "已取消",
  };
  return texts[status] || "未知状态";
}

export function getAdminOrderStatusTagType(status) {
  const groupbuyTypes = {
    pending_payment: "warning",
    paid_unused: "primary",
    redeemed: "success",
    refunding: "warning",
    refunded: "info",
    expired: "info",
  };
  if (groupbuyTypes[status]) {
    return groupbuyTypes[status];
  }

  const types = {
    draft: "info",
    pending: "warning",
    accepted: "primary",
    delivering: "primary",
    priced: "success",
    completed: "success",
    cancelled: "info",
  };
  return types[status] || "";
}

export function getAdminOrderTypeText(order = {}) {
  if (normalizeAdminOrderBizType(order) === "groupbuy") return "团购";
  if (order.service_type === "phone_film") return "手机贴膜";
  if (order.service_type === "massage") return "推拿按摩";
  if (order.food_request) return "餐食服务";
  if (order.drink_request) return "饮品服务";
  if (order.delivery_request) return "快递服务";
  if (order.errand_request && !order.service_type) return "跑腿服务";
  return "其他";
}

export function getAdminOrderTypeIcon(order = {}) {
  if (normalizeAdminOrderBizType(order) === "groupbuy") return "🎫";
  if (order.service_type === "phone_film") return "📱";
  if (order.service_type === "massage") return "💆";
  if (order.food_request) return "🍽️";
  if (order.drink_request) return "🥤";
  if (order.delivery_request) return "📮";
  if (order.errand_request && !order.service_type) return "🚴";
  return "📦";
}

export function formatAdminOrderTime(timeStr) {
  if (!timeStr) return "-";
  const date = new Date(timeStr);
  if (Number.isNaN(date.getTime())) {
    return normalizeText(timeStr) || "-";
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}`;
}

export function buildAdminOrderDetail(row = {}) {
  const detail = { ...row };
  if (!row?.errand_request || typeof row.errand_request !== "string") {
    return detail;
  }

  try {
    const serviceInfo = JSON.parse(row.errand_request);
    if (!serviceInfo?.service_type) {
      return detail;
    }
    return {
      ...detail,
      service_type: serviceInfo.service_type,
      service_description: serviceInfo.service_description,
      package_name: serviceInfo.package_name,
      package_price: serviceInfo.package_price,
      phone_model: serviceInfo.phone_model,
      preferred_time: serviceInfo.preferred_time || detail.preferred_time,
      special_notes: serviceInfo.special_notes,
    };
  } catch {
    return detail;
  }
}
