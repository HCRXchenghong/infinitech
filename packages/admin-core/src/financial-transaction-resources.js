function normalizeAmountCent(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return amount;
}

function normalizeYuanAmountCent(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return Math.round(amount * 100);
}

export function formatFinancialAmountYuan(value) {
  return (normalizeAmountCent(value) / 100).toFixed(2);
}

export function formatFinancialTransactionType(type) {
  const typeMap = {
    recharge: "充值",
    withdraw: "提现",
    payment: "支付",
    refund: "退款",
    compensation: "赔付",
    admin_add_balance: "管理员充值",
    admin_deduct_balance: "管理员扣款",
    income: "收入",
  };
  return typeMap[type] || type;
}

export function isFinancialTransactionIncomeType(type) {
  return ["recharge", "admin_add_balance", "income", "refund"].includes(type);
}

export function getFinancialTransactionTypeTagType(type) {
  if (["recharge", "admin_add_balance", "income"].includes(type)) {
    return "success";
  }
  if (["withdraw", "payment", "admin_deduct_balance"].includes(type)) {
    return "warning";
  }
  if (["refund", "compensation"].includes(type)) {
    return "info";
  }
  return "";
}

export function formatFinancialTransactionUserType(type) {
  const typeMap = {
    user: "用户",
    customer: "用户",
    rider: "骑手",
    merchant: "商户",
    admin: "管理员",
  };
  return typeMap[type] || type;
}

export function formatFinancialTransactionStatus(status) {
  const statusMap = {
    success: "成功",
    processing: "处理中",
    pending: "待处理",
    failed: "失败",
    cancelled: "已取消",
  };
  return statusMap[status] || status;
}

export function getFinancialTransactionStatusTagType(status) {
  if (status === "success") {
    return "success";
  }
  if (status === "failed") {
    return "danger";
  }
  if (status === "processing" || status === "pending" || status === "cancelled") {
    return "warning";
  }
  return "";
}

export function buildFinanceOverviewKpiCards(overview = {}) {
  return [
    {
      label: "总流水",
      value: `¥${formatFinancialAmountYuan(overview.totalTransactionAmount)}`,
      desc: "周期内所有支付类交易总金额",
    },
    {
      label: "充值金额",
      value: `¥${formatFinancialAmountYuan(overview.totalRechargeAmount)}`,
      desc: "周期内用户充值总金额",
    },
    {
      label: "提现金额",
      value: `¥${formatFinancialAmountYuan(overview.totalWithdrawAmount)}`,
      desc: "周期内提现申请总金额",
    },
    {
      label: "平台收益",
      value: `¥${formatFinancialAmountYuan(overview.platformRevenue)}`,
      desc: "周期内平台佣金收益",
    },
    {
      label: "订单数",
      value: overview.totalOrderCount ?? 0,
      desc: "周期内新增订单总数",
    },
    {
      label: "活跃用户",
      value: overview.activeCustomerCount ?? 0,
      desc: "当前活跃用户钱包账户数",
    },
    {
      label: "活跃骑手",
      value: overview.activeRiderCount ?? 0,
      desc: "当前活跃骑手钱包账户数",
    },
    {
      label: "活跃商户",
      value: overview.activeMerchantCount ?? 0,
      desc: "当前活跃商户钱包账户数",
    },
  ];
}

export function buildFinanceRefundCards(overview = {}) {
  return [
    {
      label: "退款金额",
      value: `¥${formatFinancialAmountYuan(overview.totalRefundAmount)}`,
      desc: "周期内退款总金额",
    },
    {
      label: "退款笔数",
      value: overview.totalRefundCount ?? 0,
      desc: "周期内退款总笔数",
    },
    {
      label: "赔付金额",
      value: `¥${formatFinancialAmountYuan(overview.totalCompensationAmount)}`,
      desc: "周期内赔付总金额",
    },
    {
      label: "赔付笔数",
      value: overview.totalCompensationCount ?? 0,
      desc: "周期内赔付总笔数",
    },
  ];
}

export function formatFinanceCenterDate(value) {
  return value ? String(value).slice(0, 10) : "-";
}

export function buildFinanceCenterParams(filters = {}) {
  const params = {
    periodType: filters.periodType || "daily",
  };

  if (filters.statDate) {
    params.statDate = filters.statDate;
  }

  return params;
}

export function buildFinanceUserDetailsParams(filters = {}, userType, overrides = {}) {
  return {
    ...buildFinanceCenterParams(filters),
    limit: 20,
    sortBy: "total_income",
    sortOrder: "desc",
    ...overrides,
    ...(userType ? { userType } : {}),
  };
}

export function buildFinanceRecentTransactionParams(overrides = {}) {
  return {
    page: 1,
    limit: 1,
    ...overrides,
  };
}

export function createFinanceWalletActionForm(overrides = {}) {
  return {
    userType: "user",
    userId: "",
    amountYuan: 10,
    note: "",
    ...overrides,
  };
}

export function validateFinanceWalletActionForm(form = {}) {
  if (!String(form.userId || "").trim()) {
    return "请输入账号ID";
  }
  if (normalizeYuanAmountCent(form.amountYuan) <= 0) {
    return "请输入有效金额";
  }
  return "";
}

export function buildFinanceRechargePayload(form = {}) {
  return {
    user_id: String(form.userId ?? ""),
    user_type: form.userType || "user",
    amount: normalizeYuanAmountCent(form.amountYuan),
    note: form.note || "",
  };
}

export function buildFinanceDeductPayload(form = {}) {
  return {
    targetUserId: String(form.userId ?? ""),
    targetUserType: form.userType || "user",
    amount: normalizeYuanAmountCent(form.amountYuan),
    reason: "manual_deduct",
    remark: form.note || "",
  };
}

export function createFinanceWalletActionRecord(form = {}) {
  return {
    userId: String(form.userId ?? ""),
    userType: form.userType || "user",
    amount: normalizeYuanAmountCent(form.amountYuan),
  };
}

export function createFinanceCoinRatioState(payload = {}) {
  const ratio = Number(payload.ratio);
  return {
    ratio: Number.isFinite(ratio) && ratio > 0 ? Math.round(ratio) : 100,
  };
}

export function buildFinanceExportFilename(filters = {}) {
  const params = buildFinanceCenterParams(filters);
  return `finance-report-${params.periodType}-${params.statDate || "latest"}.json`;
}

export function getFinanceTransactionDirectionSign(type) {
  return isFinancialTransactionIncomeType(type) ? "+" : "-";
}
