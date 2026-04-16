import test from "node:test";
import assert from "node:assert/strict";

import {
  applyCouponClaimSuccess,
  buildCouponAdminListParams,
  buildCouponCreatePayload,
  buildCouponIssueLogListParams,
  buildCouponIssuePayload,
  COUPON_PHONE_PATTERN,
  createCouponCreateForm,
  createCouponCreateRules,
  createCouponIssueForm,
  createCouponIssueLogFilters,
  createCouponIssueRules,
  createCouponManagementFilters,
  displayCouponRemainingCount,
  displayCouponTotalCount,
  formatCouponCurrency,
  formatCouponDateTime,
  formatCouponDisplayAmount,
  formatCouponFenAmount,
  formatCouponLandingRuleText,
  formatCouponManagementRuleText,
  formatCouponMoney,
  formatCouponValidityRange,
  getCouponClaimBlockedText,
  getCouponIssueChannelLabel,
  getCouponLandingRemainingText,
  getCouponSourceLabel,
  getCouponSourceTagType,
  isCouponPhoneValid,
  shortenCouponLink,
  validateCouponCreateDraft,
} from "./coupon-resources.js";

test("coupon resources expose stable defaults and form rules", () => {
  const baseDate = new Date("2026-04-16T08:00:00.000Z");
  const form = createCouponCreateForm(baseDate);

  assert.deepEqual(createCouponManagementFilters(), {
    source: "",
    status: "",
    keyword: "",
    shopId: "",
    page: 1,
    limit: 20,
  });
  assert.deepEqual(createCouponIssueLogFilters(), {
    status: "",
    keyword: "",
    page: 1,
    limit: 20,
  });
  assert.equal(form.source, "customer_service");
  assert.equal(form.type, "fixed");
  assert.equal(form.amount, 10);
  assert.equal(form.validFrom.toISOString(), "2026-04-16T08:00:00.000Z");
  assert.equal(form.validUntil.toISOString(), "2026-04-23T08:00:00.000Z");
  assert.deepEqual(createCouponIssueForm(), { couponId: "", phone: "" });
  assert.equal(createCouponCreateRules().name[0].message, "请输入券名称");
  assert.equal(createCouponIssueRules().phone[1].pattern, COUPON_PHONE_PATTERN);
});

test("coupon resources keep admin list params and display semantics stable", () => {
  assert.deepEqual(
    buildCouponAdminListParams({
      source: " merchant ",
      status: "",
      keyword: " 夏日 ",
      shopId: " 18 ",
      page: "3",
      limit: "50",
    }),
    {
      source: "merchant",
      status: undefined,
      keyword: "夏日",
      shopId: "18",
      page: 3,
      limit: 50,
    },
  );
  assert.deepEqual(
    buildCouponIssueLogListParams({ status: "success", keyword: "138", page: 2, limit: 10 }),
    { status: "success", keyword: "138", page: 2, limit: 10 },
  );
  assert.equal(getCouponSourceLabel("customer_service"), "客服券");
  assert.equal(getCouponSourceTagType("port_1788"), "primary");
  assert.equal(
    formatCouponManagementRuleText({
      type: "percent",
      amount: 20,
      maxDiscount: 15,
      conditionType: "threshold",
      minAmount: 50,
    }),
    "满 ¥50.00 80 折，最高减 ¥15.00",
  );
  assert.equal(displayCouponTotalCount(0), "不限");
  assert.equal(displayCouponRemainingCount(-1), "不限");
  assert.equal(formatCouponMoney(10), "10");
  assert.equal(formatCouponCurrency(12.5), "¥12.50");
  assert.equal(formatCouponFenAmount(1288), "12.88");
  assert.equal(
    formatCouponDateTime("2026-04-16T08:05:00"),
    "2026-04-16 08:05",
  );
  assert.equal(shortenCouponLink("https://example.com/short"), "https://example.com/short");
});

test("coupon resources validate and build create payloads consistently", () => {
  const invalidDraft = validateCouponCreateDraft({
    source: "merchant",
    shopId: "",
    validFrom: "2026-04-16T10:00:00.000Z",
    validUntil: "2026-04-16T09:00:00.000Z",
  });
  assert.deepEqual(invalidDraft, {
    valid: false,
    message: "结束时间必须晚于开始时间",
  });

  const merchantDraft = validateCouponCreateDraft({
    source: "merchant",
    shopId: "",
    validFrom: "2026-04-16T08:00:00.000Z",
    validUntil: "2026-04-17T08:00:00.000Z",
  });
  assert.deepEqual(merchantDraft, {
    valid: false,
    message: "商户券请填写店铺ID",
  });

  assert.deepEqual(
    buildCouponCreatePayload({
      name: "  补偿券 ",
      source: "customer_service",
      shopId: "  ",
      type: "fixed",
      amount: "18.5",
      maxDiscount: 99,
      conditionType: "no_threshold",
      minAmount: 88,
      totalCount: "100",
      budgetCost: "1200",
      validFrom: "2026-04-16T08:00:00.000Z",
      validUntil: "2026-04-23T08:00:00.000Z",
      claimLinkEnabled: true,
      description: "说明",
    }),
    {
      name: "补偿券",
      source: "customer_service",
      shopId: "",
      type: "fixed",
      amount: 18.5,
      maxDiscount: null,
      conditionType: "no_threshold",
      minAmount: 0,
      totalCount: 100,
      budgetCost: 1200,
      validFrom: "2026-04-16T08:00:00.000Z",
      validUntil: "2026-04-23T08:00:00.000Z",
      claimLinkEnabled: true,
      description: "说明",
    },
  );
  assert.deepEqual(buildCouponIssuePayload(" 13800138000 "), {
    phone: "13800138000",
    channel: "admin_panel",
  });
  assert.equal(getCouponIssueChannelLabel("monitor_chat"), "监控会话");
  assert.equal(isCouponPhoneValid("13800138000"), true);
  assert.equal(isCouponPhoneValid("10086"), false);
});

test("coupon resources keep landing page semantics stable", () => {
  const coupon = {
    type: "percent",
    amount: 15,
    minAmount: 20,
    conditionType: "threshold",
    validFrom: "2026-04-16T08:00:00",
    validUntil: "2026-04-17T08:00:00",
    totalCount: 10,
    remainingCount: 3,
    status: "active",
    receivedCount: 2,
  };

  assert.equal(formatCouponDisplayAmount(coupon), "85折");
  assert.equal(formatCouponLandingRuleText(coupon), "满¥20可用");
  assert.equal(
    formatCouponValidityRange(coupon),
    "2026-04-16 08:00 - 2026-04-17 08:00",
  );
  assert.equal(getCouponLandingRemainingText(coupon), "3");
  assert.equal(
    getCouponClaimBlockedText(coupon, "2026-04-16T09:00:00"),
    "",
  );
  assert.equal(
    getCouponClaimBlockedText(
      { ...coupon, remainingCount: 0 },
      "2026-04-16T09:00:00",
    ),
    "该优惠券已领完",
  );
  assert.deepEqual(applyCouponClaimSuccess(coupon), {
    ...coupon,
    receivedCount: 3,
    remainingCount: 2,
  });
});
