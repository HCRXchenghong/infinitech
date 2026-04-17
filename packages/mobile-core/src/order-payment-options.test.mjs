import test from "node:test";
import assert from "node:assert/strict";

import {
  fallbackOrderPayMethods,
  normalizeOrderPayMethods,
  normalizePayChannel,
} from "./order-payment-options.js";

test("order payment options normalize pay channels and fallbacks", () => {
  assert.equal(normalizePayChannel("if-pay"), "ifpay");
  assert.equal(normalizePayChannel("wxpay"), "wechat");
  assert.equal(normalizePayChannel("ali"), "alipay");
  assert.deepEqual(fallbackOrderPayMethods({ platform: "mini_program" }), [
    { value: "ifpay", label: "IF-Pay 余额支付", tip: "优先使用钱包余额" },
    { value: "wechat", label: "微信支付", tip: "小程序订单支付" },
  ]);
});

test("order payment options read enveloped backend options before fallback", () => {
  assert.deepEqual(
    normalizeOrderPayMethods(
      {
        data: {
          options: [
            {
              channel: "if_pay",
              label: "账户余额",
            },
            {
              channel: "wxpay",
              description: "平台推荐",
            },
          ],
        },
      },
      { platform: "app" },
    ),
    [
      { value: "ifpay", label: "账户余额", tip: "由后台支付中心统一控制" },
      { value: "wechat", label: "微信支付", tip: "平台推荐" },
    ],
  );
});
