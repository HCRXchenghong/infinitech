import { extractEnvelopeData, extractPaginatedItems } from "../../contracts/src/http.js";

function trimOrderCouponText(value) {
  return String(value || "").trim();
}

function normalizeOrderCouponNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

export function formatConsumerOrderCouponDiscountLabel(amount) {
  const reduced = 100 - normalizeOrderCouponNumber(amount);
  if (reduced <= 0) return "限时折扣";
  const discount = reduced / 10;
  const text = Number.isInteger(discount) ? String(discount) : discount.toFixed(1);
  return `${text}折`;
}

export function resolveConsumerOrderCouponUserId(profile = {}) {
  return trimOrderCouponText(profile.phone || profile.id || profile.userId);
}

export function extractConsumerAvailableOrderCoupons(payload) {
  const data = extractEnvelopeData(payload);
  if (Array.isArray(data)) {
    return data;
  }
  return extractPaginatedItems(payload, {
    listKeys: ["coupons", "items", "records", "list"],
  }).items;
}

export function canUseConsumerOrderCoupon(userCoupon, orderAmount) {
  const coupon =
    userCoupon && typeof userCoupon === "object" ? userCoupon.coupon : null;
  if (!coupon || typeof coupon !== "object") return false;
  return normalizeOrderCouponNumber(orderAmount) >= normalizeOrderCouponNumber(coupon.minAmount);
}

export function buildConsumerOrderCouponUnavailableMessage(userCoupon) {
  const coupon =
    userCoupon && typeof userCoupon === "object" ? userCoupon.coupon : null;
  return `满 ${normalizeOrderCouponNumber(coupon?.minAmount).toFixed(2)} 元可用`;
}

export function buildConsumerOrderCouponSelectionPayload(selectedCoupon) {
  return {
    selectedCoupon:
      selectedCoupon && selectedCoupon.coupon ? selectedCoupon.coupon : null,
    selectedUserCouponId:
      selectedCoupon && selectedCoupon.id ? selectedCoupon.id : null,
  };
}

export function formatConsumerOrderCouponAmount(coupon) {
  if (!coupon || typeof coupon !== "object") return "";
  if (trimOrderCouponText(coupon.type) === "fixed") {
    return normalizeOrderCouponNumber(coupon.amount).toFixed(0);
  }
  return formatConsumerOrderCouponDiscountLabel(coupon.amount);
}

export function buildConsumerOrderCouponConditionText(coupon) {
  if (!coupon || typeof coupon !== "object") return "";
  if (normalizeOrderCouponNumber(coupon.minAmount) > 0) {
    return `满 ${normalizeOrderCouponNumber(coupon.minAmount).toFixed(2)} 元可用`;
  }
  return "无门槛可用";
}

export function formatConsumerOrderCouponValidity(coupon) {
  if (!coupon || typeof coupon !== "object") return "";
  const start = new Date(coupon.validFrom);
  const end = new Date(coupon.validUntil);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return [trimOrderCouponText(coupon.validFrom), trimOrderCouponText(coupon.validUntil)]
      .filter(Boolean)
      .join(" - ");
  }
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}
