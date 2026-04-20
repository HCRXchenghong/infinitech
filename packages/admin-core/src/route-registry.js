function normalizeText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizePath(path) {
  const raw = normalizeText(path);
  if (!raw) {
    return "";
  }
  return raw.split(/[?#]/, 1)[0];
}

function freezeList(list = []) {
  return Object.freeze([...list]);
}

function buildNumberedTabTitle(title, value) {
  const normalizedTitle = normalizeText(title);
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return normalizedTitle;
  }
  return `${normalizedTitle} #${normalizedValue}`;
}

function freezeRouteRecord(route) {
  const path = normalizePath(route.path);
  const menuVisible = route.menuVisible !== false;
  const menuRoot = normalizePath(route.menuRoot) || (menuVisible ? path : "");
  return Object.freeze({
    ...route,
    path,
    title: normalizeText(route.title),
    view: normalizeText(route.view) || normalizeText(route.name),
    menuVisible,
    menuRoot,
    requiresAuth: route.requiresAuth !== false,
    matchPatterns: freezeList(route.matchPatterns),
  });
}

const ADMIN_PRIMARY_PROTECTED_ROUTE_RECORDS = [
  { path: "/dashboard", name: "dashboard", title: "仪表盘" },
  { path: "/orders", name: "orders", title: "订单管理" },
  { path: "/users", name: "users", title: "用户管理" },
  { path: "/riders", name: "riders", title: "骑手管理" },
  { path: "/rider-ranks", name: "rider-ranks", title: "骑手等级" },
  { path: "/merchants", name: "merchants", title: "商户管理" },
  { path: "/support-chat", name: "support-chat", title: "客服工作台" },
  { path: "/monitor-chat", name: "monitor-chat", title: "平台监控" },
  { path: "/blank-page", name: "blank-page", title: "联调工作台" },
  { path: "/rtc-console", name: "rtc-console", title: "RTC 管理台" },
  {
    path: "/home-entry-settings",
    name: "home-entry-settings",
    title: "首页入口配置",
  },
  { path: "/errand-settings", name: "errand-settings", title: "跑腿配置" },
  {
    path: "/dining-buddy-governance",
    name: "dining-buddy-governance",
    title: "同频饭友治理",
  },
  { path: "/featured-products", name: "featured-products", title: "今日推荐" },
  { path: "/home-campaigns", name: "home-campaigns", title: "首页推广" },
  {
    path: "/contact-phone-audits",
    name: "contact-phone-audits",
    title: "电话联系审计",
  },
  { path: "/rtc-call-audits", name: "rtc-call-audits", title: "RTC 通话审计" },
  { path: "/after-sales", name: "after-sales", title: "售后服务" },
  { path: "/operations-center", name: "operations-center", title: "运营管理" },
  {
    path: "/official-site-center",
    name: "official-site-center",
    title: "官网中心",
  },
  {
    path: "/notifications",
    name: "official-notifications",
    title: "官方通知",
  },
  { path: "/finance-center", name: "finance-center", title: "财务中心" },
  { path: "/transaction-logs", name: "transaction-logs", title: "财务日志" },
  { path: "/payment-center", name: "payment-center", title: "支付中心" },
  { path: "/management-center", name: "management-center", title: "管理中心" },
  {
    path: "/coupon-management",
    name: "coupon-management",
    title: "优惠券管理",
  },
  { path: "/settings", name: "settings", title: "系统设置" },
  {
    path: "/merchant-taxonomy-settings",
    name: "merchant-taxonomy-settings",
    title: "商户业务字典",
  },
  {
    path: "/rider-rank-settings",
    name: "rider-rank-settings",
    title: "骑手等级配置",
  },
  { path: "/system-logs", name: "system-logs", title: "系统日志" },
  { path: "/data-management", name: "data-management", title: "数据管理" },
  { path: "/content-settings", name: "content-settings", title: "内容设置" },
  { path: "/api-management", name: "api-management", title: "API 管理" },
  { path: "/api-permissions", name: "api-permissions", title: "API 权限管理" },
  { path: "/api-documentation", name: "api-documentation", title: "API 文档" },
];

const ADMIN_AUXILIARY_PROTECTED_ROUTE_RECORDS = [
  {
    path: "/merchants/:merchantId/shops/:shopId/menu",
    name: "shop-menu-manage",
    title: "菜单管理",
    menuRoot: "/merchants",
    menuVisible: false,
    matchPatterns: [/^\/merchants\/[^/]+\/shops\/[^/]+\/menu$/],
    formatTabTitle(route) {
      return buildNumberedTabTitle("菜单管理", route?.params?.shopId);
    },
  },
  {
    path: "/merchants/:merchantId/shops/:shopId",
    name: "shop-manage-detail",
    title: "店铺详情",
    menuRoot: "/merchants",
    menuVisible: false,
    matchPatterns: [/^\/merchants\/[^/]+\/shops\/[^/]+$/],
    formatTabTitle(route) {
      return buildNumberedTabTitle("店铺详情", route?.params?.shopId);
    },
  },
  {
    path: "/merchants/:id",
    name: "merchant-profile",
    title: "商户详情",
    menuRoot: "/merchants",
    menuVisible: false,
    matchPatterns: [/^\/merchants\/[^/]+$/],
    formatTabTitle(route) {
      return buildNumberedTabTitle("商户详情", route?.params?.id);
    },
  },
  {
    path: "/notifications/edit",
    name: "notification-create",
    title: "新建通知",
    menuRoot: "/notifications",
    menuVisible: false,
  },
  {
    path: "/notifications/edit/:id",
    name: "notification-edit",
    title: "编辑通知",
    menuRoot: "/notifications",
    menuVisible: false,
    matchPatterns: [/^\/notifications\/edit\/[^/]+$/],
  },
  {
    path: "/notifications/preview/:id",
    name: "notification-preview",
    title: "通知预览",
    menuRoot: "/notifications",
    menuVisible: false,
    matchPatterns: [/^\/notifications\/preview\/[^/]+$/],
  },
];

export const adminProtectedRouteRecords = Object.freeze(
  [
    ...ADMIN_PRIMARY_PROTECTED_ROUTE_RECORDS,
    ...ADMIN_AUXILIARY_PROTECTED_ROUTE_RECORDS,
  ].map(freezeRouteRecord),
);

export const adminProtectedRoutes = Object.freeze(
  adminProtectedRouteRecords
    .filter((route) => route.menuVisible)
    .map((route) =>
      Object.freeze({
        path: route.path,
        name: route.name,
        title: route.title,
      }),
    ),
);

export const ADMIN_PUBLIC_ROUTE_EXACT = Object.freeze([
  "/login",
  "/download",
  "/access-denied",
]);

export const ADMIN_PUBLIC_ROUTE_PREFIXES = Object.freeze([
  "/invite/",
  "/coupon/",
]);

const adminProtectedRouteByName = new Map(
  adminProtectedRouteRecords.map((route) => [route.name, route]),
);

const adminProtectedRouteByPath = new Map(
  adminProtectedRouteRecords.map((route) => [route.path, route]),
);

function resolveRouteLikeName(routeLike) {
  if (!routeLike || typeof routeLike !== "object") {
    return "";
  }
  return normalizeText(routeLike.name);
}

function resolveRouteLikePath(routeLike) {
  if (typeof routeLike === "string") {
    return normalizePath(routeLike);
  }
  if (!routeLike || typeof routeLike !== "object") {
    return "";
  }
  return normalizePath(routeLike.path);
}

function resolveRouteDescriptor(routeLike) {
  const routeName = resolveRouteLikeName(routeLike);
  if (routeName) {
    const namedRoute = adminProtectedRouteByName.get(routeName);
    if (namedRoute) {
      return namedRoute;
    }
  }
  return findAdminProtectedRouteByPath(resolveRouteLikePath(routeLike));
}

function matchesAdminProtectedRoute(route, path) {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    return false;
  }
  if (route.path === normalizedPath) {
    return true;
  }
  return route.matchPatterns.some((pattern) => pattern.test(normalizedPath));
}

