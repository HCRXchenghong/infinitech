import test from "node:test";
import assert from "node:assert/strict";

import {
  CONSUMER_HOME_TAB_URL,
  CONSUMER_ORDER_LIST_TAB_URL,
  createOrderPaySuccessPage,
  createOrderRemarkPage,
  createOrderTablewarePage,
  createDefaultConsumerOrderTablewareOptions,
  DEFAULT_CONSUMER_ORDER_REMARK_MAX_LENGTH,
  normalizeConsumerOrderRemark,
  normalizeConsumerOrderTableware,
} from "./order-support-pages.js";

test("order support page helpers normalize remark length and routes", () => {
  assert.equal(
    normalizeConsumerOrderRemark("a".repeat(250)).length,
    DEFAULT_CONSUMER_ORDER_REMARK_MAX_LENGTH,
  );
  assert.equal(CONSUMER_ORDER_LIST_TAB_URL, "/pages/order/list/index");
  assert.equal(CONSUMER_HOME_TAB_URL, "/pages/index/index");
});

test("order support page helpers keep tableware options and value normalization stable", () => {
  const options = createDefaultConsumerOrderTablewareOptions();
  assert.equal(Array.isArray(options), true);
  assert.notEqual(options[0], createDefaultConsumerOrderTablewareOptions()[0]);
  assert.equal(normalizeConsumerOrderTableware(2), 2);
  assert.equal(normalizeConsumerOrderTableware("3"), 3);
  assert.equal(normalizeConsumerOrderTableware(99), 0);
});

test("order support pages write remark and tableware selections back to store", () => {
  const navigationEvents = [];
  const originalUni = globalThis.uni;
  const store = {
    state: {
      remark: "少辣",
      tableware: 1,
    },
    setRemark(value) {
      this.state.remark = value;
    },
    setTableware(value) {
      this.state.tableware = value;
    },
  };
  const useUserOrderStore = () => store;

  globalThis.uni = {
    navigateBack() {
      navigationEvents.push("back");
    },
    switchTab({ url }) {
      navigationEvents.push(url);
    },
  };

  try {
    const remarkPage = createOrderRemarkPage({ useUserOrderStore });
    const remarkInstance = {
      ...remarkPage.data(),
      ...remarkPage.methods,
      remark: "a".repeat(250),
    };
    remarkInstance.saveRemark();
    assert.equal(store.state.remark.length, DEFAULT_CONSUMER_ORDER_REMARK_MAX_LENGTH);

    const tablewarePage = createOrderTablewarePage({ useUserOrderStore });
    const tablewareInstance = {
      ...tablewarePage.data(),
      ...tablewarePage.methods,
    };
    tablewareInstance.select("3");
    assert.equal(store.state.tableware, 3);

    const paySuccessPage = createOrderPaySuccessPage();
    paySuccessPage.methods.goOrders();
    paySuccessPage.methods.goHome();

    assert.deepEqual(navigationEvents, [
      "back",
      "back",
      CONSUMER_ORDER_LIST_TAB_URL,
      CONSUMER_HOME_TAB_URL,
    ]);
  } finally {
    globalThis.uni = originalUni;
  }
});
