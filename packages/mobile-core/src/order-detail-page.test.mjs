import test from "node:test";
import assert from "node:assert/strict";

import { createOrderDetailPage } from "./order-detail-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("order detail page formats payloads and continues payment with selected option", async () => {
  const requests = [];
  const navigations = [];
  const actionSheets = [];
  const toasts = [];
  const previousUni = globalThis.uni;

  try {
    globalThis.uni = {
      getStorageSync(key) {
        if (key === "userProfile") {
          return { id: "user_1" };
        }
        if (key === "token") {
          return "token_1";
        }
        return "";
      },
      showActionSheet(payload) {
        actionSheets.push(payload);
        payload.success({ tapIndex: 0 });
      },
      navigateTo(payload) {
        navigations.push(payload);
      },
      showLoading() {},
      hideLoading() {},
      showToast(payload) {
        toasts.push(payload);
      },
    };

    const component = createOrderDetailPage({
      buildAuthorizationHeader(token) {
        return { Authorization: `Bearer ${token}` };
      },
      fetchOrderDetail: async () => ({
        id: "order_1",
        shopId: "shop_1",
        shopName: "测试商家",
        shopPhone: "13812345678",
        status: "pending_payment",
      }),
      request: async (payload) => {
        requests.push(payload);
        if (payload.method === "GET") {
          return {
            data: {
              options: [{ channel: "wechat", label: "微信支付" }],
            },
          };
        }
        return { status: "success" };
      },
      canUseUserRTCContact: () => false,
      loadRTCRuntimeSettings: async () => ({}),
      getClientPaymentErrorMessage() {
        return "支付失败";
      },
      normalizeErrorMessage(error, fallback) {
        return (error && error.error) || fallback;
      },
    });
    const page = instantiatePage(component);

    const formatted = page.formatOrderData({
      id: "order_1",
      shopId: "shop_1",
      shopName: "测试商家",
      shopPhone: "13812345678",
      pay_method: "wxpay",
      status: "pending_payment",
      productList: [{ id: "sku_1", count: 1 }],
    });
    page.order = formatted;
    await page.continuePayOrder(page.order);

    assert.equal(formatted.payMethodRaw, "wechat");
    assert.equal(actionSheets.length, 0);
    assert.equal(requests[0].url, "/api/payment/options");
    assert.equal(requests[1].url, "/api/payment/intent");
    assert.equal(requests[1].data.paymentMethod, "wechat");
    assert.deepEqual(navigations[0], {
      url: "/pages/pay/success/index?orderId=order_1",
    });
    assert.deepEqual(toasts, []);
  } finally {
    globalThis.uni = previousUni;
  }
});
