export const AFTER_SALES_REFUND_TYPES = [
  { label: "仅退款", value: "refund" },
  { label: "退款退货", value: "refund_return" },
  { label: "换货", value: "exchange" },
];

function trimAfterSalesValue(value) {
  return String(value || "").trim();
}

export function createDefaultAfterSalesOrder() {
  return {
    id: "",
    shopName: "",
    shopLogo: "",
    time: "",
    bizType: "takeout",
    status: "pending",
    productList: [],
    totalPrice: 0,
  };
}

export function createDefaultOrderReviewOrder() {
  return {
    id: "",
    shopName: "",
    shopLogo: "",
    time: "",
    shopId: "",
    userId: "",
    riderId: "",
    isReviewed: false,
  };
}

export function createDefaultOrderReviewDraft() {
  return {
    content: "",
    images: [],
  };
}

export function normalizeAfterSalesBizType(bizType) {
  const value = trimAfterSalesValue(bizType).toLowerCase();
  if (value === "groupbuy" || value.includes("团购")) {
    return "groupbuy";
  }
  return "takeout";
}

export function parseAfterSalesOrderStatus(status, bizType = "takeout") {
  const value = trimAfterSalesValue(status).toLowerCase();
  if (bizType === "groupbuy") {
    if (
      [
        "pending_payment",
        "paid_unused",
        "redeemed",
        "refunding",
        "refunded",
        "expired",
        "cancelled",
      ].includes(value)
    ) {
      return value;
    }
    if (value.includes("核销")) {
      return value.includes("已") ? "redeemed" : "paid_unused";
    }
    if (value.includes("退款")) {
      return value.includes("中") ? "refunding" : "refunded";
    }
    if (value.includes("过期")) {
      return "expired";
    }
    return "paid_unused";
  }
  if (["pending", "accepted", "delivering", "completed", "cancelled"].includes(value)) {
    return value;
  }
  return "pending";
}

export function normalizeAfterSalesProductList(data = {}) {
  if (Array.isArray(data.productList)) {
    return data.productList;
  }
  if (Array.isArray(data.items)) {
    return data.items;
  }
  if (typeof data.items === "string" && data.items.trim()) {
    try {
      const parsed = JSON.parse(data.items);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_error) {
      return [
        {
          name: data.items,
          price:
            data.product_price ||
            data.productPrice ||
            data.price ||
            data.total_price ||
            0,
          count: 1,
        },
      ];
    }
    return [
      {
        name: data.items,
        price:
          data.product_price ||
          data.productPrice ||
          data.price ||
          data.total_price ||
          0,
        count: 1,
      },
    ];
  }
  return [];
}

export function normalizeAfterSalesOrder(data = {}) {
  const bizType = normalizeAfterSalesBizType(data.bizType || data.biz_type);
  const status = parseAfterSalesOrderStatus(data.status, bizType);

  return {
    id: data.id,
    shopName: data.shopName || data.shop_name || data.shop?.name || "",
    shopLogo: data.shopLogo || data.shop?.logo || "",
    time: data.time || data.createdAt || data.created_at || "",
    bizType,
    status,
    productList: normalizeAfterSalesProductList(data),
    totalPrice:
      Number(
        data.totalPrice ||
          data.total_price ||
          data.price ||
          data.product_price ||
          0,
      ) || 0,
  };
}

export function formatAfterSalesPrice(price) {
  const value = Number(price);
  if (Number.isNaN(value)) {
    return "0";
  }
  return value.toFixed(2).replace(/\.00$/, "");
}

