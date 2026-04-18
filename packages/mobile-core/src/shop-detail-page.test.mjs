import test from "node:test";
import assert from "node:assert/strict";

import {
  formatShopDetailRating,
  formatShopReviewTime,
  getShopCouponAmount,
  getShopCouponDesc,
  getShopDiscountAmount,
  getShopDiscountDesc,
  normalizeShopReviewImages,
  createShopDetailState,
  shopDetailComputed,
} from "./shop-detail-page.js";

function attachComputed(instance) {
  Object.entries(shopDetailComputed).forEach(([key, getter]) => {
    Object.defineProperty(instance, key, {
      configurable: true,
      enumerable: true,
      get: getter.bind(instance),
    });
  });
  return instance;
}

test("shop detail helpers expose stable defaults and computed summaries", () => {
  assert.deepEqual(createShopDetailState(), {
    shop: {},
    activeTab: "reviews",
    reviews: [],
    reviewTotal: 0,
    reviewGoodCount: 0,
    reviewBadCount: 0,
    reviewAvgRating: 0,
    reviewFilter: "all",
    isCollected: false,
    favoriteLoading: false,
    loading: true,
    activeCoupons: [],
  });

  const instance = attachComputed({
    shop: { perCapita: "26.2" },
    reviewTotal: 8,
    reviewGoodCount: 6,
    reviewBadCount: 1,
    reviewAvgRating: 4.3,
    reviewFilter: "latest",
    reviews: [
      { id: "2", rating: 5 },
      { id: "9", rating: 4 },
      { id: "5", rating: 2 },
    ],
  });

  assert.equal(instance.perCapita, "26");
  assert.equal(instance.reviewCount, 8);
  assert.equal(instance.goodRateBarWidth, "75%");
  assert.equal(instance.badRateText, "13%");
  assert.deepEqual(
    instance.filteredReviews.map((item) => item.id),
    ["9", "5", "2"],
  );
});

test("shop detail methods keep coupon, rating, and image normalization stable", () => {
  assert.equal(getShopCouponAmount({ type: "fixed", amount: 12 }), "¥12");
  assert.equal(getShopCouponAmount({ type: "discount", amount: 8 }), "92折");
  assert.equal(getShopCouponDesc({ minAmount: 20 }), "满20元");
  assert.equal(getShopCouponDesc({ minAmount: 0 }), "无门槛");
  assert.equal(formatShopDetailRating(4.26), "4.3");
  assert.equal(
    formatShopReviewTime("2026-04-18T09:00:00.000Z", new Date("2026-04-18T12:00:00.000Z")),
    "今天",
  );
  assert.deepEqual(normalizeShopReviewImages('["a.png","b.png"]'), ["a.png", "b.png"]);
  assert.deepEqual(normalizeShopReviewImages("cover.png"), ["cover.png"]);
  assert.equal(getShopDiscountAmount("满30减8"), "30");
  assert.equal(getShopDiscountDesc("满30减8"), "减8");
});
