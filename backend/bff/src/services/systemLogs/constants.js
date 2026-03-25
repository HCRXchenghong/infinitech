const path = require("path");

const MAX_SCAN_LINES = 20000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const HEALTH_CHECK_TIMEOUT_MS = 800;

const ACTION_LABELS = {
  create: "新增",
  delete: "删除",
  update: "修改",
  read: "查询",
  system: "系统",
  error: "异常"
};

const RESOURCE_RULES = [
  { pattern: /^\/api\/auth\/login$/, label: "用户" },
  { pattern: /^\/api\/auth\/register$/, label: "用户" },
  { pattern: /^\/api\/auth\/rider\/login$/, label: "骑手" },
  { pattern: /^\/api\/auth\/merchant\/login$/, label: "商户" },
  { pattern: /^\/api\/login$/, label: "管理员" },
  { pattern: /^\/auth\/login$/, label: "用户" },
  { pattern: /^\/auth\/register$/, label: "用户" },
  { pattern: /^\/auth\/rider\/login$/, label: "骑手" },
  { pattern: /^\/auth\/merchant\/login$/, label: "商户" },
  { pattern: /^\/login$/, label: "管理员" },
  { pattern: /^\/api\/users(\/|$)/, label: "用户" },
  { pattern: /^\/api\/riders(\/|$)/, label: "骑手" },
  { pattern: /^\/api\/merchants(\/|$)/, label: "商户" },
  { pattern: /^\/users(\/|$)/, label: "用户" },
  { pattern: /^\/riders(\/|$)/, label: "骑手" },
  { pattern: /^\/merchants(\/|$)/, label: "商户" },
  { pattern: /^\/admins(\/|$)/, label: "管理员" },
  { pattern: /^\/api\/orders(\/|$)/, label: "订单" },
  { pattern: /^\/api\/admins(\/|$)/, label: "管理员" },
  { pattern: /^\/api\/carousel(\/|$)/, label: "轮播图" },
  { pattern: /^\/api\/push-messages(\/|$)/, label: "推送消息" },
  { pattern: /^\/api\/public-apis(\/|$)/, label: "对外 API" },
  { pattern: /^\/api\/api-keys(\/|$)/, label: "API Key" },
  { pattern: /^\/api\/onboarding\/invites(\/|$)/, label: "邀请链接" },
  { pattern: /^\/api\/after-sales(\/|$)/, label: "售后单" },
  { pattern: /^\/api\/wallet(\/|$)/, label: "钱包" },
  { pattern: /^\/api\/pay-config(\/|$)/, label: "支付配置" },
  { pattern: /^\/api\/app-download-config(\/|$)/, label: "下载配置" },
  { pattern: /^\/api\/settings(\/|$)/, label: "系统设置" },
  { pattern: /^\/api\/system-logs(\/|$)/, label: "系统日志" },
  { pattern: /^\/system-logs(\/|$)/, label: "系统日志" },
  { pattern: /^\/health(\/|$)/, label: "健康检查" }
];

const ALLOWED_SOURCES = new Set(["all", "bff", "go"]);
const ALLOWED_ACTIONS = new Set(["all", "create", "delete", "update", "read", "system", "error"]);

const BFF_LOG_PATH = path.resolve(__dirname, "../../../logs/combined.log");
const GO_LOG_PATH = path.resolve(__dirname, "../../../../go/logs/combined.log");

module.exports = {
  MAX_SCAN_LINES,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  HEALTH_CHECK_TIMEOUT_MS,
  ACTION_LABELS,
  RESOURCE_RULES,
  ALLOWED_SOURCES,
  ALLOWED_ACTIONS,
  BFF_LOG_PATH,
  GO_LOG_PATH,
};