export function normalizeAfterSalesMoneyInput(value) {
  const raw = String(value || "").replace(/[^\d.]/g, "");
  if (!raw) {
    return "";
  }
  const parts = raw.split(".");
  const integerPart = parts[0] || "0";
  const decimalPart =
    parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : "";
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

export function yuanToFen(value) {
  const text = trimAfterSalesValue(value);
  if (!text || !/^\d+(\.\d{1,2})?$/.test(text)) {
    return 0;
  }
  return Math.round(Number(text) * 100);
}

export function buildAfterSalesSelectedProducts(
  productList = [],
  selectedProducts = [],
) {
  return (Array.isArray(selectedProducts) ? selectedProducts : [])
    .map((index) => {
      const item = Array.isArray(productList) ? productList[index] : null;
      if (!item) {
        return null;
      }
      return {
        name: item.name || item.title || `商品${Number(index) + 1}`,
        spec: item.spec || item.sku || "",
        price: item.price || 0,
        count: item.count || 1,
      };
    })
    .filter(Boolean);
}

export function isAfterSalesPhoneValid(phone) {
  return /^1\d{10}$/.test(trimAfterSalesValue(phone));
}

export function pickAfterSalesErrorMessage(
  error,
  fallback = "提交失败，请稍后重试",
) {
  return error?.data?.error || error?.error || error?.message || fallback;
}

function normalizeReviewBoolean(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  );
}

export function normalizeOrderReviewOrder(data = {}) {
  const shop = data.shop || {};
  return {
    id: trimAfterSalesValue(data.id),
    shopId: trimAfterSalesValue(data.shopId || data.shop_id || shop.id),
    shopName: data.shopName || shop.name || "",
    shopLogo: data.shopLogo || shop.logo || "",
    time: data.time || data.createdAt || data.created_at || "",
    userId: trimAfterSalesValue(data.userId || data.user_id),
    riderId: trimAfterSalesValue(data.riderId || data.rider_id),
    isReviewed: normalizeReviewBoolean(data.isReviewed) || normalizeReviewBoolean(data.is_reviewed),
  };
}

export function hasOrderReviewRider(order = {}) {
  const riderId = trimAfterSalesValue(order.riderId);
  return Boolean(riderId && riderId !== "0");
}

export function resolveOrderReviewUserProfile(profile = {}, order = {}) {
  const safeProfile =
    profile && typeof profile === "object" && !Array.isArray(profile)
      ? profile
      : {};
  const rawUserId =
    safeProfile.id ||
    safeProfile.userId ||
    order.userId ||
    safeProfile.phone;
  return {
    userId: trimAfterSalesValue(rawUserId),
    userName:
      safeProfile.nickname ||
      safeProfile.name ||
      safeProfile.username ||
      "匿名用户",
    userAvatar: safeProfile.avatar || safeProfile.avatarUrl || "",
  };
}

export function buildShopReviewPayload({
  order = {},
  shopRating = 0,
  shopReview = {},
  profile = {},
} = {}) {
  const userProfile = resolveOrderReviewUserProfile(profile, order);
  return {
    shopId: trimAfterSalesValue(order.shopId),
    orderId: trimAfterSalesValue(order.id),
    userId: userProfile.userId,
    rating: Number(shopRating || 0),
    content: shopReview.content || "",
    images: Array.isArray(shopReview.images) ? shopReview.images : [],
    userName: userProfile.userName,
    userAvatar: userProfile.userAvatar,
  };
}

export function buildRiderReviewPayload({
  order = {},
  riderRating = 0,
  riderReview = {},
  profile = {},
} = {}) {
  const userProfile = resolveOrderReviewUserProfile(profile, order);
  return {
    riderId: trimAfterSalesValue(order.riderId),
    orderId: trimAfterSalesValue(order.id),
    userId: userProfile.userId,
    rating: Number(riderRating || 0),
    content: riderReview.content || "",
    images: Array.isArray(riderReview.images) ? riderReview.images : [],
    userName: userProfile.userName,
    userAvatar: userProfile.userAvatar,
  };
}

export function buildOrderReviewChatUrl(order = {}) {
  const shopId = trimAfterSalesValue(order.shopId || order.id);
  if (!shopId) {
    return "";
  }
  const shopName = order.shopName || "商家";
  const shopLogo = order.shopLogo || "/static/images/default-shop.svg";
  return `/pages/message/chat/index?id=${encodeURIComponent(
    `shop_${shopId}`,
  )}&name=${encodeURIComponent(shopName)}&role=shop&avatar=${encodeURIComponent(
    shopLogo,
  )}`;
}

export function pickOrderReviewErrorMessage(
  error,
  fallback = "评价提交失败",
) {
  return error?.data?.error || error?.error || error?.message || fallback;
}
