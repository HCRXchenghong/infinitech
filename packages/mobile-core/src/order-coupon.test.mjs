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
import { createOrderCouponPage } from "./order-coupon-page.js";

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

test("order coupon page loads coupons and writes selection back to previous page", async () => {
  const requestCalls = [];
  const toastCalls = [];
  let navigateBackCount = 0;
  const previousPageVm = {};
  const originalUni = globalThis.uni;
  const originalGetCurrentPages = globalThis.getCurrentPages;

  globalThis.uni = {
    getStorageSync(key) {
      if (key === "userProfile") {
        return { id: "user-1" };
      }
      return {};
    },
    showToast(payload) {
      toastCalls.push(payload);
    },
    showLoading() {},
    hideLoading() {},
    navigateBack() {
      navigateBackCount += 1;
    },
  };
  globalThis.getCurrentPages = () => [{ $vm: previousPageVm }, {}];

  try {
    const page = createOrderCouponPage({
      request: async (config) => {
        requestCalls.push(config);
        return {
          data: {
            items: [
              {
                id: "user-coupon-1",
                coupon: {
                  id: "coupon-1",
                  minAmount: 20,
                  type: "fixed",
                  amount: 8,
                },
              },
            ],
          },
        };
      },
    });
    const instance = {
      ...page.data(),
      ...page.methods,
      shopId: "shop-8",
      orderAmount: 30,
    };

    await instance.loadCoupons();
    assert.equal(requestCalls.length, 1);
    assert.equal(instance.coupons.length, 1);

    instance.selectCoupon(instance.coupons[0]);
    instance.confirmSelection();

    assert.deepEqual(previousPageVm.selectedCoupon, {
      id: "coupon-1",
      minAmount: 20,
      type: "fixed",
      amount: 8,
    });
    assert.equal(previousPageVm.selectedUserCouponId, "user-coupon-1");
    assert.equal(navigateBackCount, 1);
    assert.deepEqual(toastCalls, []);
  } finally {
    globalThis.uni = originalUni;
    globalThis.getCurrentPages = originalGetCurrentPages;
  }
});
