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

function assertUniqueMenuValue(seen, value, owner, label) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return;
  }
  const normalizedOwner = normalizeText(owner) || normalizedValue;
  const previousOwner = seen.get(normalizedValue);
  if (previousOwner) {
    throw new Error(
      `admin menu ${label} duplicated: ${normalizedValue} (${previousOwner}, ${normalizedOwner})，${ADMIN_METADATA_DUPLICATE_HINT}`,
    );
  }
  seen.set(normalizedValue, normalizedOwner);
}

function sharedRoute(routeName) {
  const route = requireAdminProtectedRoute(routeName);
  return {
    path: route.path,
    name: route.title,
  };
}

function section(id, name, routeNames) {
  return {
    id,
    name,
    children: routeNames.map(sharedRoute),
  };
}

export function validateAdminMenuGroups(groups = []) {
  const groupIds = new Map();
  const groupNames = new Map();
  const sectionIds = new Map();
  const routeOwners = new Map();

  for (const group of groups) {
    assertUniqueMenuValue(groupIds, group?.id, group?.name, "group id");
    assertUniqueMenuValue(groupNames, group?.name, group?.id, "group name");

    for (const menuSection of group?.sections || []) {
      assertUniqueMenuValue(
        sectionIds,
        menuSection?.id,
        `${group?.id}/${menuSection?.name}`,
        "section id",
      );

      const routeEntries = Array.isArray(menuSection?.routes)
        ? menuSection.routes.map((routeName) => {
            const route = requireAdminProtectedRoute(routeName);
            if (!route.menuVisible) {
              throw new Error(
                `admin menu route must stay menu-visible: ${routeName} <- ${menuSection?.id}`,
              );
            }
            return {
              routeKey: normalizeText(routeName),
              ownerKey: routeName,
            };
          })
        : Array.isArray(menuSection?.children)
          ? menuSection.children.map((route) => ({
              routeKey: normalizeText(route?.path),
              ownerKey: route?.path,
            }))
          : [];

      for (const routeEntry of routeEntries) {
        const normalizedRouteName = normalizeText(routeEntry.routeKey);
        const owner = `${normalizeText(group?.id)}/${normalizeText(menuSection?.id)}`;
        const previousOwner = routeOwners.get(normalizedRouteName);
        if (previousOwner) {
          throw new Error(
            `admin menu route duplicated: ${routeEntry.ownerKey} (${previousOwner}, ${owner})，请收敛到单一路径`,
          );
        }
        routeOwners.set(normalizedRouteName, owner);
      }
    }
  }

  return groups;
}

const ADMIN_MENU_GROUPS = [
  {
    id: "overview",
    name: "总览中心",
    sections: [
      { id: "overview-dashboard", name: "总览视图", routes: ["dashboard"] },
    ],
  },
  {
    id: "account",
    name: "账号管理",
    sections: [
      {
        id: "account-admin",
        name: "后台与权限",
        routes: ["management-center"],
      },
      {
        id: "account-roles",
        name: "平台角色",
        routes: ["users", "riders", "rider-ranks", "merchants"],
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
        routes: ["orders", "after-sales"],
      },
      {
        id: "order-audits",
        name: "沟通与审计",
        routes: [
          "support-chat",
          "rtc-console",
          "contact-phone-audits",
          "rtc-call-audits",
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
        routes: [
          "operations-center",
          "home-entry-settings",
          "errand-settings",
          "dining-buddy-governance",
          "featured-products",
          "home-campaigns",
          "coupon-management",
        ],
      },
      {
        id: "operation-content",
        name: "内容与触达",
        routes: [
          "official-site-center",
          "official-notifications",
          "content-settings",
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
        routes: ["finance-center", "transaction-logs"],
      },
      {
        id: "finance-payment",
        name: "支付与结算",
        routes: ["payment-center"],
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
        routes: ["monitor-chat"],
      },
      {
        id: "intelligent-debug",
        name: "联调排障",
        routes: ["blank-page"],
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
        routes: [
          "settings",
          "merchant-taxonomy-settings",
          "rider-rank-settings",
          "data-management",
        ],
      },
      {
        id: "system-open-platform",
        name: "开放平台",
        routes: ["api-management", "api-permissions", "api-documentation"],
      },
      {
        id: "system-audit",
        name: "审计记录",
        routes: ["system-logs"],
      },
    ],
  },
];

export const adminMenuGroups = Object.freeze(
  validateAdminMenuGroups(ADMIN_MENU_GROUPS).map((group) =>
    Object.freeze({
      ...group,
      sections: freezeList(
        (group.sections || []).map((menuSection) =>
          Object.freeze(section(menuSection.id, menuSection.name, menuSection.routes)),
        ),
      ),
    }),
  ),
);
