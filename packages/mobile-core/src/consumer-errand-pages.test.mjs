import test from "node:test";
import assert from "node:assert/strict";

import {
  createErrandBuyPage,
  createErrandDetailPage,
  createErrandLegacyPage,
} from "./consumer-errand-pages.js";

test("consumer errand legacy page redirects to the new errand home", () => {
  const redirects = [];
  const page = createErrandLegacyPage({
    uniApp: {
      redirectTo(payload) {
        redirects.push(payload);
      },
    },
  });

  page.onLoad();

  assert.deepEqual(redirects, [{ url: "/pages/errand/home/index" }]);
});

test("consumer errand buy page submits normalized payloads and routes to detail", async () => {
  const payloads = [];
  const navigations = [];
  const loadings = [];
  const sharedComponents = { PageHeader: { name: "PageHeader" } };
  const page = createErrandBuyPage({
    buildErrandOrderPayload(payload, identity) {
      return { payload, identity };
    },
    async createOrder(payload) {
      payloads.push(payload);
      return { id: "errand-1" };
    },
    requireCurrentUserIdentity() {
      return { userId: "u-1", phone: "13800000000", name: "测试用户" };
    },
    async ensureErrandServiceOpen() {
      return true;
    },
    components: sharedComponents,
    uniApp: {
      showLoading(payload) {
        loadings.push(["show", payload]);
      },
      hideLoading() {
        loadings.push(["hide"]);
      },
      navigateTo(payload) {
        navigations.push(payload);
      },
      showToast() {},
    },
  });

  const instance = {
    ...page.data(),
    ...page.methods,
    form: {
      buyAddress: "便利店",
      targetAddress: "虹桥路 1 号",
      desc: "矿泉水两瓶",
      itemPrice: "12.5",
      tipAmount: 2,
    },
  };
  const runtimeInstance = {
    ...instance,
    amountNumber: page.computed.amountNumber.call(instance),
  };
  runtimeInstance.totalPrice = page.computed.totalPrice.call(runtimeInstance);
  runtimeInstance.canSubmit = page.computed.canSubmit.call(runtimeInstance);

  await page.methods.submitOrder.call(runtimeInstance);

  assert.equal(payloads.length, 1);
  assert.deepEqual(payloads[0], {
    payload: {
      serviceType: "errand_buy",
      pickup: "便利店",
      dropoff: "虹桥路 1 号",
      itemDescription: "矿泉水两瓶",
      estimatedAmount: 12.5,
      deliveryFee: 8,
      tipAmount: 2,
      totalPrice: 22.5,
      requestExtra: {
        buyAddress: "便利店",
        targetAddress: "虹桥路 1 号",
      },
    },
    identity: {
      userId: "u-1",
      phone: "13800000000",
      name: "测试用户",
    },
  });
  assert.deepEqual(navigations, [
    { url: "/pages/errand/detail/index?id=errand-1" },
  ]);
  assert.deepEqual(loadings, [
    ["show", { title: "提交中..." }],
    ["hide"],
  ]);
  assert.equal(page.components, sharedComponents);
});

test("consumer errand detail page loads mapped detail and supports clipboard/home actions", async () => {
  const calls = [];
  const page = createErrandDetailPage({
    async fetchOrderDetail(id) {
      calls.push(["fetch", id]);
      return { id, status: "配送中" };
    },
    mapErrandOrderDetail(detail) {
      return {
        id: detail.id,
        serviceType: "errand_deliver",
        serviceName: "帮我送",
        statusText: "配送中",
        pickup: "A 点",
        dropoff: "B 点",
        item: "文件袋",
        amount: 0,
        deliveryFee: 10,
        totalPrice: 10,
        preferredTime: "",
        remark: "",
        createdAtText: "04-18 10:00",
      };
    },
    uniApp: {
      showLoading(payload) {
        calls.push(["showLoading", payload]);
      },
      hideLoading() {
        calls.push(["hideLoading"]);
      },
      setClipboardData(payload) {
        calls.push(["clipboard", payload.data]);
        payload.success();
      },
      showToast(payload) {
        calls.push(["toast", payload]);
      },
      switchTab(payload) {
        calls.push(["switchTab", payload]);
      },
    },
  });

  const instance = {
    ...page.data(),
    ...page.methods,
  };

  await page.onLoad.call(instance, { id: "order-9" });
  instance.copyOrderId();
  instance.backHome();

  assert.equal(instance.order.id, "order-9");
  assert.equal(page.computed.startLabel.call(instance), "取件地址");
  assert.equal(page.computed.endLabel.call(instance), "送达地址");
  assert.equal(page.computed.totalPriceText.call(instance), "10.00");
  assert.deepEqual(calls, [
    ["showLoading", { title: "加载中..." }],
    ["fetch", "order-9"],
    ["hideLoading"],
    ["clipboard", "order-9"],
    ["toast", { title: "已复制", icon: "none" }],
    ["switchTab", { url: "/pages/index/index" }],
  ]);
});
