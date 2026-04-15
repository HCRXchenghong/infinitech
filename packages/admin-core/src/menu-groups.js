import { adminProtectedRoutes } from "./route-registry.js";

const routeMap = new Map(
  adminProtectedRoutes.map((route) => [
    route.name,
    { path: route.path, name: route.title },
  ]),
);

function sharedRoute(routeName) {
  const route = routeMap.get(routeName);
  if (!route) {
    throw new Error(`admin menu route is not registered: ${routeName}`);
  }
  return route;
}

function section(id, name, routeNames) {
  return {
    id,
    name,
    children: routeNames.map(sharedRoute),
  };
}

export const adminMenuGroups = Object.freeze([
  {
    id: "overview",
    name: "总览中心",
    sections: [section("overview-dashboard", "总览视图", ["dashboard"])],
  },
  {
    id: "account",
    name: "账号管理",
    sections: [
      section("account-admin", "后台与权限", ["management-center"]),
      section("account-roles", "平台角色", [
        "users",
        "riders",
        "rider-ranks",
        "merchants",
      ]),
    ],
  },
  {
    id: "order-service",
    name: "订单服务",
    sections: [
      section("order-fulfillment", "履约与售后", ["orders", "after-sales"]),
      section("order-audits", "沟通与审计", [
        "support-chat",
        "rtc-console",
        "contact-phone-audits",
        "rtc-call-audits",
      ]),
    ],
  },
  {
    id: "operation",
    name: "运营营销",
    sections: [
      section("operation-campaign", "活动与投放", [
        "operations-center",
        "home-entry-settings",
        "errand-settings",
        "dining-buddy-governance",
        "featured-products",
        "home-campaigns",
        "coupon-management",
      ]),
      section(
        "operation-content",
        "内容与触达",
        ["official-site-center", "official-notifications", "content-settings"],
      ),
    ],
  },
  {
    id: "finance",
    name: "财务数据",
    sections: [
      section("finance-overview", "财务总览", [
        "finance-center",
        "transaction-logs",
      ]),
      section("finance-payment", "支付与结算", ["payment-center"]),
    ],
  },
  {
    id: "intelligent",
    name: "智能监控",
    sections: [
      section("intelligent-runtime", "平台监控", ["monitor-chat"]),
      section("intelligent-debug", "联调排障", ["blank-page"]),
    ],
  },
  {
    id: "system",
    name: "系统配置",
    sections: [
      section(
        "system-settings",
        "基础与平台配置",
        [
          "settings",
          "merchant-taxonomy-settings",
          "rider-rank-settings",
          "data-management",
        ],
      ),
      section("system-open-platform", "开放平台", [
        "api-management",
        "api-permissions",
        "api-documentation",
      ]),
      section("system-audit", "审计记录", ["system-logs"]),
    ],
  },
]);
