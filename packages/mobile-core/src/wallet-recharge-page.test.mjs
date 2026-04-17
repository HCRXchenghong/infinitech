import test from "node:test";
import assert from "node:assert/strict";

import { createWalletRechargePageLogic } from "./wallet-recharge-page.js";

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

test("wallet recharge page loads options, launches client payment, and confirms status", async () => {
  const requests = [];
  const loadingTitles = [];
  const toasts = [];
  const timers = [];
  const paymentCalls = [];
  const backCalls = [];
  const component = createWalletRechargePageLogic({
    request: async (payload) => {
      requests.push(payload);
      if (payload.url.startsWith("/api/wallet/balance")) {
        return { balance: 3000 };
      }
      if (payload.url.startsWith("/api/wallet/recharge/options")) {
        return {
          data: {
            options: [{ channel: "wechat", label: "微信支付" }],
          },
        };
      }
      if (payload.url === "/api/wallet/recharge/intent") {
        return {
          status: "awaiting_client_pay",
          rechargeOrderId: "re_1",
          paymentPayload: {
            gateway: "wechat",
          },
        };
      }
      if (payload.url.startsWith("/api/wallet/recharge/status")) {
        return { status: "success" };
      }
      throw new Error(`unexpected request: ${payload.url}`);
    },
    buildAuthorizationHeader(token) {
      return { Authorization: `Bearer ${token}` };
    },
    shouldLaunchClientPayment(result) {
      return result.status === "awaiting_client_pay";
    },
    async invokeClientPayment(result, platform) {
      paymentCalls.push({ result, platform });
      return { ok: true };
    },
    isClientPaymentCancelled() {
      return false;
    },
    getClientPaymentErrorMessage() {
      return "充值失败";
    },
    nowFn() {
      return 1700000000000;
    },
    randomFn() {
      return 0.123456;
    },
    sleepFn: async () => {},
    setTimeoutFn(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    uniApp: {
      getSystemInfoSync() {
        return { statusBarHeight: 24 };
      },
      getStorageSync(key) {
        if (key === "userProfile") {
          return { id: "user_3" };
        }
        if (key === "token") {
          return "token_3";
        }
        return "";
      },
      showLoading(payload) {
        loadingTitles.push(payload.title);
      },
      hideLoading() {
        loadingTitles.push("hide");
      },
      showToast(payload) {
        toasts.push(payload);
      },
      navigateBack(payload) {
        backCalls.push(payload);
      },
    },
  });
  const page = instantiatePage(component);

  component.onLoad.call(page);
  await page.loadPageData();
  page.amountCustom = "88.5";
  await page.submitRecharge();
  timers[0].callback();

  assert.equal(page.statusBarHeight, 24);
  assert.equal(page.balance, 3000);
  assert.equal(page.selectedMethod, "wechat");
  assert.equal(page.amountYuan, 88.5);
  assert.equal(page.canSubmit, true);
  assert.equal(paymentCalls[0].platform, "app");
  assert.equal(
    requests[2].header["Idempotency-Key"],
    "customer_app_recharge_user_3_1700000000000123456",
  );
  assert.equal(requests[2].data.amount, 8850);
  assert.deepEqual(loadingTitles, [
    "正在拉起支付",
    "hide",
    "正在确认充值状态",
    "hide",
  ]);
  assert.deepEqual(toasts, [{ title: "充值成功", icon: "success" }]);
  assert.equal(timers[0].delay, 360);
  assert.equal(backCalls.length, 1);
});