export function findAdminProtectedRouteByName(name) {
  return adminProtectedRouteByName.get(normalizeText(name)) || null;
}

export function requireAdminProtectedRoute(name) {
  const route = findAdminProtectedRouteByName(name);
  if (!route) {
    throw new Error(`admin protected route is not registered: ${name}`);
  }
  return route;
}

export function findAdminProtectedRouteByPath(path) {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    return null;
  }

  const exactRoute = adminProtectedRouteByPath.get(normalizedPath);
  if (exactRoute) {
    return exactRoute;
  }

  return (
    adminProtectedRouteRecords.find((route) =>
      matchesAdminProtectedRoute(route, normalizedPath),
    ) || null
  );
}

export function buildAdminRouteMeta(routeLike) {
  const route = resolveRouteDescriptor(routeLike);
  if (!route) {
    return {};
  }

  const meta = {
    requiresAuth: route.requiresAuth,
    title: route.title,
  };
  if (route.menuRoot && route.menuRoot !== route.path) {
    meta.menuRoot = route.menuRoot;
  }
  return meta;
}

export function resolveAdminRouteMenuPath(path) {
  const route = findAdminProtectedRouteByPath(path);
  if (!route) {
    return "";
  }
  return route.menuRoot || route.path;
}

export function resolveAdminRouteTitle(routeLike) {
  if (routeLike && typeof routeLike === "object") {
    const metaTitle = normalizeText(routeLike.meta?.title);
    if (metaTitle) {
      return metaTitle;
    }
  }

  const route = resolveRouteDescriptor(routeLike);
  return route?.title || "";
}

export function resolveAdminTabTitle(routeLike) {
  const route = resolveRouteDescriptor(routeLike);
  if (route && typeof route.formatTabTitle === "function") {
    return normalizeText(route.formatTabTitle(routeLike)) || route.title;
  }
  return resolveAdminRouteTitle(routeLike);
}

export function isAdminPublicPath(path = "", options = {}) {
  const runtime =
    typeof options === "string"
      ? normalizeText(options)
      : normalizeText(options?.runtime);
  if (runtime === "site") {
    return true;
  }

  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    return false;
  }

  if (ADMIN_PUBLIC_ROUTE_EXACT.includes(normalizedPath)) {
    return true;
  }

  return ADMIN_PUBLIC_ROUTE_PREFIXES.some((prefix) =>
    normalizedPath.startsWith(prefix),
  );
}
