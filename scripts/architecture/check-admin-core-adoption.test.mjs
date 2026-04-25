import test from "node:test";
import assert from "node:assert/strict";

import { adminProtectedRouteRecords } from "../../packages/admin-core/src/route-registry.js";
import {
  extractProtectedViewRouteNames,
  findAdminCoreAdoptionViolations,
} from "./check-admin-core-adoption.mjs";

const VALID_ROUTER_SOURCE = `import {
  adminProtectedRouteRecords,
  buildAdminRouteMeta,
} from "@infinitech/admin-core/route-registry";

const protectedRoutes = adminProtectedRouteRecords;
const protectedViewMap = {
${adminProtectedRouteRecords
  .map((route) => `  "${route.name}": () => import("@/views/${route.name}.vue"),`)
  .join("\n")}
};
`;

test("extractProtectedViewRouteNames reads quoted and bare route keys", () => {
  const source = `const protectedViewMap = {
    dashboard: () => import("@/views/Dashboard.vue"),
    "api-permissions": () => import("@/views/ApiPermissions.vue"),
  };
`;
  assert.deepEqual(extractProtectedViewRouteNames(source), [
    "api-permissions",
    "dashboard",
  ]);
});

test("findAdminCoreAdoptionViolations passes aligned router and flags route drift", () => {
  assert.deepEqual(
    findAdminCoreAdoptionViolations({
      routerSource: VALID_ROUTER_SOURCE,
      sourceFiles: [],
    }),
    [],
  );

  const failures = findAdminCoreAdoptionViolations({
    routerSource: VALID_ROUTER_SOURCE
      .replace("@infinitech/admin-core/route-registry", "@/router/local-registry")
      .replace(`  "${adminProtectedRouteRecords[0].name}": () => import("@/views/${adminProtectedRouteRecords[0].name}.vue"),\n`, ""),
    sourceFiles: [],
  });

  assert.ok(failures.some((failure) => /route-registry/.test(failure)));
  assert.ok(failures.some((failure) => /missing shared route/.test(failure)));
});

test("findAdminCoreAdoptionViolations rejects local shared symbol definitions", () => {
  const failures = findAdminCoreAdoptionViolations({
    routerSource: VALID_ROUTER_SOURCE,
    sourceFiles: [
      {
        path: "/repo/admin-vue/src/views/localQuery.js",
        source: `export function buildSystemLogListQuery() { return {}; }\nconst ok = true;\n`,
      },
      {
        path: "/repo/admin-vue/src/views/localPermissions.js",
        source: `const PUBLIC_API_PERMISSION_OPTIONS = [];\n`,
      },
    ],
  });

  assert.ok(failures.some((failure) => /buildSystemLogListQuery/.test(failure)));
  assert.ok(failures.some((failure) => /PUBLIC_API_PERMISSION_OPTIONS/.test(failure)));
});
