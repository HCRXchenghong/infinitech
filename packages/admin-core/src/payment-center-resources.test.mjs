import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultPaymentGatewaySummary,
  extractPaymentCallbackDetail,
  extractPaymentCallbackPage,
  extractWithdrawRequestPage,
  formatAdminDateTime,
  getWithdrawAutoRetry,
  maskCardNo,
  normalizePaymentCenterConfig,
  normalizePaymentGatewaySummary,
  paymentCallbackStatusLabel,
  paymentCallbackStatusTag,
  withdrawAutoRetryHint,
  withdrawAutoRetryLabel,
  withdrawAutoRetryTag,
  withdrawOperationTypeLabel,
  withdrawStatusTag,
} from "./payment-center-resources.js";

test("normalizePaymentGatewaySummary provides stable defaults", () => {
  assert.deepEqual(normalizePaymentGatewaySummary(), {
    mode: { isProd: false },
    wechat: {},
    alipay: {},
    bankCard: {},
  });

  assert.deepEqual(
    normalizePaymentGatewaySummary({
      mode: { is_prod: 1, region: "cn" },
      bank_card: { ready: true },
    }),
    {
      mode: { is_prod: 1, region: "cn", isProd: true },
      wechat: {},
      alipay: {},
      bankCard: { ready: true },
    },
  );
});

test("normalizePaymentCenterConfig fills payment-center defaults", () => {
  const result = normalizePaymentCenterConfig({
    gateway_summary: {
      wechat: { ready: true },
    },
    pay_mode: { isProd: true },
    bank_card_config: {
      allow_stub: "false",
      merchant_id: null,
    },
    settlement_rules: [{ uid: "rule-1" }],
  });

  assert.equal(result.gatewaySummary.wechat.ready, true);
  assert.equal(result.pay_mode.isProd, true);
  assert.equal(result.alipay_config.sandbox, true);
  assert.equal(result.bank_card_config.allow_stub, false);
  assert.equal(result.bank_card_config.merchant_id, "");
  assert.deepEqual(result.settlement_rules, [{ uid: "rule-1" }]);
  assert.deepEqual(result.rider_deposit_policy.allowed_methods, ["wechat", "alipay"]);
});

test("extractWithdrawRequestPage normalizes mixed legacy fields", () => {
  const page = extractWithdrawRequestPage({
    data: {
      requests: [
        {
          requestId: "WR-1",
          transactionId: "TX-1",
          userType: "merchant",
          withdrawMethod: "bank_card",
          amount: "3300",
          actualAmount: "3200",
          fee: "100",
          status: "failed",
          autoRetry: {
            eligible: true,
            retryCount: "1",
            maxRetryCount: "3",
            nextRetryAt: "2026-04-16T10:00:00Z",
          },
        },
      ],
      total: 1,
    },
  });

  assert.equal(page.total, 1);
  assert.equal(page.items[0].request_id, "WR-1");
  assert.equal(page.items[0].transaction_id, "TX-1");
  assert.equal(page.items[0].user_type, "merchant");
  assert.equal(page.items[0].withdraw_method, "bank_card");
  assert.equal(page.items[0].actual_amount, 3200);
  assert.deepEqual(getWithdrawAutoRetry(page.items[0]), {
    eligible: true,
    retryCount: 1,
    maxRetryCount: 3,
    nextRetryAt: "2026-04-16T10:00:00Z",
    retryExhausted: false,
    lastRetryAt: "",
    lastFailureReason: "",
  });
});

test("withdraw auto retry helpers keep admin-friendly semantics", () => {
  const row = {
    auto_retry: {
      eligible: true,
      retryCount: 1,
      maxRetryCount: 3,
      nextRetryAt: "2026-04-16T10:00:00Z",
    },
  };

  assert.equal(withdrawAutoRetryTag(row), "warning");
  assert.equal(withdrawAutoRetryLabel(row), "待自动重试");
  assert.equal(
    withdrawAutoRetryLabel(row, {
      includeNextRetryAt: true,
      formatDateTime: (value) => `FMT:${value}`,
    }),
    "待自动重试：FMT:2026-04-16T10:00:00Z",
  );
  assert.equal(
    withdrawAutoRetryHint(row, {
      formatDateTime: (value) => `FMT:${value}`,
    }),
    "下次重试：FMT:2026-04-16T10:00:00Z",
  );
  assert.equal(withdrawStatusTag("failed"), "danger");
  assert.equal(withdrawOperationTypeLabel("withdraw_retry_payout"), "重试打款");
});

test("extractPaymentCallbackPage and detail normalize callback aliases", () => {
  const page = extractPaymentCallbackPage({
    data: {
      callbacks: [
        {
          callbackId: "CB-1",
          channel: "wechat",
          eventType: "payout.fail",
          status: "failed",
          verified: true,
          transaction: {
            transactionId: "TX-9",
            businessType: "withdraw_request",
            userType: "merchant",
          },
          withdraw: {
            requestId: "WR-9",
            withdrawMethod: "wechat",
            status: "transferring",
          },
        },
      ],
    },
  });

  assert.equal(page.items[0].callback_id, "CB-1");
  assert.equal(page.items[0].event_type, "payout.fail");
  assert.equal(page.items[0].transaction_id, "TX-9");
  assert.equal(page.items[0].withdraw.request_id, "WR-9");
  assert.equal(paymentCallbackStatusTag(page.items[0]), "danger");
  assert.equal(paymentCallbackStatusLabel(page.items[0]), "处理失败");

  const detail = extractPaymentCallbackDetail({
    data: {
      callback_id: "CB-2",
      channel: "alipay",
      event_type: "payment.success",
      status: "success",
      verified: false,
      requestHeadersRaw: "{\"x-sign\":\"bad\"}",
      requestBody: { out_trade_no: "ORDER-1" },
      response_body_raw: "{\"result\":\"fail\"}",
    },
  });

  assert.equal(detail.callbackId, "CB-2");
  assert.equal(detail.request_headers_raw, "{\"x-sign\":\"bad\"}");
  assert.deepEqual(detail.request_body, { out_trade_no: "ORDER-1" });
  assert.equal(detail.responseBodyRaw, "{\"result\":\"fail\"}");
  assert.equal(paymentCallbackStatusLabel(detail), "验签失败");
});

test("shared payment-center formatting helpers are stable", () => {
  assert.deepEqual(createDefaultPaymentGatewaySummary(), {
    mode: { isProd: false },
    wechat: {},
    alipay: {},
    bankCard: {},
  });
  assert.equal(formatAdminDateTime("2026-04-16T10:11:12Z"), "2026-04-16 18:11");
  assert.equal(
    formatAdminDateTime("2026-04-16T10:11:12Z", { includeSeconds: true }),
    "2026-04-16 18:11:12",
  );
  assert.equal(maskCardNo("6222021234567890"), "6222 **** **** 7890");
});
