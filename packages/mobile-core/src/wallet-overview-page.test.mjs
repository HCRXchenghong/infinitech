import test from "node:test";
import assert from "node:assert/strict";

import { createWalletOverviewPageLogic } from "./wallet-overview-page.js";

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

test("wallet overview loads balance and navigates to wallet sub pages", async () => {
  const requests = [];
  const navigations = [];
  const component = createWalletOverviewPageLogic({
    request: async (payload) => {
      requests.push(payload);
      return {
        data: {
          balance: 12345,
          frozen_balance: 670,
        },
      };
    },
    buildAuthorizationHeader(token) {
      return { Authorization: `Bearer ${token}` };
    },
    uniApp: {
      getSystemInfoSync() {
        return { statusBarHeight: 20 };
      },
      getStorageSync(key) {
        if (key === "userProfile") {
          return { id: "user_1" };
        }
        if (key === "token") {
          return "token_1";
        }
        return "";
      },
      navigateTo(payload) {
        navigations.push(payload);
      },
      showToast() {},
    },
  });
  const page = instantiatePage(component);

  component.onLoad.call(page);
  await page.loadBalance();
  page.goBills();
  page.goRecharge();
  page.goWithdraw();

  assert.equal(page.statusBarHeight, 20);
  assert.equal(page.topPadding, 32);
  assert.equal(page.balance, 12345);
  assert.equal(page.frozenBalance, 670);
  assert.equal(page.fen2yuan(12345), "123.45");
  assert.equal(
    requests[0].url,
    "/api/wallet/balance?userId=user_1&userType=customer&user_id=user_1&user_type=customer",
  );
  assert.deepEqual(requests[0].header, {
    Authorization: "Bearer token_1",
  });
  assert.deepEqual(navigations, [
    { url: "/pages/profile/wallet/bills/index" },
    { url: "/pages/profile/wallet/recharge/index" },
    { url: "/pages/profile/wallet/withdraw/index" },
  ]);
});
