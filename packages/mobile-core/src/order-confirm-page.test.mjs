import test from "node:test";
import assert from "node:assert/strict";

import { createOrderConfirmPage } from "./order-confirm-page.js";

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

test("order confirm page submits order and stores earned points on payment success", async () => {
  const createOrderCalls = [];
  const paymentCalls = [];
  const navigateCalls = [];
  const storage = new Map([
    ["userProfile", { id: "user_9", phone: "13812345678" }],
    ["token", "token_9"],
    ["vipPointsMultiplier", "2"],
  ]);
  const previousUni = globalThis.uni;

  try {
    globalThis.uni = {
      getStorageSync(key) {
        return storage.get(key);
      },
      setStorageSync(key, value) {
        storage.set(key, value);
      },
      removeStorageSync(key) {
        storage.delete(key);
      },
      showLoading() {},
      hideLoading() {},
      showToast() {},
      navigateTo(payload) {
        navigateCalls.push(payload);
      },
    };

    const component = createOrderConfirmPage({
      buildAuthorizationHeader(token) {
        return { Authorization: `Bearer ${token}` };
      },
      createOrder: async (payload) => {
        createOrderCalls.push(payload);
        return { id: "order_9" };
      },
      earnPoints: async () => ({ balance: 88 }),
      request: async (payload) => {
        paymentCalls.push(payload);
        if (payload.url === "/api/payment/intent") {
          return { status: "success" };
        }
        return { data: { options: [{ channel: "if_pay" }] } };
      },
      getClientPaymentErrorMessage() {
        return "支付失败";
      },
      useUserOrderStore() {
        return {
          state: {
            remark: "少辣",
            tableware: 1,
          },
        };
      },
    });
    const page = instantiatePage(component);

    page.shop = { id: "shop_1", name: "测试商家", deliveryPrice: 3 };
    page.items = [{ id: "sku_1", name: "米饭", qty: 2, price: 10 }];
    page.deliveryAddress = {
      id: "addr_1",
      detail: "上海市 徐汇区 漕溪北路",
      name: "张三",
      phone: "13800000000",
    };
    page.savedAddressCount = 1;
    page.selectedPayMethod = "ifpay";
    page.selectedCoupon = { type: "fixed", amount: 5, minAmount: 10, name: "减5元" };
    page.selectedUserCouponId = 21;

    await page.submitOrder();

    assert.equal(page.finalTotalDisplay, "19.00");
    assert.equal(createOrderCalls[0].discountAmount, 5);
    assert.equal(createOrderCalls[0].remark, "少辣");
    assert.equal(createOrderCalls[0].tableware, "1 套");
    assert.equal(paymentCalls[0].data.amount, 1900);
    assert.equal(storage.get("pointsBalance"), 88);
    assert.deepEqual(navigateCalls[0], {
      url: "/pages/pay/success/index?orderId=order_9",
    });
  } finally {
    globalThis.uni = previousUni;
  }
});
