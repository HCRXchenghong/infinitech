import test from "node:test";
import assert from "node:assert/strict";

import {
  AFTER_SALES_REFUND_TYPES,
  buildAfterSalesSelectedProducts,
  buildOrderReviewChatUrl,
  buildRiderReviewPayload,
  buildShopReviewPayload,
  createDefaultAfterSalesOrder,
  createDefaultOrderReviewDraft,
  createDefaultOrderReviewOrder,
  formatAfterSalesPrice,
  hasOrderReviewRider,
  isAfterSalesPhoneValid,
  normalizeAfterSalesBizType,
  normalizeAfterSalesMoneyInput,
  normalizeAfterSalesOrder,
  normalizeAfterSalesProductList,
  normalizeOrderReviewOrder,
  parseAfterSalesOrderStatus,
  pickAfterSalesErrorMessage,
  pickOrderReviewErrorMessage,
  resolveOrderReviewUserProfile,
  yuanToFen,
} from "./order-after-sales.js";

test("order after-sales helpers expose stable defaults", () => {
  assert.equal(AFTER_SALES_REFUND_TYPES.length, 3);
  assert.deepEqual(createDefaultAfterSalesOrder(), {
    id: "",
    shopName: "",
    shopLogo: "",
    time: "",
    bizType: "takeout",
    status: "pending",
    productList: [],
    totalPrice: 0,
  });
  assert.deepEqual(createDefaultOrderReviewOrder(), {
    id: "",
    shopName: "",
    shopLogo: "",
    time: "",
    shopId: "",
    userId: "",
    riderId: "",
    isReviewed: false,
  });
  assert.deepEqual(createDefaultOrderReviewDraft(), {
    content: "",
    images: [],
  });
});

test("order after-sales helpers normalize refund orders and money values", () => {
  assert.equal(normalizeAfterSalesBizType(" 团购 "), "groupbuy");
  assert.equal(parseAfterSalesOrderStatus("已核销", "groupbuy"), "redeemed");
  assert.deepEqual(
    normalizeAfterSalesProductList({
      items: '[{"name":"招牌奶茶","price":18,"count":2}]',
    }),
    [{ name: "招牌奶茶", price: 18, count: 2 }],
  );
  assert.deepEqual(
    normalizeAfterSalesOrder({
      id: "order-1",
      shop_name: "甜品铺",
      shop: { logo: "logo.png" },
      biz_type: "groupbuy",
      status: "已退款",
      items: "杨枝甘露",
      product_price: 12,
      total_price: 24,
    }),
    {
      id: "order-1",
      shopName: "甜品铺",
      shopLogo: "logo.png",
      time: "",
      bizType: "groupbuy",
      status: "refunded",
      productList: [{ name: "杨枝甘露", price: 12, count: 1 }],
      totalPrice: 24,
    },
  );
  assert.equal(formatAfterSalesPrice(18), "18");
  assert.equal(normalizeAfterSalesMoneyInput("12a.345"), "12.34");
  assert.equal(yuanToFen("12.34"), 1234);
  assert.equal(yuanToFen("abc"), 0);
  assert.equal(isAfterSalesPhoneValid("13800138000"), true);
  assert.equal(isAfterSalesPhoneValid("123"), false);
  assert.deepEqual(
    buildAfterSalesSelectedProducts(
      [{ name: "蛋糕", price: 20, count: 1 }, { title: "奶茶", sku: "中杯", price: 12, count: 2 }],
      [1],
    ),
    [{ name: "奶茶", spec: "中杯", price: 12, count: 2 }],
  );
  assert.equal(
    pickAfterSalesErrorMessage({ data: { error: "退款失败" } }, "提交失败"),
    "退款失败",
  );
});

test("order after-sales helpers normalize review orders and payloads", () => {
  const order = normalizeOrderReviewOrder({
    id: 11,
    shop_id: 22,
    shop: { name: "深夜食堂", logo: "shop.png" },
    created_at: "2026-04-17 12:00",
    user_id: 33,
    rider_id: 44,
    is_reviewed: "1",
  });
  assert.deepEqual(order, {
    id: "11",
    shopId: "22",
    shopName: "深夜食堂",
    shopLogo: "shop.png",
    time: "2026-04-17 12:00",
    userId: "33",
    riderId: "44",
    isReviewed: true,
  });
  assert.equal(hasOrderReviewRider(order), true);
  assert.deepEqual(
    resolveOrderReviewUserProfile({ nickname: "小张", avatarUrl: "avatar.png" }, order),
    { userId: "33", userName: "小张", userAvatar: "avatar.png" },
  );
  assert.deepEqual(
    buildShopReviewPayload({
      order,
      shopRating: 5,
      shopReview: { content: "很好", images: ["a.png"] },
      profile: { id: "99", nickname: "小张" },
    }),
    {
      shopId: "22",
      orderId: "11",
      userId: "99",
      rating: 5,
      content: "很好",
      images: ["a.png"],
      userName: "小张",
      userAvatar: "",
    },
  );
  assert.deepEqual(
    buildRiderReviewPayload({
      order,
      riderRating: 4,
      riderReview: { content: "很快", images: [] },
      profile: { userId: "99", username: "tester" },
    }),
    {
      riderId: "44",
      orderId: "11",
      userId: "99",
      rating: 4,
      content: "很快",
      images: [],
      userName: "tester",
      userAvatar: "",
    },
  );
  assert.equal(
    buildOrderReviewChatUrl(order),
    "/pages/message/chat/index?id=shop_22&name=%E6%B7%B1%E5%A4%9C%E9%A3%9F%E5%A0%82&role=shop&avatar=shop.png",
  );
  assert.equal(
    pickOrderReviewErrorMessage({ error: "提交失败" }, "评价失败"),
    "提交失败",
  );
});
