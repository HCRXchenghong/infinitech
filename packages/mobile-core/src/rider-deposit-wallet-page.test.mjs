import test from "node:test";
import assert from "node:assert/strict";

import { createRiderDepositWalletPageLogic } from "./rider-deposit-wallet-page.js";

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

test("rider deposit wallet page loads wallet summary and completes deposit payment flow", async () => {
  const requests = [];
  const loadingTitles = [];
  const toasts = [];
  const actionSheets = [];
  const navigations = [];
  const paymentCalls = [];
  const component = createRiderDepositWalletPageLogic({
    request: async (payload) => {
      requests.push(payload);
      if (payload.url.startsWith("/api/wallet/balance")) {
        return {
          data: {
            balance: 7600,
            frozen_balance: 500,
          },
        };
      }
      if (payload.url.startsWith("/api/rider/deposit/status")) {
        return {
          data: {
            status: "unpaid",
            amount: 5000,
            unlockDays: 7,
            canAcceptOrders: false,
          },
        };
      }
      if (payload.url.startsWith("/api/payment/options")) {
        return {
          options: [{ channel: "wechat", label: "微信支付" }],
        };
      }
      if (payload.url.startsWith("/api/wallet/withdraw/options")) {
        return {
          options: [{ channel: "bank_card", label: "银行卡" }],
        };
      }
      if (payload.url === "/api/rider/deposit/pay-intent") {
        return {
          status: "awaiting_client_pay",
          rechargeOrderId: "re_deposit_1",
          transactionId: "tx_deposit_1",
          paymentPayload: { gateway: "wechat" },
        };
      }
      if (payload.url.startsWith("/api/wallet/recharge/status")) {
        return {
          status: "success",
        };
      }
      throw new Error(`unexpected request: ${payload.url}`);
    },
    buildAuthorizationHeader(token) {
      return { Authorization: `Bearer ${token}` };
    },
    getAuth() {
      return {
        riderId: "rider_1",
        riderName: "骑手张三",
        token: "token_1",
      };
    },
    shouldLaunchClientPayment(result) {
      return result.status === "awaiting_client_pay";
    },
    async invokeClientPayment(result, platform) {
      paymentCalls.push({ result, platform });
    },
    isClientPaymentCancelled() {
      return false;
    },
    getClientPaymentErrorMessage() {
      return "保证金缴纳失败";
    },
    nowFn() {
      return 1700000000000;
    },
    randomFn() {
      return 0.123456;
    },
    sleepFn: async () => {},
    uniApp: {
      getSystemInfoSync() {
        return { statusBarHeight: 18 };
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
      showActionSheet(payload) {
        actionSheets.push(payload);
        payload.success({ tapIndex: 0 });
      },
      navigateTo(payload) {
        navigations.push(payload);
      },
      showModal() {
        throw new Error("showModal should not be called during deposit payment flow");
      },
    },
  });
  const page = instantiatePage(component);

  component.onLoad.call(page);
  await page.loadAll();
  page.goBills();
  page.goRecharge();
  page.goWithdraw();
  await page.payDeposit();

  assert.equal(page.statusBarHeight, 18);
  assert.equal(page.topPadding, 30);
  assert.equal(page.balance, 7600);
  assert.equal(page.frozenBalance, 500);
  assert.equal(page.depositAmount, 5000);
  assert.equal(page.depositStatusText, "待缴纳");
  assert.equal(page.depositTip, "缴纳 50 元保证金后才可接单。");
  assert.equal(page.canPayDeposit, true);
  assert.equal(page.canWithdrawDeposit, false);
  assert.equal(page.formatTime("2026-04-23 08:09:00"), "04-23 08:09");
  assert.equal(page.fen2yuan(7600), "76.00");
  assert.deepEqual(navigations, [
    { url: "/pages/profile/wallet-bills/index" },
    { url: "/pages/profile/wallet-recharge/index" },
    { url: "/pages/profile/wallet-withdraw/index" },
  ]);
  assert.equal(actionSheets[0].itemList[0], "微信支付");
  assert.equal(paymentCalls[0].platform, "app");
  assert.equal(
    requests[4].header["Idempotency-Key"],
    "rider_deposit_rider_1_1700000000000123456",
  );
  assert.deepEqual(loadingTitles, [
    "正在拉起支付",
    "hide",
    "正在确认保证金状态",
    "hide",
  ]);
  assert.deepEqual(toasts, [{ title: "保证金已缴纳", icon: "success" }]);
});

test("rider deposit wallet page previews withdraw fee and submits deposit withdraw", async () => {
  const requests = [];
  const toasts = [];
  const actionSheets = [];
  const modalTitles = [];
  const component = createRiderDepositWalletPageLogic({
    request: async (payload) => {
      requests.push(payload);
      if (payload.url.startsWith("/api/wallet/balance")) {
        return {
          balance: 5000,
          frozenBalance: 0,
        };
      }
      if (payload.url.startsWith("/api/rider/deposit/status")) {
        return {
          status: "withdrawable",
          amount: 5000,
          unlockDays: 7,
          canAcceptOrders: true,
          lastAcceptedAt: "2026-04-10 12:00:00",
          withdrawableAt: "2026-04-21 12:00:00",
        };
      }
      if (payload.url.startsWith("/api/payment/options")) {
        return { options: [] };
      }
      if (payload.url.startsWith("/api/wallet/withdraw/options")) {
        return {
          options: [
            {
              channel: "bank_card",
              label: "银行卡",
              requiresBankName: true,
              requiresBankBranch: true,
            },
          ],
        };
      }
      if (payload.url === "/api/wallet/withdraw/fee-preview") {
        return {
          data: {
            fee: 200,
            actualAmount: 4800,
            arrivalText: "T+1",
          },
        };
      }
      if (payload.url === "/api/rider/deposit/withdraw") {
        return {
          status: "pending_review",
        };
      }
      throw new Error(`unexpected request: ${payload.url}`);
    },
    buildAuthorizationHeader(token) {
      return { Authorization: `Bearer ${token}` };
    },
    getAuth() {
      return {
        riderId: "rider_2",
        riderName: "骑手李四",
        token: "token_2",
      };
    },
    nowFn() {
      return 1700000001000;
    },
    randomFn() {
      return 0.654321;
    },
    sleepFn: async () => {},
    uniApp: {
      getSystemInfoSync() {
        return { statusBarHeight: 22 };
      },
      showToast(payload) {
        toasts.push(payload);
      },
      showActionSheet(payload) {
        actionSheets.push(payload);
        payload.success({ tapIndex: 0 });
      },
      showModal(payload) {
        modalTitles.push(payload.title || "");
        if (payload.editable) {
          const contentMap = {
            输入银行卡号: "6222020202020202",
            输入开户银行: "招商银行",
            输入开户支行: "浦东支行",
          };
          payload.success({
            confirm: true,
            cancel: false,
            content: contentMap[payload.title] || "",
          });
          return;
        }
        payload.success({ confirm: true, cancel: false });
      },
      showLoading() {},
      hideLoading() {},
      navigateTo() {},
    },
  });
  const page = instantiatePage(component);

  component.onLoad.call(page);
  await page.loadAll();
  await page.withdrawDeposit();

  assert.equal(page.statusValue, "withdrawable");
  assert.equal(page.depositStatusText, "可提现");
  assert.equal(
    page.depositTip,
    "当前满足 7 天未接单且无进行中订单，可发起保证金提现。",
  );
  assert.equal(page.canWithdrawDeposit, true);
  assert.equal(page.formatTime("2026-04-21 12:00:00"), "04-21 12:00");
  assert.equal(actionSheets[0].itemList[0], "银行卡");
  assert.equal(modalTitles[0], "输入银行卡号");
  assert.equal(modalTitles[1], "输入开户银行");
  assert.equal(modalTitles[2], "输入开户支行");
  assert.equal(modalTitles[3], "确认提取保证金吗");
  assert.equal(
    requests[5].header["Idempotency-Key"],
    "rider_deposit_withdraw_rider_2_1700000001000654321",
  );
  assert.deepEqual(requests[5].data, {
    riderId: "rider_2",
    withdrawMethod: "bank_card",
    withdrawAccount: "6222020202020202",
    withdrawName: "骑手李四",
    bankName: "招商银行",
    bankBranch: "浦东支行",
    idempotencyKey: "rider_deposit_withdraw_rider_2_1700000001000654321",
  });
  assert.deepEqual(toasts, [{ title: "保证金提现申请已提交", icon: "success" }]);
});
