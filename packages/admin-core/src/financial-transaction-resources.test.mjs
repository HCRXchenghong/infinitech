import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFinanceCenterParams,
  buildFinanceExportFilename,
  buildFinanceOverviewKpiCards,
  buildFinanceRecentTransactionParams,
  buildFinanceRechargePayload,
  buildFinanceRefundCards,
  buildFinanceUserDetailsParams,
  buildFinanceDeductPayload,
  createFinanceCoinRatioState,
  createFinanceWalletActionForm,
  createFinanceWalletActionRecord,
  formatFinanceCenterDate,
  formatFinancialAmountYuan,
  formatFinancialTransactionStatus,
  formatFinancialTransactionType,
  formatFinancialTransactionUserType,
  getFinanceTransactionDirectionSign,
  getFinancialTransactionStatusTagType,
  getFinancialTransactionTypeTagType,
  isFinancialTransactionIncomeType,
  validateFinanceWalletActionForm,
} from "./financial-transaction-resources.js";

test("financial transaction presentation helpers keep type and status semantics", () => {
  assert.equal(formatFinancialAmountYuan(12345), "123.45");
  assert.equal(formatFinancialTransactionType("admin_add_balance"), "管理员充值");
  assert.equal(formatFinancialTransactionUserType("customer"), "用户");
  assert.equal(formatFinancialTransactionUserType("user"), "用户");
  assert.equal(formatFinancialTransactionStatus("processing"), "处理中");
  assert.equal(isFinancialTransactionIncomeType("refund"), true);
  assert.equal(isFinancialTransactionIncomeType("payment"), false);
  assert.equal(getFinancialTransactionTypeTagType("withdraw"), "warning");
  assert.equal(getFinancialTransactionStatusTagType("failed"), "danger");
  assert.equal(getFinanceTransactionDirectionSign("payment"), "-");
  assert.equal(getFinanceTransactionDirectionSign("refund"), "+");
});

test("finance overview card builders derive stable card collections", () => {
  assert.deepEqual(
    buildFinanceOverviewKpiCards({
      totalTransactionAmount: 88800,
      totalRechargeAmount: 12000,
      totalWithdrawAmount: 9000,
      platformRevenue: 4300,
      totalOrderCount: 12,
      activeCustomerCount: 6,
      activeRiderCount: 4,
      activeMerchantCount: 2,
    }),
    [
      { label: "总流水", value: "¥888.00", desc: "周期内所有支付类交易总金额" },
      { label: "充值金额", value: "¥120.00", desc: "周期内用户充值总金额" },
      { label: "提现金额", value: "¥90.00", desc: "周期内提现申请总金额" },
      { label: "平台收益", value: "¥43.00", desc: "周期内平台佣金收益" },
      { label: "订单数", value: 12, desc: "周期内新增订单总数" },
      { label: "活跃用户", value: 6, desc: "当前活跃用户钱包账户数" },
      { label: "活跃骑手", value: 4, desc: "当前活跃骑手钱包账户数" },
      { label: "活跃商户", value: 2, desc: "当前活跃商户钱包账户数" },
    ],
  );

  assert.deepEqual(
    buildFinanceRefundCards({
      totalRefundAmount: 3300,
      totalRefundCount: 5,
      totalCompensationAmount: 2600,
      totalCompensationCount: 2,
    }),
    [
      { label: "退款金额", value: "¥33.00", desc: "周期内退款总金额" },
      { label: "退款笔数", value: 5, desc: "周期内退款总笔数" },
      { label: "赔付金额", value: "¥26.00", desc: "周期内赔付总金额" },
      { label: "赔付笔数", value: 2, desc: "周期内赔付总笔数" },
    ],
  );
});

test("finance center helpers keep query and wallet action semantics stable", () => {
  assert.equal(formatFinanceCenterDate("2026-04-16T08:09:10Z"), "2026-04-16");
  assert.equal(formatFinanceCenterDate(""), "-");

  assert.deepEqual(
    buildFinanceCenterParams({ periodType: "weekly", statDate: "2026-04-16" }),
    { periodType: "weekly", statDate: "2026-04-16" },
  );
  assert.deepEqual(buildFinanceCenterParams({}), { periodType: "daily" });

  assert.deepEqual(
    buildFinanceUserDetailsParams({ periodType: "monthly" }, "merchant"),
    {
      periodType: "monthly",
      limit: 20,
      sortBy: "total_income",
      sortOrder: "desc",
      userType: "merchant",
    },
  );
  assert.deepEqual(buildFinanceRecentTransactionParams(), { page: 1, limit: 1 });
  assert.equal(
    buildFinanceExportFilename({ periodType: "quarterly", statDate: "2026-04-01" }),
    "finance-report-quarterly-2026-04-01.json",
  );
  assert.equal(buildFinanceExportFilename({ periodType: "daily" }), "finance-report-daily-latest.json");

  assert.deepEqual(createFinanceWalletActionForm(), {
    userType: "user",
    userId: "",
    amountYuan: 10,
    note: "",
  });
  assert.equal(validateFinanceWalletActionForm({ userType: "user", userId: "", amountYuan: 10 }), "请输入账号ID");
  assert.equal(validateFinanceWalletActionForm({ userType: "user", userId: "88", amountYuan: 0 }), "请输入有效金额");
  assert.equal(validateFinanceWalletActionForm({ userType: "merchant", userId: "m-1", amountYuan: 10.23 }), "");

  const form = {
    userType: "merchant",
    userId: "m-9",
    amountYuan: 10.23,
    note: "manual-adjust",
  };

  assert.deepEqual(buildFinanceRechargePayload(form), {
    user_id: "m-9",
    user_type: "merchant",
    amount: 1023,
    note: "manual-adjust",
  });
  assert.deepEqual(buildFinanceDeductPayload(form), {
    targetUserId: "m-9",
    targetUserType: "merchant",
    amount: 1023,
    reason: "manual_deduct",
    remark: "manual-adjust",
  });
  assert.deepEqual(createFinanceWalletActionRecord(form), {
    userId: "m-9",
    userType: "merchant",
    amount: 1023,
  });
  assert.deepEqual(createFinanceCoinRatioState({ ratio: 256 }), { ratio: 256 });
  assert.deepEqual(createFinanceCoinRatioState({ ratio: 0 }), { ratio: 100 });
});
