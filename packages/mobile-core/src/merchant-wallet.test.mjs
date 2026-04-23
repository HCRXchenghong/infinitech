import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_MERCHANT_WALLET_TYPE_FILTERS,
  buildMerchantRechargePayload,
  buildMerchantRechargeStatusQuery,
  buildMerchantWalletRechargeOptionsQuery,
  buildMerchantWalletTransactionQuery,
  buildMerchantWalletWithdrawOptionsQuery,
  buildMerchantWithdrawConfirmText,
  buildMerchantWithdrawPayload,
  buildMerchantWithdrawPreviewPayload,
  buildMerchantWithdrawStatusQuery,
  createMerchantWalletTypeFilters,
  formatMerchantWalletAmountText,
  formatMerchantWalletFen,
  formatMerchantWalletTime,
  getMerchantWalletTransactionStatusText,
  getMerchantWalletTransactionTypeText,
  parseMerchantWalletAmountToFen,
  pollMerchantRechargeStatus,
  pollMerchantWithdrawStatus,
  resolveMerchantWalletAmountClass,
  resolveMerchantWithdrawFailureReason,
} from "./merchant-wallet.js";

test("merchant wallet helpers expose stable filters and display labels", () => {
  const filters = createMerchantWalletTypeFilters();
  assert.notEqual(filters, DEFAULT_MERCHANT_WALLET_TYPE_FILTERS);
  assert.deepEqual(filters, [
    { label: "全部", value: "" },
    { label: "订单收入", value: "payment" },
    { label: "退款扣减", value: "refund" },
    { label: "提现", value: "withdraw" },
    { label: "充值", value: "recharge" },
  ]);
  filters[0].label = "changed";
  assert.equal(DEFAULT_MERCHANT_WALLET_TYPE_FILTERS[0].label, "全部");

  assert.equal(formatMerchantWalletFen(-12345), "123.45");
  assert.equal(
    formatMerchantWalletAmountText({ amount: 5200 }),
    "+¥52.00",
  );
  assert.equal(
    formatMerchantWalletAmountText({ amount: -5200 }),
    "-¥52.00",
  );
  assert.equal(resolveMerchantWalletAmountClass({ amount: -1 }), "expense");
  assert.equal(getMerchantWalletTransactionTypeText("payment"), "订单收入");
  assert.equal(getMerchantWalletTransactionStatusText("transferring"), "转账中");
  assert.equal(getMerchantWalletTransactionStatusText("pending_review"), "待审核");
  assert.equal(formatMerchantWalletTime("2026-04-23 08:09:00"), "04-23 08:09");
  assert.equal(parseMerchantWalletAmountToFen("88.6"), 8860);
  assert.equal(parseMerchantWalletAmountToFen("oops"), 0);
});

