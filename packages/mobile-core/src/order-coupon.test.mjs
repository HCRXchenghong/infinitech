import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerOrderCouponConditionText,
  buildConsumerOrderCouponSelectionPayload,
  buildConsumerOrderCouponUnavailableMessage,
  canUseConsumerOrderCoupon,
  extractConsumerAvailableOrderCoupons,
  formatConsumerOrderCouponAmount,
  formatConsumerOrderCouponDiscountLabel,
  formatConsumerOrderCouponValidity,
  resolveConsumerOrderCouponUserId,
} from "./order-coupon.js";

test("order coupon helpers normalize user identity and available coupon payloads", () => {
  assert.equal(resolveConsumerOrderCouponUserId({ phone: "13812345678" }), "13812345678");
  assert.equal(resolveConsumerOrderCouponUserId({ id: "99" }), "99");
  assert.deepEqual(
    extractConsumerAvailableOrderCoupons({
      data: [{ id: 1 }],
    }),
    [{ id: 1 }],
  );
  assert.deepEqual(
    extractConsumerAvailableOrderCoupons({
      data: {
        items: [{ id: 2 }],
      },
    }),
    [{ id: 2 }],
  );
});

test("order coupon helpers format amount, conditions and validity consistently", () => {
  assert.equal(formatConsumerOrderCouponDiscountLabel(80), "2折");
  assert.equal(formatConsumerOrderCouponAmount({ type: "fixed", amount: 18 }), "18");
  assert.equal(formatConsumerOrderCouponAmount({ type: "percent", amount: 80 }), "2折");
  assert.equal(
    buildConsumerOrderCouponConditionText({ minAmount: 20 }),
    "满 20.00 元可用",
  );
  assert.equal(
    buildConsumerOrderCouponConditionText({ minAmount: 0 }),
    "无门槛可用",
  );
  assert.equal(
    formatConsumerOrderCouponValidity({
      validFrom: "2026-04-17",
      validUntil: "2026-04-18",
    }).includes("2026"),
    true,
  );
});

test("order coupon helpers keep eligibility and selection payload stable", () => {
  const userCoupon = {
    id: 8,
    coupon: {
      id: 3,
      minAmount: 30,
      name: "减10元",
    },
  };
  assert.equal(canUseConsumerOrderCoupon(userCoupon, 50), true);
  assert.equal(canUseConsumerOrderCoupon(userCoupon, 20), false);
  assert.equal(
    buildConsumerOrderCouponUnavailableMessage(userCoupon),
    "满 30.00 元可用",
  );
  assert.deepEqual(buildConsumerOrderCouponSelectionPayload(userCoupon), {
    selectedCoupon: userCoupon.coupon,
    selectedUserCouponId: 8,
  });
  assert.deepEqual(buildConsumerOrderCouponSelectionPayload(null), {
    selectedCoupon: null,
    selectedUserCouponId: null,
  });
});
