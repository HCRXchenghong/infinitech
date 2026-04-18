import {
  extractErrorMessage,
  extractPaginatedItems,
} from "../../contracts/src/http.js";

function trimProfileCouponText(value) {
  return String(value || "").trim();
}

function normalizeProfileCouponNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

export const DEFAULT_CONSUMER_PROFILE_COUPON_TABS = [
  { key: "all", label: "全部", value: "" },
  { key: "unused", label: "未使用", value: "unused" },
  { key: "used", label: "已使用", value: "used" },
  { key: "expired", label: "已过期", value: "expired" },
];

export function createDefaultConsumerProfileCouponTabs() {
  return DEFAULT_CONSUMER_PROFILE_COUPON_TABS.map((item) => ({ ...item }));
}

export function resolveConsumerProfileCouponUserId({
  profile = {},
  storagePhone = "",
  storageUserId = "",
} = {}) {
  const candidates = [
    profile?.phone,
    profile?.userId,
    profile?.id,
    storagePhone,
    storageUserId,
  ];

  for (const item of candidates) {
    const normalized = trimProfileCouponText(item);
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

export function buildConsumerProfileCouponQuery(userId, status = "") {
  const normalizedUserId = trimProfileCouponText(userId);
  if (!normalizedUserId) {
    return null;
  }

  const normalizedStatus = trimProfileCouponText(status);
  return normalizedStatus
    ? { userId: normalizedUserId, status: normalizedStatus }
    : { userId: normalizedUserId };
}

export function extractConsumerProfileCouponItems(payload) {
  return extractPaginatedItems(payload, {
    listKeys: ["coupons", "items", "records", "list"],
  }).items;
}

export function normalizeConsumerProfileCouponStatus(status) {
  const normalized = trimProfileCouponText(status).toLowerCase();
  if (normalized === "used" || normalized === "expired") {
    return normalized;
  }
  return "unused";
}

export function getConsumerProfileCouponStatusText(status) {
  const normalized = normalizeConsumerProfileCouponStatus(status);
  if (normalized === "used") return "已使用";
  if (normalized === "expired") return "已过期";
  return "未使用";
}

export function formatConsumerProfileCouponMoney(value) {
  const normalized = normalizeProfileCouponNumber(value);
  return normalized.toFixed(2).replace(/\.00$/, "");
}

export function formatConsumerProfileCouponAmount(coupon = {}) {
  const type = trimProfileCouponText(coupon.type).toLowerCase();
  const amount = normalizeProfileCouponNumber(coupon.amount);
  if (type === "percent") {
    return `${Math.max(0, 100 - amount).toFixed(0)}折`;
  }
  return `¥${formatConsumerProfileCouponMoney(amount)}`;
}

export function buildConsumerProfileCouponConditionText(coupon = {}) {
  const minAmount = normalizeProfileCouponNumber(coupon.minAmount);
  const noThreshold =
    trimProfileCouponText(coupon.conditionType) === "no_threshold" ||
    minAmount <= 0;
  if (noThreshold) {
    return "无门槛可用";
  }
  return `满¥${formatConsumerProfileCouponMoney(minAmount)}可用`;
}

export function formatConsumerProfileCouponDate(raw) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return trimProfileCouponText(raw);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatConsumerProfileCouponValidity(start, end) {
  const startText = formatConsumerProfileCouponDate(start);
  const endText = formatConsumerProfileCouponDate(end);
  if (!startText && !endText) {
    return "-";
  }
  return `${startText || "-"} 至 ${endText || "-"}`;
}

export function normalizeConsumerProfileCouponRecord(item = {}, index = 0) {
  const row = item && typeof item === "object" ? item : {};
  const coupon =
    row.coupon && typeof row.coupon === "object" ? row.coupon : {};
  const status = normalizeConsumerProfileCouponStatus(row.status);
  return {
    id:
      trimProfileCouponText(row.id) ||
      `${trimProfileCouponText(row.couponId)}_${
        trimProfileCouponText(row.receivedAt) || index
      }`,
    status,
    statusText: getConsumerProfileCouponStatusText(status),
    name: trimProfileCouponText(coupon.name) || "优惠券",
    amountText: formatConsumerProfileCouponAmount(coupon),
    condition: buildConsumerProfileCouponConditionText(coupon),
    validity: formatConsumerProfileCouponValidity(
      coupon.validFrom,
      coupon.validUntil,
    ),
    receivedAtText: formatConsumerProfileCouponDate(row.receivedAt),
  };
}

export function normalizeConsumerProfileCouponList(payload) {
  return extractConsumerProfileCouponItems(payload).map((item, index) =>
    normalizeConsumerProfileCouponRecord(item, index),
  );
}

export function normalizeConsumerProfileCouponErrorMessage(
  error,
  fallback = "加载优惠券失败",
) {
  if (error?.data?.error && typeof error.data.error === "string") {
    return error.data.error;
  }
  if (error?.data?.message && typeof error.data.message === "string") {
    return error.data.message;
  }
  return extractErrorMessage(error, fallback);
}

export function createProfileCouponListPage({
  fetchUserCoupons = async () => ([]),
} = {}) {
  return {
    data() {
      return {
        loading: false,
        status: "",
        userId: "",
        coupons: [],
        tabs: createDefaultConsumerProfileCouponTabs(),
      };
    },
    onShow() {
      this.initUserAndLoad();
    },
    methods: {
      changeStatus(status) {
        if (this.status === status) return;
        this.status = status;
        void this.loadCoupons();
      },
      initUserAndLoad() {
        const profile = uni.getStorageSync("userProfile") || {};
        this.userId = resolveConsumerProfileCouponUserId({
          profile,
          storagePhone: uni.getStorageSync("phone"),
          storageUserId: uni.getStorageSync("userId"),
        });
        void this.loadCoupons();
      },
      async loadCoupons() {
        const query = buildConsumerProfileCouponQuery(this.userId, this.status);
        if (!query) {
          this.coupons = [];
          return;
        }

        this.loading = true;
        try {
          const response = await fetchUserCoupons(query);
          this.coupons = normalizeConsumerProfileCouponList(response);
        } catch (error) {
          this.coupons = [];
          uni.showToast({
            title: normalizeConsumerProfileCouponErrorMessage(error),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
    },
  };
}
