const DEFAULT_COUPON_FILTERS = Object.freeze({
  source: "",
  status: "",
  keyword: "",
  shopId: "",
  page: 1,
  limit: 20,
});

const DEFAULT_COUPON_ISSUE_LOG_FILTERS = Object.freeze({
  status: "",
  keyword: "",
  page: 1,
  limit: 20,
});

const DEFAULT_COUPON_CREATE_FORM = Object.freeze({
  name: "",
  source: "customer_service",
  shopId: "",
  type: "fixed",
  amount: 10,
  maxDiscount: 0,
  conditionType: "threshold",
  minAmount: 0,
  totalCount: 100,
  budgetCost: 0,
  claimLinkEnabled: false,
  description: "",
});

const DEFAULT_COUPON_ISSUE_FORM = Object.freeze({
  couponId: "",
  phone: "",
});

const COUPON_VALIDITY_RANGE_DAYS = 7;

function normalizeTrimmedText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized || fallback;
}

function normalizePositiveInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.floor(numeric);
}

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function createDate(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date();
}

function createDateTimeRange(now = new Date()) {
  const start = createDate(now);
  return {
    validFrom: start,
    validUntil: new Date(
      start.getTime() + COUPON_VALIDITY_RANGE_DAYS * 24 * 60 * 60 * 1000,
    ),
  };
}

