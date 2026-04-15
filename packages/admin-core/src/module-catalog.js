export const adminModuleCatalog = Object.freeze([
  {
    key: "identity-account",
    title: "身份与账号",
    routes: ["users", "riders", "merchants", "management-center"],
  },
  {
    key: "payment-center",
    title: "支付中心",
    routes: [
      "payment-center",
      "finance-center",
      "transaction-logs",
      "coupon-management",
    ],
  },
  {
    key: "system-config",
    title: "系统配置",
    routes: [
      "settings",
      "data-management",
      "content-settings",
      "api-management",
      "api-permissions",
      "api-documentation",
    ],
  },
  {
    key: "message-notify",
    title: "消息与通知",
    routes: [
      "support-chat",
      "monitor-chat",
      "official-site-center",
      "official-notifications",
    ],
  },
  {
    key: "audit-log",
    title: "审计与日志",
    routes: ["system-logs", "contact-phone-audits", "rtc-call-audits"],
  },
  {
    key: "realtime-console",
    title: "实时控制台",
    routes: ["rtc-console", "blank-page"],
  },
  {
    key: "operations-config",
    title: "运营配置",
    routes: [
      "orders",
      "after-sales",
      "operations-center",
      "home-entry-settings",
      "errand-settings",
      "dining-buddy-governance",
      "featured-products",
      "home-campaigns",
      "merchant-taxonomy-settings",
      "rider-rank-settings",
    ],
  },
]);
