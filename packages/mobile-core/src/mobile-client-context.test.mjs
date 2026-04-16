import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWalletRechargeRuntimeProfile,
  buildWalletWithdrawRuntimeProfile,
  normalizeMobileRuntimePlatform,
  resolveMobileClientId,
} from "./mobile-client-context.js";

test("mobile client context normalizes runtime platform aliases", () => {
  assert.equal(normalizeMobileRuntimePlatform("app-plus"), "app");
  assert.equal(normalizeMobileRuntimePlatform("mp-weixin"), "mini_program");
  assert.equal(normalizeMobileRuntimePlatform("mini_program"), "mini_program");
  assert.equal(
    normalizeMobileRuntimePlatform("", "mini_program"),
    "mini_program",
  );
});

test("mobile client context resolves client ids and wallet recharge profile", () => {
  assert.equal(resolveMobileClientId("app"), "app-mobile");
  assert.equal(resolveMobileClientId("mp-weixin"), "user-vue");
  assert.deepEqual(
    buildWalletRechargeRuntimeProfile({ rawPlatform: "app-plus" }),
    {
      platform: "app",
      clientId: "app-mobile",
      clientPaymentPlatform: "app",
      idempotencyKeyPrefix: "customer_app_recharge",
      rechargeDescription: "用户 App 余额充值",
    },
  );
  assert.deepEqual(
    buildWalletRechargeRuntimeProfile({ rawPlatform: "mp-weixin" }),
    {
      platform: "mini_program",
      clientId: "user-vue",
      clientPaymentPlatform: "mini_program",
      idempotencyKeyPrefix: "customer_mini_program_recharge",
      rechargeDescription: "用户端余额充值",
    },
  );
});

test("mobile client context builds withdraw profile from runtime platform", () => {
  assert.deepEqual(
    buildWalletWithdrawRuntimeProfile({ rawPlatform: "app-plus" }),
    {
      platform: "app",
      clientId: "app-mobile",
      idempotencyKeyPrefix: "customer_app_withdraw",
    },
  );
  assert.deepEqual(
    buildWalletWithdrawRuntimeProfile({ rawPlatform: "mp-weixin" }),
    {
      platform: "mini_program",
      clientId: "user-vue",
      idempotencyKeyPrefix: "customer_mini_program_withdraw",
    },
  );
});
