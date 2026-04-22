import test from "node:test";
import assert from "node:assert/strict";

import {
  getClientPaymentErrorMessage,
  invokeClientPayment,
  isClientPaymentCancelled,
  shouldLaunchClientPayment,
} from "./client-payment.js";

test("shouldLaunchClientPayment recognizes supported gateways from normalized payloads", () => {
  assert.equal(
    shouldLaunchClientPayment({
      status: "awaiting_client_pay",
      payment_payload: {
        gateway: "wxpay",
      },
    }),
    true,
  );
  assert.equal(
    shouldLaunchClientPayment({
      status: "paid",
      paymentPayload: {
        gateway: "wechat",
      },
    }),
    false,
  );
});

test("getClientPaymentErrorMessage normalizes cancel and request payment failures", () => {
  assert.equal(isClientPaymentCancelled({ errMsg: "requestPayment:fail cancel" }), true);
  assert.equal(
    getClientPaymentErrorMessage({ errMsg: "requestPayment:fail cancel" }),
    "已取消支付",
  );
  assert.equal(
    getClientPaymentErrorMessage({ errMsg: "requestPayment:fail system error" }),
    "system error",
  );
});

test("invokeClientPayment builds wechat mini program payloads", async () => {
  const calls = [];
  const previousUni = globalThis.uni;
  try {
    globalThis.uni = {
      requestPayment(options) {
        calls.push(options);
        options.success({ ok: true });
      },
    };

    const result = await invokeClientPayment(
      {
        paymentPayload: {
          gateway: "wechat",
          platform: "mini-program",
          timestamp: "12345",
          noncestr: "nonce",
          package: "prepay_id=1",
          paySign: "sign",
        },
      },
      "",
    );

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(calls[0], {
      timeStamp: "12345",
      nonceStr: "nonce",
      package: "prepay_id=1",
      signType: "RSA",
      paySign: "sign",
      success: calls[0].success,
      fail: calls[0].fail,
    });
  } finally {
    globalThis.uni = previousUni;
  }
});

test("invokeClientPayment rejects unsupported platforms and invalid alipay payloads", async () => {
  await assert.rejects(
    () =>
      invokeClientPayment(
        {
          paymentPayload: {
            gateway: "alipay",
            platform: "mini-program",
            orderString: "order-info",
          },
        },
        "",
      ),
    (error) => {
      assert.equal(error.code, "PAYMENT_UNSUPPORTED_PLATFORM");
      return true;
    },
  );

  await assert.rejects(
    () =>
      invokeClientPayment(
        {
          paymentPayload: {
            gateway: "alipay",
            platform: "app",
          },
        },
        "",
      ),
    (error) => {
      assert.equal(error.code, "PAYMENT_PAYLOAD_INVALID");
      return true;
    },
  );
});
