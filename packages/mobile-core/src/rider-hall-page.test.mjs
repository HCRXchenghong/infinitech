import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderHallDisplayOrders,
  createRiderHallPageLogic,
} from "./rider-hall-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const hookName of ["onLoad", "onShow", "onReady", "onUnload", "onPullDownRefresh"]) {
    if (typeof component[hookName] === "function") {
      instance[hookName] = component[hookName].bind(instance);
    }
  }

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  for (const [name, getter] of Object.entries(component.computed || {})) {
    Object.defineProperty(instance, name, {
      get: () => getter.call(instance),
      enumerable: true,
      configurable: true,
    });
  }

  return instance;
}

test("rider hall helpers filter recommended orders by hall tabs", () => {
  const orders = [
    { id: "all-1", isRouteFriendly: false, isNearDistance: false, isHighPrice: false },
    { id: "route-1", isRouteFriendly: true, isNearDistance: false, isHighPrice: false },
    { id: "near-1", isRouteFriendly: false, isNearDistance: true, isHighPrice: false },
    { id: "high-1", isRouteFriendly: false, isNearDistance: false, isHighPrice: true },
  ];

  assert.equal(buildRiderHallDisplayOrders(orders, 0).length, 4);
  assert.deepEqual(
    buildRiderHallDisplayOrders(orders, 1).map((item) => item.id),
    ["route-1"],
  );
  assert.deepEqual(
    buildRiderHallDisplayOrders(orders, 2).map((item) => item.id),
    ["near-1"],
  );
  assert.deepEqual(
    buildRiderHallDisplayOrders(orders, 3).map((item) => item.id),
    ["high-1"],
  );
});

test("rider hall page logic keeps injected page components on the shared definition", () => {
  const componentRegistry = {
    IconHeadphones: { name: "IconHeadphones" },
    IconBell: { name: "IconBell" },
  };

  const component = createRiderHallPageLogic({
    components: componentRegistry,
  });

  assert.equal(component.components, componentRegistry);
});

test("rider hall page loads status, binds realtime refresh, updates location and handles grabbing orders", async () => {
  const events = [];
  const toasts = [];
  const loading = [];
  const navigations = [];
  const scheduledTimeouts = [];
  const intervals = [];
  const storageWrites = [];
  let loadRiderDataCount = 0;
  let loadAvailableOrdersCount = 0;
  let toggleOnlineStatusCount = 0;
  let grabOrderId = "";

  const riderOrderStore = {
    isOnline: true,
    todayEarnings: "88.6",
    newOrders: [
      {
        id: "order-1",
        countdown: 9,
        isRouteFriendly: true,
        isNearDistance: true,
        isHighPrice: false,
      },
      {
        id: "order-2",
        countdown: 4,
        isRouteFriendly: false,
        isNearDistance: false,
        isHighPrice: true,
      },
    ],
    myOrders: [{ id: "task-1" }],
  };

  const component = createRiderHallPageLogic({
    riderOrderStore,
    async toggleOnlineStatus() {
      toggleOnlineStatusCount += 1;
    },
    async grabOrder(orderId) {
      grabOrderId = orderId;
    },
    async loadAvailableOrders() {
      loadAvailableOrdersCount += 1;
    },
    async loadRiderData() {
      loadRiderDataCount += 1;
    },
    async getCurrentLocation() {
      return {
        latitude: 31.2304,
        longitude: 121.4737,
        address: "上海市黄浦区中山东一路",
        city: "上海市",
        district: "黄浦区",
        province: "上海市",
      };
    },
    uniApp: {
      getSystemInfoSync() {
        return { statusBarHeight: 32 };
      },
      $on(eventName) {
        events.push(`on:${eventName}`);
      },
      $off(eventName) {
        events.push(`off:${eventName}`);
      },
      showLoading(payload) {
        loading.push(payload.title);
      },
      hideLoading() {
        loading.push("hidden");
      },
      showToast(payload) {
        toasts.push(payload);
      },
      navigateTo({ url }) {
        navigations.push(url);
      },
      switchTab({ url }) {
        navigations.push(url);
      },
      stopPullDownRefresh() {
        events.push("stopPullDownRefresh");
      },
      setStorageSync(key, value) {
        storageWrites.push({ key, value });
      },
    },
    setTimeoutFn(callback) {
      scheduledTimeouts.push(callback);
      return scheduledTimeouts.length;
    },
    setIntervalFn(callback) {
      intervals.push(callback);
      return intervals.length;
    },
    clearIntervalFn(timerId) {
      events.push(`clear:${timerId}`);
    },
  });
  const page = instantiatePage(component);

  page.onLoad();
  await page.getLocation();
  assert.equal(page.statusBarHeight, 32);
  assert.equal(page.currentLocation, "上海市黄浦区中山东一路");
  assert.ok(storageWrites.length >= 1);
  assert.equal(storageWrites.at(-1).key, "riderCurrentLocation");

  intervals[0]();
  assert.equal(riderOrderStore.newOrders[0].countdown, 8);
  assert.equal(riderOrderStore.newOrders[1].countdown, 3);

  page.currentFilter = 1;
  assert.deepEqual(
    page.displayOrders.map((item) => item.id),
    ["order-1"],
  );

  await page.onShow();
  assert.equal(loadRiderDataCount, 1);
  assert.equal(loadAvailableOrdersCount, 1);
  assert.deepEqual(events.slice(0, 2), [
    "off:realtime:refresh:orders",
    "on:realtime:refresh:orders",
  ]);

  page.goService();
  assert.deepEqual(navigations, ["/pages/service/index"]);
  scheduledTimeouts[0]();
  assert.equal(page.isNavigating, false);

  page.handleToggleWork();
  assert.equal(page.showStopWorkModal, true);
  await page.confirmStopWork();
  assert.equal(toggleOnlineStatusCount, 1);
  assert.equal(page.showThanksModal, true);

  riderOrderStore.isOnline = false;
  page.handleToggleWork();
  assert.equal(page.showStartWorkModal, true);
  page.agreeTerms = true;
  await page.confirmStartWork();
  assert.equal(toggleOnlineStatusCount, 2);
  assert.equal(page.agreeTerms, false);

  await page.handleGrabOrder({ id: "order-2" });
  assert.equal(grabOrderId, "order-2");
  assert.deepEqual(loading, ["抢单中...", "hidden"]);
  assert.equal(toasts.at(-1).title, "抢单成功！");
  scheduledTimeouts[1]();
  assert.deepEqual(navigations, [
    "/pages/service/index",
    "/pages/tasks/index",
  ]);
  scheduledTimeouts[2]();
  assert.equal(page.isNavigating, false);

  page.onUnload();
  assert.ok(events.includes("clear:1"));
});

test("rider hall page falls back to cached location when location lookup fails", async () => {
  const riderOrderStore = {
    isOnline: false,
    todayEarnings: "0",
    newOrders: [],
    myOrders: [],
  };

  const component = createRiderHallPageLogic({
    riderOrderStore,
    async getCurrentLocation() {
      throw new Error("location failed");
    },
    uniApp: {
      getStorageSync() {
        return {
          lat: 30.123456,
          lng: 120.654321,
          address: "",
        };
      },
    },
  });
  const page = instantiatePage(component);

  await page.getLocation();

  assert.equal(page.currentLocation, "当前位置 30.1235, 120.6543");
});
