import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_PUBLIC_ROUTE_EXACT,
  ADMIN_PUBLIC_ROUTE_PREFIXES,
  adminProtectedRouteRecords,
  adminProtectedRoutes,
  buildAdminRouteMeta,
  findAdminProtectedRouteByName,
  findAdminProtectedRouteByPath,
  isAdminPublicPath,
  requireAdminProtectedRoute,
  resolveAdminRouteMenuPath,
  resolveAdminRouteTitle,
  resolveAdminTabTitle,
} from "./route-registry.js";

test("route registry exposes menu routes separately from protected detail records", () => {
  assert.equal(adminProtectedRoutes.some((route) => route.name === "dashboard"), true);
  assert.equal(
    adminProtectedRoutes.some((route) => route.name === "merchant-profile"),
    false,
  );
  assert.equal(
    adminProtectedRouteRecords.some((route) => route.name === "merchant-profile"),
    true,
  );
});

test("route registry resolves protected routes by name and path", () => {
  assert.equal(findAdminProtectedRouteByName("settings")?.path, "/settings");
  assert.equal(requireAdminProtectedRoute("dashboard").title, "仪表盘");

  assert.equal(
    findAdminProtectedRouteByPath("/merchants/18")?.name,
    "merchant-profile",
  );
  assert.equal(
    findAdminProtectedRouteByPath("/merchants/18/shops/7/menu")?.name,
    "shop-menu-manage",
  );
  assert.equal(
    findAdminProtectedRouteByPath("/notifications/preview/9")?.name,
    "notification-preview",
  );
});

test("route registry resolves menu roots and titles from shared descriptors", () => {
  assert.equal(resolveAdminRouteMenuPath("/dashboard"), "/dashboard");
  assert.equal(resolveAdminRouteMenuPath("/merchants/18"), "/merchants");
  assert.equal(resolveAdminRouteMenuPath("/notifications/edit/8"), "/notifications");

  assert.equal(resolveAdminRouteTitle("/payment-center"), "支付中心");
  assert.equal(
    resolveAdminRouteTitle({
      name: "merchant-profile",
      params: { id: "88" },
      meta: { title: "商户详情" },
    }),
    "商户详情",
  );
});

test("route registry builds shared tab titles and route meta", () => {
  assert.equal(
    resolveAdminTabTitle({
      name: "merchant-profile",
      params: { id: "88" },
    }),
    "商户详情 #88",
  );
  assert.equal(
    resolveAdminTabTitle({
      name: "shop-manage-detail",
      params: { shopId: "16" },
    }),
    "店铺详情 #16",
  );
  assert.deepEqual(buildAdminRouteMeta(requireAdminProtectedRoute("settings")), {
    requiresAuth: true,
    title: "系统设置",
  });
  assert.deepEqual(
    buildAdminRouteMeta(requireAdminProtectedRoute("notification-preview")),
    {
      requiresAuth: true,
      title: "通知预览",
      menuRoot: "/notifications",
    },
  );
});

test("route registry centralizes admin public route detection", () => {
  assert.equal(ADMIN_PUBLIC_ROUTE_EXACT.includes("/login"), true);
  assert.equal(ADMIN_PUBLIC_ROUTE_PREFIXES.includes("/invite/"), true);
  assert.equal(isAdminPublicPath("/login"), true);
  assert.equal(isAdminPublicPath("/invite/abc"), true);
  assert.equal(isAdminPublicPath("/dashboard"), false);
  assert.equal(isAdminPublicPath("/dashboard", { runtime: "site" }), true);
});
