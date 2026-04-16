import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBankPayoutCompletePayload,
  buildPaymentCallbackQuery,
  buildWithdrawHistoryTarget,
  buildWithdrawReviewPayload,
  canReplayPaymentCallback,
  canWithdrawAction,
  createBankPayoutFormState,
  createPaymentCallbackFilterState,
  createPaymentCallbackReplayPayload,
  createWithdrawHistoryTargetState,
  createDefaultPaymentGatewaySummary,
  extractPaymentCallbackDetail,
  extractPaymentCallbackPage,
  extractWithdrawRequestPage,
  formatAdminWalletOperationActor,
  formatAdminDateTime,
  getPaymentCallbackId,
  getWithdrawAutoRetry,
  getWithdrawRequestId,
  getWithdrawReviewActionTitle,
  getWithdrawTransactionId,
  isWithdrawGatewaySubmitted,
  maskCardNo,
  normalizePaymentCenterConfig,
  normalizePaymentGatewaySummary,
  paymentCallbackStatusLabel,
  paymentCallbackStatusTag,
  validateBankPayoutForm,
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

test("payment center callback helpers keep filter and replay semantics stable", () => {
  assert.deepEqual(createPaymentCallbackFilterState(), {
    channel: "",
    eventType: "",
    status: "",
    verified: "",
    transactionId: "",
    thirdPartyOrderId: "",
  });
  assert.deepEqual(
    buildPaymentCallbackQuery({
      channel: "wechat",
      verified: "true",
      transactionId: "TX-1",
    }),
    {
      page: 1,
      limit: 50,
      channel: "wechat",
      verified: "true",
      transactionId: "TX-1",
    },
  );
  assert.equal(getPaymentCallbackId({ callbackId: "CB-1" }), "CB-1");
  assert.equal(canReplayPaymentCallback({ verified: true, channel: "alipay" }), true);
  assert.equal(canReplayPaymentCallback({ verified: false, channel: "wechat" }), false);
  assert.deepEqual(createPaymentCallbackReplayPayload("  后台重放  "), {
    remark: "后台重放",
  });
});

test("payment center withdraw helpers keep review and bank payout semantics stable", () => {
  assert.deepEqual(createWithdrawHistoryTargetState(), {
    requestId: "",
    method: "",
    userType: "",
    amount: 0,
  });
  assert.deepEqual(
    buildWithdrawHistoryTarget({
      requestId: "WR-9",
      withdrawMethod: "bank_card",
      userType: "merchant",
      amount: "3200",
    }),
    {
      requestId: "WR-9",
      method: "bank_card",
      userType: "merchant",
      amount: 3200,
    },
  );
  assert.equal(getWithdrawRequestId({ request_id: "WR-9" }), "WR-9");
  assert.equal(getWithdrawTransactionId({ transactionId: "TX-9" }), "TX-9");
  assert.equal(formatAdminWalletOperationActor({ admin_name: "Ops", admin_id: "7" }), "Ops / 7");

  const bankForm = createBankPayoutFormState({
    requestId: "WR-10",
    payout_reference_no: "REF-10",
    payout_source_bank_name: "ICBC",
    payout_source_bank_branch: "Shanghai",
    payout_source_card_no: "6222021234567890",
    payout_source_account_name: "Infinitech",
    payout_voucher_url: "https://cdn.example/voucher.png",
  });
  assert.equal(bankForm.requestId, "WR-10");
  assert.equal(bankForm.transferResult, "已人工完成银行卡打款");
  assert.equal(validateBankPayoutForm({}), "缺少提现申请单号");
  assert.deepEqual(buildBankPayoutCompletePayload(bankForm), {
    requestId: "WR-10",
    action: "complete",
    remark: "已人工完成银行卡打款",
    transferResult: "已人工完成银行卡打款",
    payoutVoucherUrl: "https://cdn.example/voucher.png",
    payoutReferenceNo: "REF-10",
    payoutSourceBankName: "ICBC",
    payoutSourceBankBranch: "Shanghai",
    payoutSourceCardNo: "6222021234567890",
    payoutSourceAccountName: "Infinitech",
    thirdPartyOrderId: "REF-10",
  });

  assert.equal(
    isWithdrawGatewaySubmitted({
      responseData: { sidecarUrl: "https://sidecar.example" },
    }),
    true,
  );
  assert.equal(
    canWithdrawAction({ status: "pending_transfer", withdraw_method: "wechat" }, "execute"),
    true,
  );
  assert.equal(
    canWithdrawAction({ status: "pending_transfer", withdraw_method: "bank_card" }, "sync_gateway_status"),
    false,
  );
  assert.equal(getWithdrawReviewActionTitle("supplement_fail"), "补记打款失败");
  assert.deepEqual(
    buildWithdrawReviewPayload("WR-11", "reject", { remark: "资料不全" }),
    {
      requestId: "WR-11",
      action: "reject",
      remark: "资料不全",
      rejectReason: "资料不全",
      transferResult: "资料不全",
    },
  );
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