function toISOStringOrEmpty(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

export const COUPON_PHONE_PATTERN = /^1[3-9]\d{9}$/;

export function createCouponManagementFilters(overrides = {}) {
  return {
    ...DEFAULT_COUPON_FILTERS,
    ...overrides,
  };
}

export function createCouponIssueLogFilters(overrides = {}) {
  return {
    ...DEFAULT_COUPON_ISSUE_LOG_FILTERS,
    ...overrides,
  };
}

export function createCouponCreateForm(now = new Date(), overrides = {}) {
  const validity = createDateTimeRange(now);
  return {
    ...DEFAULT_COUPON_CREATE_FORM,
    ...validity,
    ...overrides,
  };
}

export function createCouponIssueForm(overrides = {}) {
  return {
    ...DEFAULT_COUPON_ISSUE_FORM,
    ...overrides,
  };
}

export function createCouponCreateRules() {
  return {
    name: [{ required: true, message: "请输入券名称", trigger: "blur" }],
    source: [{ required: true, message: "请选择来源", trigger: "change" }],
    type: [{ required: true, message: "请选择优惠类型", trigger: "change" }],
    amount: [{ required: true, message: "请输入优惠金额", trigger: "change" }],
    validFrom: [
      { required: true, message: "请选择开始时间", trigger: "change" },
    ],
    validUntil: [
      { required: true, message: "请选择结束时间", trigger: "change" },
    ],
  };
}

export function createCouponIssueRules() {
  return {
    phone: [
      { required: true, message: "请输入手机号", trigger: "blur" },
      {
        pattern: COUPON_PHONE_PATTERN,
        message: "手机号格式不正确",
        trigger: "blur",
      },
    ],
  };
}

export function buildCouponAdminListParams(filters = {}) {
  return {
    source: normalizeTrimmedText(filters.source) || undefined,
    status: normalizeTrimmedText(filters.status) || undefined,
    keyword: normalizeTrimmedText(filters.keyword) || undefined,
    shopId: normalizeTrimmedText(filters.shopId) || undefined,
    page: normalizePositiveInteger(filters.page, DEFAULT_COUPON_FILTERS.page),
    limit: normalizePositiveInteger(filters.limit, DEFAULT_COUPON_FILTERS.limit),
  };
}

export function buildCouponIssueLogListParams(filters = {}) {
  return {
    status: normalizeTrimmedText(filters.status) || undefined,
    keyword: normalizeTrimmedText(filters.keyword) || undefined,
    page: normalizePositiveInteger(
      filters.page,
      DEFAULT_COUPON_ISSUE_LOG_FILTERS.page,
    ),
    limit: normalizePositiveInteger(
      filters.limit,
      DEFAULT_COUPON_ISSUE_LOG_FILTERS.limit,
    ),
  };
}

export function getCouponSourceLabel(source) {
  if (source === "merchant") return "商户券";
  if (source === "customer_service") return "客服券";
  if (source === "port_1788") return "平台";
  return source || "-";
}

export function getCouponSourceTagType(source) {
  if (source === "merchant") return "warning";
  if (source === "customer_service") return "success";
  if (source === "port_1788") return "primary";
  return "info";
}

export function formatCouponMoney(value) {
  const numeric = normalizeNumber(value);
  return numeric.toFixed(2).replace(/\.00$/, "");
}

export function formatCouponCurrency(value) {
  return `¥${formatCouponMoney(value)}`;
}

export function formatCouponFenAmount(value) {
  const numeric = normalizeNumber(value);
  return (numeric / 100).toFixed(2);
}

export function formatCouponDateTime(raw) {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function formatCouponManagementRuleText(coupon = {}) {
  const amount = normalizeNumber(coupon.amount);
  const minAmount = normalizeNumber(coupon.minAmount);
  const type = coupon.type || "fixed";
  const noThreshold =
    coupon.conditionType === "no_threshold" || minAmount <= 0;

  if (type === "fixed") {
    if (noThreshold) {
      return `无门槛减 ¥${amount.toFixed(2)}`;
    }
    return `满 ¥${minAmount.toFixed(2)} 减 ¥${amount.toFixed(2)}`;
  }

  const maxDiscount = normalizeNumber(coupon.maxDiscount);
  const discountText = `${(100 - amount).toFixed(0)} 折`;
  const capText =
    maxDiscount > 0 ? `，最高减 ¥${maxDiscount.toFixed(2)}` : "";
  if (noThreshold) {
    return `${discountText}${capText}`;
  }
  return `满 ¥${minAmount.toFixed(2)} ${discountText}${capText}`;
}

export function displayCouponTotalCount(totalCount) {
  const value = normalizeNumber(totalCount);
  return value <= 0 ? "不限" : value;
}

export function displayCouponRemainingCount(remainingCount) {
  const value = Number(remainingCount);
  if (Number.isNaN(value)) return "-";
  return value < 0 ? "不限" : value;
}

export function shortenCouponLink(link, limit = 34) {
  const value = String(link || "");
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}...`;
}

export function validateCouponCreateDraft(form = {}) {
  const start = new Date(form.validFrom).getTime();
  const end = new Date(form.validUntil).getTime();
  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start >= end
  ) {
    return { valid: false, message: "结束时间必须晚于开始时间" };
  }

  if (
    form.source === "merchant" &&
    !normalizeTrimmedText(form.shopId)
  ) {
    return { valid: false, message: "商户券请填写店铺ID" };
  }

  return { valid: true, message: "" };
}

export function buildCouponCreatePayload(form = {}) {
  return {
    name: normalizeTrimmedText(form.name),
    source: form.source || DEFAULT_COUPON_CREATE_FORM.source,
    shopId: normalizeTrimmedText(form.shopId),
    type: form.type || DEFAULT_COUPON_CREATE_FORM.type,
    amount: normalizeNumber(form.amount),
    maxDiscount:
      form.type === "percent" ? normalizeNumber(form.maxDiscount) : null,
    conditionType:
      form.conditionType || DEFAULT_COUPON_CREATE_FORM.conditionType,
    minAmount:
      form.conditionType === "no_threshold"
        ? 0
        : normalizeNumber(form.minAmount),
    totalCount: normalizeNumber(form.totalCount),
    budgetCost: normalizeNumber(form.budgetCost),
    validFrom: toISOStringOrEmpty(form.validFrom),
    validUntil: toISOStringOrEmpty(form.validUntil),
    claimLinkEnabled: Boolean(form.claimLinkEnabled),
    description: String(form.description || ""),
  };
}

export function getCouponIssueChannelLabel(channel) {
  const value = String(channel || "");
  if (value === "support_chat") return "客服会话";
  if (value === "monitor_chat") return "监控会话";
  if (value === "admin_panel") return "管理后台";
  return value || "-";
}

export function buildCouponIssuePayload(phone, channel = "admin_panel") {
  return {
    phone: normalizeTrimmedText(phone),
    channel,
  };
}

export function isCouponPhoneValid(phone) {
  return COUPON_PHONE_PATTERN.test(normalizeTrimmedText(phone));
}

export function formatCouponDisplayAmount(coupon) {
  if (!coupon) return "-";

  const amount = normalizeNumber(coupon.amount);
  if (String(coupon.type || "").toLowerCase() === "percent") {
    const discount = Math.max(0, 100 - amount);
    return `${discount.toFixed(0)}折`;
  }

  return formatCouponCurrency(amount);
}

export function formatCouponLandingRuleText(coupon) {
  if (!coupon) return "优惠券";

  const type = String(coupon.type || "").toLowerCase();
  const minAmount = normalizeNumber(coupon.minAmount);
  const noThreshold =
    String(coupon.conditionType || "") === "no_threshold" || minAmount <= 0;

  if (type === "fixed") {
    if (noThreshold) return "全场通用无门槛券";
    return `满${formatCouponCurrency(minAmount)}可用`;
  }

  if (noThreshold) return "全场通用折扣券";
  return `满${formatCouponCurrency(minAmount)}可用`;
}

export function formatCouponValidityRange(coupon) {
  if (!coupon) return "-";
  return `${formatCouponDateTime(coupon.validFrom)} - ${formatCouponDateTime(
    coupon.validUntil,
  )}`;
}

export function getCouponLandingRemainingText(coupon) {
  if (!coupon) return "-";

  const total = normalizeNumber(coupon.totalCount);
  const remaining = Number(coupon.remainingCount);
  if (total <= 0 || remaining < 0 || Number.isNaN(remaining)) {
    return "不限";
  }
  return String(Math.max(0, remaining));
}

export function getCouponClaimBlockedText(coupon, now = Date.now()) {
  if (!coupon) return "优惠券加载中";

  if (String(coupon.status || "") !== "active") {
    return "该优惠券暂不可领取";
  }

  const currentTime =
    now instanceof Date ? now.getTime() : new Date(now).getTime();
  const start = new Date(coupon.validFrom).getTime();
  const end = new Date(coupon.validUntil).getTime();
  if (!Number.isNaN(start) && currentTime < start) {
    return "未到领取时间";
  }
  if (!Number.isNaN(end) && currentTime > end) {
    return "该优惠券已过期";
  }

  const total = normalizeNumber(coupon.totalCount);
  const remaining = Number(coupon.remainingCount);
  if (total > 0 && !Number.isNaN(remaining) && remaining <= 0) {
    return "该优惠券已领完";
  }

  return "";
}

export function applyCouponClaimSuccess(coupon) {
  if (!coupon || typeof coupon !== "object") {
    return coupon || null;
  }

  const next = { ...coupon };
  const received = Number(next.receivedCount || 0);
  next.receivedCount = Number.isNaN(received) ? 1 : received + 1;

  const total = normalizeNumber(next.totalCount);
  const remaining = Number(next.remainingCount);
  if (total > 0 && !Number.isNaN(remaining)) {
    next.remainingCount = Math.max(0, remaining - 1);
  }

  return next;
}
