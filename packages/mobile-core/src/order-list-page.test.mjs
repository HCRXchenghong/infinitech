import test from "node:test";
import assert from "node:assert/strict";

import { createOrderListPage } from "./order-list-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

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

test("order list page exposes action buttons and opens rtc contact route", () => {
  const navigateCalls = [];
  const previousUni = globalThis.uni;
  try {
    globalThis.uni = {
      navigateTo(payload) {
        navigateCalls.push(payload);
      },
      showToast() {},
      $off() {},
      $on() {},
      getStorageSync() {
        return {};
      },
      showLoading() {},
      hideLoading() {},
      showModal() {},
      setStorageSync() {},
      $emit() {},
      redirectTo() {},
    };

    const component = createOrderListPage({
      canUseUserRTCContact: () => true,
      loadRTCRuntimeSettings: async () => ({}),
      mapOrderItem: (item) => item,
      mapAfterSalesItem: (item) => item,
    });
    const page = instantiatePage(component);

    const buttons = page.getButtons({
      status: "completed",
      bizType: "takeout",
      isReviewed: false,
    });
    page.currentOrder = {
      id: "order_1",
      shopId: "shop_1",
      shopName: "测试商家",
      shopPhone: "13812345678",
    };
    page.contactType = "shop";
    page.showRtcContact = true;
    page.handleRTCContact();

    assert.deepEqual(buttons, [
      { text: "再来一单", primary: false, action: "reorder" },
      { text: "评价", primary: true, action: "review" },
    ]);
    assert.match(navigateCalls[0].url, /pages\/rtc\/call\/index\?mode=outgoing/);
    assert.match(navigateCalls[0].url, /targetRole=merchant/);
    assert.match(navigateCalls[0].url, /targetId=shop_1/);
  } finally {
    globalThis.uni = previousUni;
  }
});
