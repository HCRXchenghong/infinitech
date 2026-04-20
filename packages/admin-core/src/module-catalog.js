import {
  ADMIN_METADATA_DUPLICATE_HINT,
  requireAdminProtectedRoute,
} from "./route-registry.js";

function normalizeText(value) {
  return String(value == null ? "" : value).trim();
}

function freezeRouteList(routes = []) {
  return Object.freeze([...routes]);
}

function assertUniqueModuleValue(seen, value, owner, label) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return;
  }
  const normalizedOwner = normalizeText(owner) || normalizedValue;
  const previousOwner = seen.get(normalizedValue);
  if (previousOwner) {
    throw new Error(
      `admin module ${label} duplicated: ${normalizedValue} (${previousOwner}, ${normalizedOwner})，${ADMIN_METADATA_DUPLICATE_HINT}`,
    );
  }
  seen.set(normalizedValue, normalizedOwner);
}

export function validateAdminModuleCatalog(catalog = []) {
  const keyOwners = new Map();
  const titleOwners = new Map();
  const routeOwners = new Map();

  for (const section of catalog) {
    assertUniqueModuleValue(
      keyOwners,
      section?.key,
      section?.title,
      "key",
    );
    assertUniqueModuleValue(
      titleOwners,
      section?.title,
      section?.key,
      "title",
    );

    for (const routeName of section?.routes || []) {
      const route = requireAdminProtectedRoute(routeName);
      if (!route.menuVisible) {
        throw new Error(
          `admin module route must stay menu-visible: ${routeName} <- ${section?.key}`,
        );
      }

      const normalizedRouteName = normalizeText(routeName);
      const previousOwner = routeOwners.get(normalizedRouteName);
      if (previousOwner) {
        throw new Error(
          `admin module route duplicated: ${normalizedRouteName} (${previousOwner}, ${section?.key})，请收敛到单一模块`,
        );
      }
      routeOwners.set(normalizedRouteName, normalizeText(section?.key));
    }
  }

  return catalog;
}

const ADMIN_MODULE_CATALOG = [
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
];

export const adminModuleCatalog = Object.freeze(
  validateAdminModuleCatalog(ADMIN_MODULE_CATALOG).map((section) =>
    Object.freeze({
      ...section,
      routes: freezeRouteList(section.routes),
    }),
  ),
);
