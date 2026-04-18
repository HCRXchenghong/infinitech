import test from "node:test";
import assert from "node:assert/strict";

import {
  createErrandHomePage,
  formatConsumerErrandHomePrice,
  normalizeConsumerErrandHomeOrderCollection,
} from "./consumer-errand-home.js";

test("consumer errand home helpers normalize order collections and prices", () => {
  assert.deepEqual(normalizeConsumerErrandHomeOrderCollection([{ id: "1" }]), [
    { id: "1" },
  ]);
  assert.deepEqual(
    normalizeConsumerErrandHomeOrderCollection({ data: [{ id: "2" }] }),
    [{ id: "2" }],
  );
  assert.deepEqual(
    normalizeConsumerErrandHomeOrderCollection({ list: [{ id: "3" }] }),
    [{ id: "3" }],
  );
  assert.equal(formatConsumerErrandHomePrice("18.6"), "18.60");
  assert.equal(formatConsumerErrandHomePrice("bad"), "0.00");
});

test("consumer errand home page loads runtime and recent errand orders through shared services", async () => {
  const calls = [];
  const navigations = [];
  const toasts = [];
  const sharedComponents = { PageHeader: { name: "PageHeader" } };
  const page = createErrandHomePage({
    async fetchOrders(userId) {
      calls.push(["fetchOrders", userId]);
      return {
        data: [
          { id: "errand-1", kind: "errand", totalPrice: 18.5 },
          { id: "food-1", kind: "food", totalPrice: 9.9 },
        ],
      };
    },
    async loadPlatformRuntimeSettings() {
      calls.push(["loadRuntime"]);
      return {
        errandSettings: {
          page_title: "极速跑腿",
          hero_title: "全城帮送",
          hero_desc: "统一跑腿入口",
          detail_tip: "费用以下单页为准",
          services: [
            {
              key: "buy",
              label: "帮我买",
              desc: "超市代购",
              icon: "购",
              color: "#ff6b00",
              route: "/pages/errand/buy/index",
              service_fee_hint: "按距离计费",
            },
          ],
        },
      };
    },
    isRuntimeRouteEnabled(runtime, routeType, routeValue, clientId) {
      calls.push(["isRuntimeRouteEnabled", routeType, routeValue, clientId]);
      return Boolean(runtime?.errandSettings);
    },
    getCurrentUserIdentity() {
      return { userId: "user-1" };
    },
    isErrandOrder(order) {
      return order.kind === "errand";
    },
    mapErrandOrderSummary(order) {
      return {
        id: order.id,
        status: "待接单",
        item: "超市采购",
        serviceName: "帮我买",
        totalPrice: order.totalPrice,
      };
    },
    getMobileClientId() {
      return "user-vue";
    },
    uniApp: {
      navigateTo(payload) {
        navigations.push(payload);
      },
      showToast(payload) {
        toasts.push(payload);
      },
    },
    components: sharedComponents,
  });

  const instance = {
    ...page.data(),
    ...page.methods,
  };

  await page.onLoad.call(instance);
  instance.goService(instance.services[0]);
  instance.goOrderDetail(instance.recentOrders[0]);

  assert.equal(page.components, sharedComponents);
  assert.equal(instance.featureEnabled, true);
  assert.equal(instance.pageTitle, "极速跑腿");
  assert.equal(instance.heroTitle, "全城帮送");
  assert.equal(instance.loadingRecent, false);
  assert.deepEqual(instance.recentOrders, [
    {
      id: "errand-1",
      status: "待接单",
      item: "超市采购",
      serviceName: "帮我买",
      totalPrice: 18.5,
    },
  ]);
  assert.deepEqual(navigations, [
    { url: "/pages/errand/buy/index" },
    { url: "/pages/errand/detail/index?id=errand-1" },
  ]);
  assert.deepEqual(toasts, [{ title: "按距离计费", icon: "none" }]);
  assert.deepEqual(calls, [
    ["loadRuntime"],
    ["isRuntimeRouteEnabled", "feature", "errand", "user-vue"],
    ["fetchOrders", "user-1"],
  ]);
});

test("consumer errand home page blocks closed services and skips recent requests for anonymous users", async () => {
  const navigations = [];
  const toasts = [];
  const page = createErrandHomePage({
    async fetchOrders() {
      throw new Error("should not fetch");
    },
    async loadPlatformRuntimeSettings() {
      return {};
    },
    isRuntimeRouteEnabled() {
      return false;
    },
    getCurrentUserIdentity() {
      return {};
    },
    buildErrandHomeViewModel() {
      return {
        pageTitle: "跑腿",
        heroTitle: "同城跑腿",
        heroDesc: "默认文案",
        detailTip: "",
        services: [{ id: "deliver", route: "/pages/errand/deliver/index" }],
      };
    },
    uniApp: {
      navigateTo(payload) {
        navigations.push(payload);
      },
      showToast(payload) {
        toasts.push(payload);
      },
    },
  });

  const instance = {
    ...page.data(),
    ...page.methods,
  };

  await page.onLoad.call(instance);
  instance.goService(instance.services[0]);

  assert.equal(instance.featureEnabled, false);
  assert.deepEqual(instance.recentOrders, []);
  assert.deepEqual(toasts, [{ title: "当前服务暂未开放", icon: "none" }]);
  assert.deepEqual(navigations, []);
});
