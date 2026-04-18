import test from "node:test";
import assert from "node:assert/strict";

import {
  buildErrandOrderPayload,
  getCurrentUserIdentity,
  getErrandServiceMeta,
  isErrandOrder,
  mapErrandOrderDetail,
  mapErrandOrderSummary,
  requireCurrentUserIdentity,
} from "./consumer-errand.js";

test("consumer errand identity helpers read profile storage and redirect anonymous users", () => {
  const calls = [];
  const uniApp = {
    getStorageSync() {
      return {};
    },
    showToast(payload) {
      calls.push(["toast", payload]);
    },
    navigateTo(payload) {
      calls.push(["navigate", payload]);
    },
  };

  assert.deepEqual(getCurrentUserIdentity({ uniApp }), {
    userId: "",
    phone: "",
    name: "",
  });

  const identity = requireCurrentUserIdentity({
    uniApp,
    schedule(callback) {
      callback();
    },
  });

  assert.equal(identity, null);
  assert.deepEqual(calls, [
    ["toast", { title: "请先登录", icon: "none" }],
    ["navigate", { url: "/pages/auth/login/index" }],
  ]);
});

test("consumer errand helpers normalize service metadata and payload creation", () => {
  assert.deepEqual(getErrandServiceMeta("pickup"), {
    serviceType: "errand_pickup",
    name: "帮我取",
    summary: "快递代取",
  });

  assert.deepEqual(
    buildErrandOrderPayload(
      {
        serviceType: "deliver",
        itemDescription: "文件袋",
        totalPrice: "18.6",
        estimatedAmount: "12",
        deliveryFee: "6.6",
        tipAmount: "3",
        pickup: "虹桥天地",
        dropoff: "静安寺",
        preferredTime: "立即送达",
        remark: "轻拿轻放",
      },
      { userId: "u-1", phone: "13800000000", name: "张三" },
    ),
    {
      userId: "u-1",
      phone: "13800000000",
      name: "张三",
      bizType: "takeout",
      shopName: "跑腿服务",
      serviceType: "errand_deliver",
      serviceDescription: "帮我送",
      items: "文件袋",
      price: 18.6,
      totalPrice: 18.6,
      productPrice: 12,
      deliveryFee: 6.6,
      address: "静安寺",
      preferredTime: "立即送达",
      errandLocation: { pickup: "虹桥天地", dropoff: "静安寺" },
      errandRequest: {
        serviceType: "errand_deliver",
        serviceName: "帮我送",
        itemDescription: "文件袋",
        estimatedAmount: 12,
        tipAmount: 3,
      },
      errandRequirements: {
        preferredTime: "立即送达",
        remark: "轻拿轻放",
      },
    },
  );
});

test("consumer errand helpers normalize detail projections from mixed payloads", () => {
  const detail = mapErrandOrderDetail({
    id: "order-1",
    service_type: "task",
    status_text: "配送中",
    rider_name: "骑手A",
    rider_phone: "13900000000",
    errand_request: JSON.stringify({
      taskDescription: "代办证件",
      estimatedAmount: 25,
    }),
    errand_location: JSON.stringify({
      pickup: "政务中心",
    }),
    errand_requirements: JSON.stringify({
      preferredTime: "今天 18:00",
      remark: "请先电话联系",
    }),
    total_price: 38,
    delivery_fee: 13,
    created_at: "2026-04-18T10:00:00.000Z",
  });

  assert.equal(detail.serviceType, "errand_do");
  assert.equal(detail.serviceName, "帮我办");
  assert.equal(detail.item, "代办证件");
  assert.equal(detail.pickup, "政务中心");
  assert.equal(detail.dropoff, "");
  assert.equal(detail.amount, 25);
  assert.equal(detail.deliveryFee, 13);
  assert.equal(detail.totalPrice, 38);
  assert.equal(detail.preferredTime, "今天 18:00");
  assert.equal(detail.remark, "请先电话联系");
  assert.equal(detail.statusText, "配送中");
});

test("consumer errand helpers detect errand orders and build summary cards", () => {
  assert.equal(
    isErrandOrder({
      errand_request: JSON.stringify({ itemDescription: "鲜花" }),
    }),
    true,
  );

  assert.deepEqual(
    mapErrandOrderSummary({
      id: "order-2",
      serviceType: "buy",
      statusText: "待接单",
      items: "鲜花",
      totalPrice: 52,
      createdAt: "2026-04-18 12:00:00",
    }),
    {
      id: "order-2",
      status: "待接单",
      item: "鲜花",
      serviceName: "帮我买",
      totalPrice: 52,
      createdAtText: "04-18 12:00",
    },
  );
});
