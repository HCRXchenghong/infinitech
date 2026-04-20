import {
  ADMIN_METADATA_DUPLICATE_HINT,
  requireAdminProtectedRoute,
} from "./route-registry.js";

function normalizeText(value) {
  return String(value == null ? "" : value).trim();
}

function freezeList(list = []) {
  return Object.freeze([...list]);
}

function assertUniqueCatalogValue(seen, value, owner, label) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return;
  }
  const normalizedOwner = normalizeText(owner) || normalizedValue;
  const previousOwner = seen.get(normalizedValue);
  if (previousOwner) {
    throw new Error(
      `admin navigation ${label} duplicated: ${normalizedValue} (${previousOwner}, ${normalizedOwner})，${ADMIN_METADATA_DUPLICATE_HINT}`,
    );
  }
  seen.set(normalizedValue, normalizedOwner);
}

const ADMIN_NAVIGATION_MODULES = [
  { key: "identity-account", title: "身份与账号" },
  { key: "payment-center", title: "支付中心" },
  { key: "system-config", title: "系统配置" },
  { key: "message-notify", title: "消息与通知" },
  { key: "audit-log", title: "审计与日志" },
  { key: "realtime-console", title: "实时控制台" },
  { key: "operations-config", title: "运营配置" },
];

export const adminNavigationModules = Object.freeze(
  ADMIN_NAVIGATION_MODULES.map((module) => Object.freeze({ ...module })),
);

const adminNavigationModuleByKey = new Map(
  adminNavigationModules.map((module) => [module.key, module]),
);

export function validateAdminNavigationCatalog(catalog = []) {
  const groupIds = new Map();
  const groupNames = new Map();
  const sectionIds = new Map();
  const routeOwners = new Map();

  for (const group of catalog) {
    assertUniqueCatalogValue(groupIds, group?.id, group?.name, "group id");
    assertUniqueCatalogValue(groupNames, group?.name, group?.id, "group name");

    for (const section of group?.sections || []) {
      assertUniqueCatalogValue(
        sectionIds,
        section?.id,
        `${group?.id}/${section?.name}`,
        "section id",
      );

      for (const item of section?.items || []) {
        const routeName = normalizeText(item?.route);
        const route = requireAdminProtectedRoute(routeName);
        if (!route.menuVisible) {
          throw new Error(
            `admin navigation route must stay menu-visible: ${routeName} <- ${section?.id}`,
          );
        }

        const owner = `${normalizeText(group?.id)}/${normalizeText(section?.id)}`;
        const previousOwner = routeOwners.get(routeName);
        if (previousOwner) {
          throw new Error(
            `admin navigation route duplicated: ${routeName} (${previousOwner}, ${owner})，请收敛到单一路径`,
          );
        }
        routeOwners.set(routeName, owner);

        const moduleKey = normalizeText(item?.moduleKey);
        if (!moduleKey) {
          continue;
        }
        if (!adminNavigationModuleByKey.has(moduleKey)) {
          throw new Error(
            `admin navigation module is not registered: ${moduleKey} <- ${routeName}`,
          );
        }
      }
    }
  }

  return catalog;
}

const ADMIN_NAVIGATION_CATALOG = [
  {
    id: "overview",
    name: "总览中心",
    sections: [
      {
        id: "overview-dashboard",
        name: "总览视图",
        items: [{ route: "dashboard" }],
      },
    ],
  },
  {
    id: "account",
    name: "账号管理",
    sections: [
      {
        id: "account-admin",
        name: "后台与权限",
        items: [
          { route: "management-center", moduleKey: "identity-account" },
        ],
      },
      {
        id: "account-roles",
        name: "平台角色",
        items: [
          { route: "users", moduleKey: "identity-account" },
          { route: "riders", moduleKey: "identity-account" },
          { route: "rider-ranks", moduleKey: "identity-account" },
          { route: "merchants", moduleKey: "identity-account" },
        ],
      },
    ],
  },
  {
    id: "order-service",
    name: "订单服务",
    sections: [
      {
        id: "order-fulfillment",
        name: "履约与售后",
        items: [
          { route: "orders", moduleKey: "operations-config" },
          { route: "after-sales", moduleKey: "operations-config" },
        ],
      },
      {
        id: "order-audits",
        name: "沟通与审计",
        items: [
          { route: "support-chat", moduleKey: "message-notify" },
          { route: "rtc-console", moduleKey: "realtime-console" },
          { route: "contact-phone-audits", moduleKey: "audit-log" },
          { route: "rtc-call-audits", moduleKey: "audit-log" },
        ],
      },
    ],
  },
  {
    id: "operation",
    name: "运营营销",
    sections: [
      {
        id: "operation-campaign",
        name: "活动与投放",
        items: [
          { route: "operations-center", moduleKey: "operations-config" },
          { route: "home-entry-settings", moduleKey: "operations-config" },
          { route: "errand-settings", moduleKey: "operations-config" },
          { route: "dining-buddy-governance", moduleKey: "operations-config" },
          { route: "featured-products", moduleKey: "operations-config" },
          { route: "home-campaigns", moduleKey: "operations-config" },
          { route: "coupon-management", moduleKey: "payment-center" },
        ],
      },
      {
        id: "operation-content",
        name: "内容与触达",
        items: [
          { route: "official-site-center", moduleKey: "message-notify" },
          { route: "official-notifications", moduleKey: "message-notify" },
          { route: "content-settings", moduleKey: "system-config" },
        ],
      },
    ],
  },
  {
    id: "finance",
    name: "财务数据",
    sections: [
      {
        id: "finance-overview",
        name: "财务总览",
        items: [
          { route: "finance-center", moduleKey: "payment-center" },
          { route: "transaction-logs", moduleKey: "payment-center" },
        ],
      },
      {
        id: "finance-payment",
        name: "支付与结算",
        items: [{ route: "payment-center", moduleKey: "payment-center" }],
      },
    ],
  },
  {
    id: "intelligent",
    name: "智能监控",
    sections: [
      {
        id: "intelligent-runtime",
        name: "平台监控",
        items: [{ route: "monitor-chat", moduleKey: "message-notify" }],
      },
      {
        id: "intelligent-debug",
        name: "联调排障",
        items: [{ route: "blank-page", moduleKey: "realtime-console" }],
      },
    ],
  },
  {
    id: "system",
    name: "系统配置",
    sections: [
      {
        id: "system-settings",
        name: "基础与平台配置",
        items: [
          { route: "settings", moduleKey: "system-config" },
          { route: "merchant-taxonomy-settings", moduleKey: "operations-config" },
          { route: "rider-rank-settings", moduleKey: "operations-config" },
          { route: "data-management", moduleKey: "system-config" },
        ],
      },
      {
        id: "system-open-platform",
        name: "开放平台",
        items: [
          { route: "api-management", moduleKey: "system-config" },
          { route: "api-permissions", moduleKey: "system-config" },
          { route: "api-documentation", moduleKey: "system-config" },
        ],
      },
      {
        id: "system-audit",
        name: "审计记录",
        items: [{ route: "system-logs", moduleKey: "audit-log" }],
      },
    ],
  },
];

export const adminNavigationCatalog = Object.freeze(
  validateAdminNavigationCatalog(ADMIN_NAVIGATION_CATALOG).map((group) =>
    Object.freeze({
      ...group,
      sections: freezeList(
        (group.sections || []).map((section) =>
          Object.freeze({
            ...section,
            items: freezeList(
              (section.items || []).map((item) => Object.freeze({ ...item })),
            ),
          }),
        ),
      ),
    }),
  ),
);
