import test from "node:test";
import assert from "node:assert/strict";

import {
  GO_ROUTE_GUARD_PUBLIC_EXCEPTIONS,
  GO_ROUTE_GUARD_PUBLIC_EXCEPTION_PATTERNS,
  assertGoRouteGuardCoverage,
  extractGoGroupPrefixes,
  extractGoRoutes,
  extractRouteGuardRules,
  findGoRouteGuardCoverageGaps,
  ruleMatchesRoute,
} from "./check-go-route-guard-coverage.mjs";

test("go route guard coverage extracts group prefixes and full routes", () => {
  const mainSource = `
    api := r.Group("/api")
    appDownloadAdmin := api.Group("")
    wallet := api.Group("/wallet")

    api.GET("/app-download-config", handlers.AdminSettings.GetAppDownloadConfig)
    appDownloadAdmin.POST("/app-download-config", handlers.AdminSettings.UpdateAppDownloadConfig)
    wallet.GET("/balance", handlers.Wallet.GetBalance)
  `;

  const groupPrefixes = extractGoGroupPrefixes(mainSource);
  assert.equal(groupPrefixes.get("api"), "/api");
  assert.equal(groupPrefixes.get("appDownloadAdmin"), "/api");
  assert.equal(groupPrefixes.get("wallet"), "/api/wallet");

  const routes = extractGoRoutes(mainSource, { groupPrefixes });
  assert.deepEqual(
    routes.map((route) => route.signature),
    [
      "GET /api/app-download-config",
      "POST /api/app-download-config",
      "GET /api/wallet/balance",
    ],
  );
});

test("go route guard coverage ignores explicit public exceptions and matches exact or prefix rules", async () => {
  const mainSource = `
    api := r.Group("/api")
    wallet := api.Group("/wallet")

    api.GET("/app-download-config", handlers.AdminSettings.GetAppDownloadConfig)
    api.POST("/app-download-config", handlers.AdminSettings.UpdateAppDownloadConfig)
    wallet.GET("/balance", handlers.Wallet.GetBalance)
  `;
  const routeGuardSource = `
    var routeGuardRules = []routeGuardRule{
      {path: "/api/app-download-config", methods: methods("POST"), guard: guardAdminOnly},
      {path: "/api/wallet", prefix: true, guard: guardAnyAuth},
    }
  `;

  const parsedRules = extractRouteGuardRules(routeGuardSource);
  assert.equal(parsedRules.length, 2);
  assert.equal(ruleMatchesRoute(
    { method: "GET", fullPath: "/api/wallet/balance" },
    parsedRules[1],
  ), true);

  const result = findGoRouteGuardCoverageGaps(mainSource, routeGuardSource, {
    publicExceptions: GO_ROUTE_GUARD_PUBLIC_EXCEPTIONS,
    publicExceptionPatterns: GO_ROUTE_GUARD_PUBLIC_EXCEPTION_PATTERNS,
  });
  assert.equal(result.gaps.length, 0);

  const assertionResult = await assertGoRouteGuardCoverage({
    mainSource,
    routeGuardSource,
    publicExceptions: GO_ROUTE_GUARD_PUBLIC_EXCEPTIONS,
    publicExceptionPatterns: GO_ROUTE_GUARD_PUBLIC_EXCEPTION_PATTERNS,
  });
  assert.deepEqual(assertionResult, {
    routeCount: 3,
    monitoredRouteCount: 2,
    gapCount: 0,
  });
});

test("go route guard coverage reports method or namespace drift under guarded routes", async () => {
  const mainSource = `
    api := r.Group("/api")
    api.GET("/weather-config/status", handlers.AdminSettings.GetWeatherStatus)
  `;
  const routeGuardSource = `
    var routeGuardRules = []routeGuardRule{
      {path: "/api/weather-config", guard: guardAdminOnly},
    }
  `;

  await assert.rejects(
    () => assertGoRouteGuardCoverage({ mainSource, routeGuardSource, publicExceptions: new Set() }),
    (error) => {
      assert.match(error.message, /GET \/api\/weather-config\/status/);
      assert.match(error.message, /\/api\/weather-config/);
      assert.match(error.message, /请给新路由补 route_guard 规则/);
      return true;
    },
  );
});

test("go route guard coverage public exception patterns allow intentional catalog reads", () => {
  const mainSource = `
    api := r.Group("/api")
    api.GET("/shops", handlers.Shop.GetShops)
    api.GET("/products/:id", handlers.Product.GetProductDetail)
    api.POST("/cooperations", handlers.Cooperation.Create)
  `;
  const routeGuardSource = `
    var routeGuardRules = []routeGuardRule{
      {path: "/api/shops", methods: methods("POST"), guard: guardMerchantOrAdmin},
      {path: "/api/products", methods: methods("POST"), guard: guardMerchantOrAdmin},
      {path: "/api/cooperations", methods: methods("GET", "PUT"), guard: guardAdminOnly},
    }
  `;

  const result = findGoRouteGuardCoverageGaps(mainSource, routeGuardSource, {
    publicExceptions: GO_ROUTE_GUARD_PUBLIC_EXCEPTIONS,
    publicExceptionPatterns: GO_ROUTE_GUARD_PUBLIC_EXCEPTION_PATTERNS,
  });
  assert.equal(result.gaps.length, 0);
  assert.equal(result.monitoredRoutes.length, 0);
});