test("merchant wallet helpers build standardized queries and payloads", () => {
  assert.deepEqual(buildMerchantWalletTransactionQuery({ userId: "m_1" }), {
    userId: "m_1",
    userType: "merchant",
    limit: 100,
    page: 1,
  });
  assert.deepEqual(
    buildMerchantWalletRechargeOptionsQuery({ platform: "app" }),
    {
      userType: "merchant",
      platform: "app",
      scene: "wallet_recharge",
    },
  );
  assert.deepEqual(buildMerchantWalletWithdrawOptionsQuery({ platform: "mini_program" }), {
    userType: "merchant",
    platform: "mini_program",
  });

  const rechargePayload = buildMerchantRechargePayload({
    userId: " merchant_1 ",
    amountFen: 6600,
    channel: "wechat",
    nowFn: () => 1700000000000,
    randomFn: () => 0.123456,
  });
  assert.deepEqual(rechargePayload, {
    userId: "merchant_1",
    userType: "merchant",
    amount: 6600,
    platform: "app",
    paymentMethod: "wechat",
    paymentChannel: "wechat",
    idempotencyKey: "merchant_recharge_merchant_1_1700000000000123456",
    description: "商户端余额充值",
  });

  const withdrawPreviewPayload = buildMerchantWithdrawPreviewPayload({
    userId: "merchant_1",
    amountFen: 6600,
    channel: "bank_card",
  });
  assert.deepEqual(withdrawPreviewPayload, {
    userId: "merchant_1",
    userType: "merchant",
    amount: 6600,
    withdrawMethod: "bank_card",
    platform: "app",
  });

  const withdrawPayload = buildMerchantWithdrawPayload({
    userId: "merchant_1",
    amountFen: 6600,
    channel: "bank_card",
    withdrawAccount: "622202020202",
    withdrawName: "张三",
    bankName: "招商银行",
    bankBranch: "浦东支行",
    nowFn: () => 1700000001000,
    randomFn: () => 0.654321,
  });
  assert.deepEqual(withdrawPayload, {
    userId: "merchant_1",
    userType: "merchant",
    amount: 6600,
    platform: "app",
    withdrawMethod: "bank_card",
    withdrawAccount: "622202020202",
    withdrawName: "张三",
    bankName: "招商银行",
    bankBranch: "浦东支行",
    remark: "商户端提现申请",
    idempotencyKey: "merchant_withdraw_merchant_1_1700000001000654321",
  });

  assert.deepEqual(buildMerchantRechargeStatusQuery({
    userId: "merchant_1",
    rechargeOrderId: "re_1",
    transactionId: "tx_1",
  }), {
    userId: "merchant_1",
    userType: "merchant",
    rechargeOrderId: "re_1",
    transactionId: "tx_1",
  });
  assert.deepEqual(buildMerchantWithdrawStatusQuery({
    userId: "merchant_1",
    withdrawRequestId: "wr_1",
    transactionId: "tx_2",
  }), {
    userId: "merchant_1",
    userType: "merchant",
    requestId: "wr_1",
    transactionId: "tx_2",
  });
});

test("merchant wallet helpers build withdraw confirmation and failure text", () => {
  assert.equal(
    buildMerchantWithdrawConfirmText(
      {
        data: {
          fee: 200,
          actualAmount: 4800,
          arrivalText: "T+1",
        },
      },
      {
        reviewNotice: "需人工审核",
      },
    ),
    "需人工审核\n手续费 ¥2.00，预计到账 ¥48.00，到账时效：T+1",
  );
  assert.equal(
    resolveMerchantWithdrawFailureReason({
      withdraw: {
        responseData: {
          transferResult: "银行卡信息错误",
        },
      },
    }),
    "银行卡信息错误",
  );
});

test("merchant wallet helpers poll recharge and withdraw status until terminal", async () => {
  const rechargeQueries = [];
  const withdrawQueries = [];
  const waits = [];

  const rechargeResult = await pollMerchantRechargeStatus({
    userId: "merchant_1",
    rechargeOrderId: "re_1",
    transactionId: "tx_1",
    sleepFn: async (ms) => {
      waits.push(ms);
    },
    loadStatus: async (query) => {
      rechargeQueries.push(query);
      return rechargeQueries.length === 2
        ? { status: "paid" }
        : { status: "pending" };
    },
  });
  const withdrawResult = await pollMerchantWithdrawStatus({
    userId: "merchant_1",
    withdrawRequestId: "wr_1",
    transactionId: "tx_2",
    sleepFn: async (ms) => {
      waits.push(ms);
    },
    loadStatus: async (query) => {
      withdrawQueries.push(query);
      return withdrawQueries.length === 2
        ? { withdraw: { status: "rejected", reason: "fail" } }
        : { withdraw: { status: "pending_review" } };
    },
  });

  assert.deepEqual(rechargeQueries, [
    {
      userId: "merchant_1",
      userType: "merchant",
      rechargeOrderId: "re_1",
      transactionId: "tx_1",
    },
    {
      userId: "merchant_1",
      userType: "merchant",
      rechargeOrderId: "re_1",
      transactionId: "tx_1",
    },
  ]);
  assert.deepEqual(withdrawQueries, [
    {
      userId: "merchant_1",
      userType: "merchant",
      requestId: "wr_1",
      transactionId: "tx_2",
    },
    {
      userId: "merchant_1",
      userType: "merchant",
      requestId: "wr_1",
      transactionId: "tx_2",
    },
  ]);
  assert.equal(rechargeResult.status, "paid");
  assert.equal(withdrawResult.withdraw.status, "rejected");
  assert.deepEqual(waits, [1500, 1500]);
});
