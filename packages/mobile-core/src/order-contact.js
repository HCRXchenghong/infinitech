import { normalizePhoneNumber } from "./phone-contact.js";

function toSafeOrder(order) {
  return order && typeof order === "object" ? order : {};
}

export function buildOrderPhoneAuditPayload(order, contactType, phoneNumber, {
  entryPoint = "order_list",
  pagePath = "/pages/order/list/index",
} = {}) {
  const safeOrder = toSafeOrder(order);
  const targetRole = contactType === "rider" ? "rider" : "merchant";
  return {
    targetRole,
    targetId: String(
      contactType === "rider" ? safeOrder.riderId || "" : safeOrder.shopId || "",
    ),
    targetPhone: normalizePhoneNumber(phoneNumber),
    entryPoint,
    scene: "order_contact",
    orderId: String(safeOrder.id || ""),
    roomId:
      contactType === "rider"
        ? `rider_${safeOrder.id || ""}`
        : `shop_${safeOrder.id || ""}`,
    pagePath,
    metadata: {
      bizType: safeOrder.bizType || "",
      status: safeOrder.status || "",
      shopId: String(safeOrder.shopId || ""),
      riderId: String(safeOrder.riderId || ""),
      contactType,
    },
  };
}

export function buildOrderRTCContext(order, contactType) {
  const safeOrder = toSafeOrder(order);
  const deliveryInfo =
    safeOrder.deliveryInfo && typeof safeOrder.deliveryInfo === "object"
      ? safeOrder.deliveryInfo
      : {};
  const isRider = contactType === "rider";
  const riderInfo = String(deliveryInfo.rider || "");
  const riderPhone = riderInfo.match(/1[3-9]\d{9}/);
  return {
    targetRole: isRider ? "rider" : "merchant",
    targetId: String(isRider ? safeOrder.riderId || "" : safeOrder.shopId || ""),
    targetName: isRider
      ? riderInfo.split(" ")[0] || "骑手"
      : String(safeOrder.shopName || "商家"),
    targetPhone: normalizePhoneNumber(
      isRider
        ? (riderPhone && riderPhone[0]) ||
            safeOrder.riderPhone ||
            deliveryInfo.contact ||
            ""
        : safeOrder.shopPhone || "",
    ),
    conversationId: isRider
      ? `rider_${safeOrder.id || ""}`
      : `shop_${safeOrder.id || ""}`,
    orderId: String(safeOrder.id || ""),
  };
}

export function buildOrderChatContext(order, contactType) {
  const safeOrder = toSafeOrder(order);
  const deliveryInfo =
    safeOrder.deliveryInfo && typeof safeOrder.deliveryInfo === "object"
      ? safeOrder.deliveryInfo
      : {};

  if (contactType === "rider") {
    return {
      roomId: `rider_${safeOrder.id || ""}`,
      name: riderNameFromOrder(order),
      role: "rider",
      avatar: "/static/images/default-avatar.svg",
      targetId: String(safeOrder.riderId || ""),
      orderId: String(safeOrder.id || ""),
    };
  }

  return {
    roomId: `shop_${safeOrder.id || ""}`,
    name: String(safeOrder.shopName || "商家"),
    role: "shop",
    avatar: safeOrder.shopLogo || "/static/images/default-shop.svg",
    targetId: String(safeOrder.shopId || ""),
    orderId: String(safeOrder.id || ""),
  };
}

export function riderNameFromOrder(order) {
  const safeOrder = toSafeOrder(order);
  const deliveryInfo =
    safeOrder.deliveryInfo && typeof safeOrder.deliveryInfo === "object"
      ? safeOrder.deliveryInfo
      : {};
  return (
    String(deliveryInfo.rider || "")
      .split(" ")[0]
      .trim() || "骑手"
  );
}
