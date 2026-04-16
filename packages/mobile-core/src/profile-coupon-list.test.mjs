import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerProfileCouponConditionText,
  buildConsumerProfileCouponQuery,
  createDefaultConsumerProfileCouponTabs,
  DEFAULT_CONSUMER_PROFILE_COUPON_TABS,
  formatConsumerProfileCouponAmount,
  formatConsumerProfileCouponDate,
  formatConsumerProfileCouponMoney,
  formatConsumerProfileCouponValidity,
  getConsumerProfileCouponStatusText,
  normalizeConsumerProfileCouponErrorMessage,
  normalizeConsumerProfileCouponList,
  normalizeConsumerProfileCouponRecord,
  normalizeConsumerProfileCouponStatus,
  resolveConsumerProfileCouponUserId,
} from "./profile-coupon-list.js";

test("profile coupon list helpers expose stable tabs and identity lookup", () => {
  assert.deepEqual(createDefaultConsumerProfileCouponTabs(), DEFAULT_CONSUMER_PROFILE_COUPON_TABS);
  assert.equal(
    resolveConsumerProfileCouponUserId({
      profile: { phone: "", userId: "u-2", id: "u-1" },
      storagePhone: "13800000000",
      storageUserId: "u-3",
    }),
    "u-2",
  );
  assert.deepEqual(buildConsumerProfileCouponQuery("u-2", "used"), {
    userId: "u-2",
    status: "used",
  });
  assert.equal(buildConsumerProfileCouponQuery("", "used"), null);
});

test("profile coupon list helpers normalize amounts, dates and status labels", () => {
  assert.equal(normalizeConsumerProfileCouponStatus("USED"), "used");
  assert.equal(normalizeConsumerProfileCouponStatus("other"), "unused");
  assert.equal(getConsumerProfileCouponStatusText("expired"), "已过期");
  assert.equal(formatConsumerProfileCouponMoney(18), "18");
  assert.equal(formatConsumerProfileCouponAmount({ type: "fixed", amount: 18.5 }), "¥18.50");
  assert.equal(formatConsumerProfileCouponAmount({ type: "percent", amount: 15 }), "85折");
  assert.equal(
    buildConsumerProfileCouponConditionText({ minAmount: 20 }),
    "满¥20可用",
  );
  assert.equal(formatConsumerProfileCouponDate("2026-04-17T08:00:00Z"), "2026-04-17");
  assert.equal(
    formatConsumerProfileCouponValidity("2026-04-01", "2026-04-30"),
    "2026-04-01 至 2026-04-30",
  );
});

test("profile coupon list helpers normalize coupon rows and errors", () => {
  assert.deepEqual(
    normalizeConsumerProfileCouponRecord(
      {
        id: "row-1",
        status: "expired",
        receivedAt: "2026-04-17T08:00:00Z",
        coupon: {
          name: "满减券",
          amount: 12,
          minAmount: 30,
          validFrom: "2026-04-01",
          validUntil: "2026-04-30",
        },
      },
      0,
    ),
    {
      id: "row-1",
      status: "expired",
      statusText: "已过期",
      name: "满减券",
      amountText: "¥12",
      condition: "满¥30可用",
      validity: "2026-04-01 至 2026-04-30",
      receivedAtText: "2026-04-17",
    },
  );
  assert.deepEqual(
    normalizeConsumerProfileCouponList({
      data: [
        {
          couponId: "coupon-1",
          coupon: {
            type: "percent",
            amount: 10,
            conditionType: "no_threshold",
          },
        },
      ],
    }),
    [
      {
        id: "coupon-1_0",
        status: "unused",
        statusText: "未使用",
        name: "优惠券",
        amountText: "90折",
        condition: "无门槛可用",
        validity: "-",
        receivedAtText: "",
      },
    ],
  );
  assert.equal(
    normalizeConsumerProfileCouponErrorMessage({ data: { error: "读取失败" } }),
    "读取失败",
  );
});
