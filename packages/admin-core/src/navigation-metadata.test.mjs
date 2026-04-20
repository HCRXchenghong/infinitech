import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_METADATA_DUPLICATE_HINT,
  adminProtectedRouteRecords,
  validateAdminProtectedRouteRecords,
} from "./route-registry.js";
import {
  adminNavigationCatalog,
  validateAdminNavigationCatalog,
} from "./navigation-catalog.js";
import {
  adminModuleCatalog,
  validateAdminModuleCatalog,
} from "./module-catalog.js";
import { adminMenuGroups, validateAdminMenuGroups } from "./menu-groups.js";

test("admin navigation metadata validators accept the shared registry state", () => {
  assert.equal(
    validateAdminProtectedRouteRecords(adminProtectedRouteRecords),
    adminProtectedRouteRecords,
  );
  assert.equal(
    validateAdminNavigationCatalog(adminNavigationCatalog),
    adminNavigationCatalog,
  );
  assert.equal(validateAdminModuleCatalog(adminModuleCatalog), adminModuleCatalog);
  assert.equal(validateAdminMenuGroups(adminMenuGroups), adminMenuGroups);
});

test("admin route registry rejects duplicate names and invalid menu roots", () => {
  assert.throws(
    () =>
      validateAdminProtectedRouteRecords([
        { name: "dashboard", path: "/dashboard", title: "仪表盘", menuVisible: true },
        { name: "dashboard", path: "/dashboard-2", title: "仪表盘二", menuVisible: true },
      ]),
    new RegExp(ADMIN_METADATA_DUPLICATE_HINT),
  );

  assert.throws(
    () =>
      validateAdminProtectedRouteRecords([
        { name: "dashboard", path: "/dashboard", title: "仪表盘", menuVisible: true },
        {
          name: "merchant-profile",
          path: "/merchants/:id",
          title: "商户详情",
          menuVisible: false,
          menuRoot: "/missing",
        },
      ]),
    /menu root is not registered/,
  );
});

test("admin navigation catalog rejects duplicate ids and repeated route ownership", () => {
  assert.throws(
    () =>
      validateAdminNavigationCatalog([
        {
          id: "overview",
          name: "总览中心",
          sections: [
            {
              id: "overview-a",
              name: "总览",
              items: [{ route: "dashboard" }],
            },
          ],
        },
        {
          id: "overview",
          name: "运营中心",
          sections: [
            {
              id: "operations-a",
              name: "运营",
              items: [{ route: "orders", moduleKey: "operations-config" }],
            },
          ],
        },
      ]),
    new RegExp(ADMIN_METADATA_DUPLICATE_HINT),
  );

  assert.throws(
    () =>
      validateAdminNavigationCatalog([
        {
          id: "overview",
          name: "总览中心",
          sections: [
            {
              id: "overview-a",
              name: "总览",
              items: [{ route: "dashboard" }],
            },
          ],
        },
        {
          id: "operations",
          name: "运营中心",
          sections: [
            {
              id: "operations-a",
              name: "运营",
              items: [{ route: "dashboard", moduleKey: "operations-config" }],
            },
          ],
        },
      ]),
    /请收敛到单一路径/,
  );
});

test("admin module catalog rejects duplicate titles and repeated route ownership", () => {
  assert.throws(
    () =>
      validateAdminModuleCatalog([
        { key: "account-a", title: "账号管理", routes: ["users"] },
        { key: "account-b", title: "账号管理", routes: ["riders"] },
      ]),
    new RegExp(ADMIN_METADATA_DUPLICATE_HINT),
  );

  assert.throws(
    () =>
      validateAdminModuleCatalog([
        { key: "account", title: "账号管理", routes: ["users"] },
        { key: "account-2", title: "账号管理二", routes: ["users"] },
      ]),
    /请收敛到单一模块/,
  );
});

test("admin menu groups reject duplicate ids and repeated route ownership", () => {
  assert.throws(
    () =>
      validateAdminMenuGroups([
        {
          id: "overview",
          name: "总览中心",
          sections: [{ id: "overview-a", name: "总览", routes: ["dashboard"] }],
        },
        {
          id: "overview",
          name: "运营中心",
          sections: [{ id: "overview-b", name: "运营", routes: ["orders"] }],
        },
      ]),
    new RegExp(ADMIN_METADATA_DUPLICATE_HINT),
  );

  assert.throws(
    () =>
      validateAdminMenuGroups([
        {
          id: "overview",
          name: "总览中心",
          sections: [{ id: "overview-a", name: "总览", routes: ["dashboard"] }],
        },
        {
          id: "operations",
          name: "运营中心",
          sections: [{ id: "operations-a", name: "运营", routes: ["dashboard"] }],
        },
      ]),
    /请收敛到单一路径/,
  );
});
