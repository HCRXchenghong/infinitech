import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFinanceOverviewKpiCards,
  buildFinanceRefundCards,
  formatFinancialAmountYuan,
  formatFinancialTransactionStatus,
  formatFinancialTransactionType,
  formatFinancialTransactionUserType,
  getFinancialTransactionStatusTagType,
  getFinancialTransactionTypeTagType,
  isFinancialTransactionIncomeType,
} from "./financial-transaction-resources.js";

test("financial transaction presentation helpers keep type and status semantics", () => {
  assert.equal(formatFinancialAmountYuan(12345), "123.45");
  assert.equal(formatFinancialTransactionType("admin_add_balance"), "管理员充值");
  assert.equal(formatFinancialTransactionUserType("customer"), "用户");
  assert.equal(formatFinancialTransactionStatus("processing"), "处理中");
  assert.equal(isFinancialTransactionIncomeType("refund"), true);
  assert.equal(isFinancialTransactionIncomeType("payment"), false);
  assert.equal(getFinancialTransactionTypeTagType("withdraw"), "warning");
  assert.equal(getFinancialTransactionStatusTagType("failed"), "danger");
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
