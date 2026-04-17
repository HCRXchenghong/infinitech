import test from "node:test";
import assert from "node:assert/strict";

import { createWalletWithdrawPageLogic } from "./wallet-withdraw-page.js";

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

test("wallet withdraw page previews fee and handles rejected status flow", async () => {
  const requests = [];
  const loadingTitles = [];
  const toasts = [];
  const modals = [];
  const timers = [];
  const backCalls = [];
  const component = createWalletWithdrawPageLogic({
    request: async (payload) => {
      requests.push(payload);
      if (payload.url.startsWith("/api/wallet/balance")) {
        return { balance: 10000 };
      }
      if (payload.url.startsWith("/api/wallet/withdraw/options")) {
        return {
          options: [
            {
              channel: "bank_card",
              requiresName: true,
              requiresBankName: true,
              requiresBankBranch: true,
              arrivalText: "T+1",
            },
          ],
        };
      }
      if (payload.url === "/api/wallet/withdraw/fee-preview") {
        return {
          fee: 200,
          actualAmount: 4800,
          arrivalText: "T+1",
        };
      }
      if (payload.url === "/api/wallet/withdraw/apply") {
        return {
          status: "pending_review",
          withdrawRequestId: "wr_1",
          transactionId: "tx_1",
        };
      }
      if (payload.url.startsWith("/api/wallet/withdraw/status/wr_1")) {
        return {
          status: "rejected",
          rejectReason: "账户校验失败",
        };
      }
      throw new Error(`unexpected request: ${payload.url}`);
    },
    buildAuthorizationHeader(token) {
      return { Authorization: `Bearer ${token}` };
    },
    nowFn() {
      return 1700000001000;
    },
    randomFn() {
      return 0.654321;
    },
    sleepFn: async () => {},
    setTimeoutFn(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    uniApp: {
      getSystemInfoSync() {
        return { statusBarHeight: 16 };
      },
      getStorageSync(key) {
        if (key === "userProfile") {
          return { id: "user_4", nickname: "测试用户" };
        }
        if (key === "token") {
          return "token_4";
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
      showModal(payload) {
        modals.push(payload);
        payload.success({ confirm: true, cancel: false });
      },
      navigateBack(payload) {
        backCalls.push(payload);
      },
    },
  });
  const page = instantiatePage(component);

  component.onLoad.call(page);
  await page.loadPageData();
  page.withdrawAmount = "50";
  page.withdrawAccount = "622202020202";
  page.withdrawName = "张三";
  page.bankName = "招商银行";
  page.bankBranch = "浦东支行";
  await page.submitWithdraw();
  timers[0].callback();

  assert.equal(page.statusBarHeight, 16);
  assert.equal(page.selectedMethod, "bank_card");
  assert.equal(page.canSubmit, true);
  assert.equal(
    requests[3].header["Idempotency-Key"],
    "customer_app_withdraw_user_4_1700000001000654321",
  );
  assert.equal(requests[3].data.withdrawName, "张三");
  assert.match(modals[0].content, /手续费 ¥2.00/);
  assert.equal(modals[1].title, "提现已驳回");
  assert.equal(modals[1].content, "账户校验失败");
  assert.deepEqual(loadingTitles, ["正在确认提现状态", "hide"]);
  assert.deepEqual(toasts, []);
  assert.equal(timers[0].delay, 360);
  assert.equal(backCalls.length, 1);
});
