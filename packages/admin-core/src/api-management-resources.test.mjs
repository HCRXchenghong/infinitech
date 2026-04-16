import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPublicApiPayload,
  buildPublicApiSummary,
  createPublicApiFormState,
  generatePublicApiKey,
  getPublicApiPermissionLabel,
  normalizePublicApiList,
  normalizePublicApiPermissionList,
  normalizePublicApiRecord,
  PUBLIC_API_PERMISSION_CATALOG,
  PUBLIC_API_PERMISSION_OPTIONS,
  PUBLIC_API_RESOURCE_PERMISSIONS,
  resolvePublicApiPermissionSelection,
} from "./api-management-resources.js";

test("api management resources expose stable permission metadata", () => {
  assert.deepEqual(PUBLIC_API_RESOURCE_PERMISSIONS, [
    "orders",
    "users",
    "riders",
    "merchants",
    "products",
    "categories",
    "dashboard",
  ]);
  assert.equal(PUBLIC_API_PERMISSION_CATALOG.at(-1)?.key, "all");
  assert.deepEqual(PUBLIC_API_PERMISSION_OPTIONS.at(-1), {
    value: "all",
    label: "全部数据",
  });
  assert.equal(getPublicApiPermissionLabel("orders"), "订单数据");
  assert.equal(getPublicApiPermissionLabel("unknown"), "unknown");
});

test("api management resources normalize permissions, rows and payloads", () => {
  assert.deepEqual(
    normalizePublicApiPermissionList('[" users ","orders","all"]'),
    [...PUBLIC_API_RESOURCE_PERMISSIONS, "all"],
  );
  assert.deepEqual(
    normalizePublicApiPermissionList("orders, users ,invalid"),
    ["orders", "users"],
  );

  assert.deepEqual(
    normalizePublicApiRecord({
      name: " BI 平台 ",
      path: " /api/public/orders ",
      permissions: '["orders","users"]',
      api_key: " secret-key ",
      description: " 对账使用 ",
      is_active: 0,
    }),
    {
      name: "BI 平台",
      path: "/api/public/orders",
      permissions: ["orders", "users"],
      api_key: "secret-key",
      description: "对账使用",
      is_active: false,
    },
  );

  assert.deepEqual(
    createPublicApiFormState({
      permissions: ["orders", "dashboard", "all"],
      is_active: "",
    }),
    {
      name: "",
      path: "",
      permissions: [...PUBLIC_API_RESOURCE_PERMISSIONS, "all"],
      api_key: "",
      description: "",
      is_active: false,
    },
  );

  assert.deepEqual(
    buildPublicApiPayload({
      name: " 外部查询 ",
      permissions: ["orders", "users", "all"],
      api_key: " key-1 ",
      is_active: "true",
    }),
    {
      name: "外部查询",
      path: "",
      permissions: [...PUBLIC_API_RESOURCE_PERMISSIONS, "all"],
      api_key: "key-1",
      description: "",
      is_active: true,
    },
  );

  assert.deepEqual(
    normalizePublicApiList([
      { name: "A", permissions: ["orders"], is_active: 1 },
      { name: "B", permissions: '["users","all"]', is_active: 0 },
    ]),
    [
      {
        name: "A",
        path: "",
        permissions: ["orders"],
        api_key: "",
        description: "",
        is_active: true,
      },
      {
        name: "B",
        path: "",
        permissions: [...PUBLIC_API_RESOURCE_PERMISSIONS, "all"],
        api_key: "",
        description: "",
        is_active: false,
      },
    ],
  );
});

test("api management resources keep summary and permission toggles stable", () => {
  assert.deepEqual(
    buildPublicApiSummary([
      {
        name: "订单同步",
        path: "/api/public/orders",
        permissions: ["orders"],
        is_active: true,
      },
      {
        name: "数据中台",
        path: "",
        permissions: [...PUBLIC_API_RESOURCE_PERMISSIONS, "all"],
        is_active: false,
      },
    ]),
    {
      total: 2,
      active: 1,
      allScoped: 1,
      withPath: 1,
    },
  );

  assert.deepEqual(resolvePublicApiPermissionSelection(["orders", "all"], []), [
    ...PUBLIC_API_RESOURCE_PERMISSIONS,
    "all",
  ]);
  assert.deepEqual(
    resolvePublicApiPermissionSelection(
      ["orders", "users", "riders", "merchants", "products", "categories"],
      [...PUBLIC_API_RESOURCE_PERMISSIONS, "all"],
    ),
    ["orders", "users", "riders", "merchants", "products", "categories"],
  );
  assert.deepEqual(
    resolvePublicApiPermissionSelection(PUBLIC_API_RESOURCE_PERMISSIONS, ["orders"]),
    [...PUBLIC_API_RESOURCE_PERMISSIONS, "all"],
  );
});

test("api management resources generate fixed-length api keys", () => {
  const key = generatePublicApiKey(40);
  assert.equal(key.length, 40);
  assert.match(key, /^[A-Za-z0-9]+$/);
});
