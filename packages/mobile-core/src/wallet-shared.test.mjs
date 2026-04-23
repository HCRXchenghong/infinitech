import test from "node:test";
import assert from "node:assert/strict";

import {
  createWalletIdempotencyKey,
  extractWalletItems,
  fenToWalletYuan,
  formatWalletDateTime,
  isWalletFailureStatus,
  isWalletRechargeSuccessStatus,
  isWalletWithdrawSuccessStatus,
  normalizeWalletArrivalText,
  normalizeWalletFlowStatus,
  normalizeWalletOptions,
  normalizeWalletWithdrawFailureReason,
  showWalletActionSheet,
  sortWalletTransactions,
  walletFlowStatusLabel,
} from "./wallet-shared.js";

test("wallet shared helpers normalize collections, options, money and idempotency keys", () => {
  assert.deepEqual(extractWalletItems({ data: { records: [{ id: 1 }] } }), [{ id: 1 }]);
  assert.deepEqual(normalizeWalletOptions({ data: { options: [{ channel: "wechat" }] } }), [
    { channel: "wechat" },
  ]);
  assert.equal(fenToWalletYuan(-12345), "123.45");
  assert.equal(
    createWalletIdempotencyKey("wallet", "user_1", {
      nowFn: () => 1700000000000,
      randomFn: () => 0.123456,
    }),
    "wallet_user_1_1700000000000123456",
  );
  assert.equal(formatWalletDateTime("2026-04-23 08:09:00"), "04-23 08:09");
});

test("wallet shared helpers normalize flow statuses and labels", () => {
  assert.equal(normalizeWalletFlowStatus({ recharge: { status: "Paid" } }, "recharge"), "paid");
  assert.equal(normalizeWalletFlowStatus({ transactionStatus: "PENDING_TRANSFER" }, "withdraw"), "pending_transfer");
  assert.equal(normalizeWalletArrivalText({ withdraw: { arrivalText: "T+1" } }, "withdraw"), "T+1");
  assert.equal(
    normalizeWalletWithdrawFailureReason({
      withdraw: {
        responseData: {
          transferResult: "银行卡信息错误",
        },
      },
    }, "withdraw"),
    "银行卡信息错误",
  );
  assert.equal(isWalletRechargeSuccessStatus("paid"), true);
  assert.equal(isWalletWithdrawSuccessStatus("paid"), false);
  assert.equal(isWalletFailureStatus("closed"), true);
  assert.equal(walletFlowStatusLabel("pending_review"), "待审核");
  assert.equal(walletFlowStatusLabel("awaiting_client_pay"), "待支付");
});

test("wallet shared helpers sort wallet transactions by created time descending", () => {
  assert.deepEqual(
    sortWalletTransactions([
      { id: "old", created_at: "2026-04-20 12:00:00" },
      { id: "new", createdAt: "2026-04-21T12:00:00" },
    ]).map((item) => item.id),
    ["new", "old"],
  );
});

test("wallet shared helpers wrap action sheet runtime safely", async () => {
  const actionSheetResult = await showWalletActionSheet(
    {
      showActionSheet(payload) {
        payload.success({ tapIndex: 1 });
      },
    },
    {
      itemList: ["A", "B"],
    },
  );

  const fallbackResult = await showWalletActionSheet(null, {
    itemList: ["A"],
  });

  assert.deepEqual(actionSheetResult, { tapIndex: 1 });
  assert.deepEqual(fallbackResult, { tapIndex: -1, cancel: true });
});
