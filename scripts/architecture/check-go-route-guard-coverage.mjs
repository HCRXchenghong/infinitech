import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const GO_MAIN_PATH = path.join(REPO_ROOT, "backend/go/cmd/main.go");
export const GO_ROUTE_GUARD_PATH = path.join(
  REPO_ROOT,
  "backend/go/internal/middleware/route_guard.go",
);
export const GO_ROUTE_GUARD_PUBLIC_EXCEPTIONS = new Set([
  "GET /api/app-download-config",
]);
export const GO_ROUTE_GUARD_PUBLIC_EXCEPTION_PATTERNS = Object.freeze([
  /^GET \/api\/banners$/,
  /^GET \/api\/categories$/,
  /^GET \/api\/coupons\/:id$/,
  /^GET \/api\/featured-products$/,
  /^GET \/api\/points\/goods$/,
  /^GET \/api\/products(?:\/.*)?$/,
  /^GET \/api\/riders\/(?:rank-list|:id\/rating)$/,
  /^GET \/api\/shops(?:\/.*)?$/,
  /^POST \/api\/cooperations$/,
]);

function joinRoutePath(prefix = "", routePath = "") {
  const normalizedPrefix = String(prefix || "").replace(/\/+$/, "");
  const normalizedRoutePath = String(routePath || "").trim();
  if (!normalizedRoutePath) {
    return normalizedPrefix || "/";
  }
  if (!normalizedPrefix) {
    return normalizedRoutePath.startsWith("/") ? normalizedRoutePath : `/${normalizedRoutePath}`;
  }
  if (!normalizedRoutePath.startsWith("/")) {
    return `${normalizedPrefix}/${normalizedRoutePath}`;
  }
  if (normalizedRoutePath === "/") {
    return normalizedPrefix || "/";
  }
  return `${normalizedPrefix}${normalizedRoutePath}`;
}

export function extractGoGroupPrefixes(source = "") {
  const groupPrefixes = new Map([["r", ""]]);
  const groupMatcher = /(\w+)\s*:=\s*(\w+)\.Group\("([^"]*)"\)/g;
  let match = groupMatcher.exec(source);

  while (match) {
    const [, groupName, parentGroupName, groupPath] = match;
    const parentPrefix = groupPrefixes.get(parentGroupName);
    if (typeof parentPrefix === "string") {
      groupPrefixes.set(groupName, joinRoutePath(parentPrefix, groupPath));
    }
    match = groupMatcher.exec(source);
  }

  return groupPrefixes;
}

export function extractGoRoutes(source = "", options = {}) {
  const groupPrefixes = options.groupPrefixes || extractGoGroupPrefixes(source);
  const routes = [];
  const routeMatcher = /(\w+)\.(GET|POST|PUT|DELETE|PATCH)\("([^"]+)"/g;
  let match = routeMatcher.exec(source);

  while (match) {
    const [, groupName, method, routePath] = match;
    const prefix = groupPrefixes.get(groupName);
    if (typeof prefix !== "string") {
      match = routeMatcher.exec(source);
      continue;
    }
    routes.push({
      groupName,
      method,
      routePath,
      fullPath: joinRoutePath(prefix, routePath),
      signature: `${method} ${joinRoutePath(prefix, routePath)}`,
    });
    match = routeMatcher.exec(source);
  }

  return routes;
}

function extractMethods(body = "") {
  const methodsMatch = body.match(/methods:\s*methods\(([^)]*)\)/);
  if (!methodsMatch) {
    return new Set();
  }

  return new Set(
    Array.from(methodsMatch[1].matchAll(/"([^"]+)"/g), (match) =>
      String(match[1] || "").trim().toUpperCase(),
    ).filter(Boolean),
  );
}

export function extractRouteGuardRules(source = "") {
  const rules = [];
  const matcher = /{([^{}]*path:\s*"[^"]+"[^{}]*guard:\s*guard[A-Za-z][^{}]*)}/gms;
  let match = matcher.exec(source);

  while (match) {
    const body = match[1] || "";
    const pathMatch = body.match(/path:\s*"([^"]+)"/);
    if (!pathMatch) {
      match = matcher.exec(source);
      continue;
    }

    const guardMatch = body.match(/guard:\s*(guard[A-Za-z]+)/);
    rules.push({
      path: pathMatch[1],
      prefix: /prefix:\s*true/.test(body),
      methods: extractMethods(body),
      guard: guardMatch ? guardMatch[1] : "",
    });

    match = matcher.exec(source);
  }

  return rules;
}

function routeSharesRuleNamespace(route, rule) {
  return (
    route.fullPath === rule.path ||
    route.fullPath.startsWith(`${rule.path}/`) ||
    rule.path.startsWith(`${route.fullPath}/`)
  );
}

export function ruleMatchesRoute(route, rule) {
  if (rule.methods.size > 0 && !rule.methods.has(route.method)) {
    return false;
  }
  if (rule.prefix) {
    return route.fullPath === rule.path || route.fullPath.startsWith(`${rule.path}/`);
  }
  return route.fullPath === rule.path;
}

export function findGoRouteGuardCoverageGaps(mainSource = "", routeGuardSource = "", options = {}) {
  const routes = extractGoRoutes(mainSource, options);
  const rules = extractRouteGuardRules(routeGuardSource);
  const publicExceptions = options.publicExceptions || GO_ROUTE_GUARD_PUBLIC_EXCEPTIONS;
  const publicExceptionPatterns = options.publicExceptionPatterns || GO_ROUTE_GUARD_PUBLIC_EXCEPTION_PATTERNS;
  const monitoredRoutes = [];
  const gaps = [];

  for (const route of routes) {
    if (
      publicExceptions.has(route.signature) ||
      publicExceptionPatterns.some((pattern) => pattern.test(route.signature))
    ) {
      continue;
    }

    const relevantRules = rules.filter((rule) => routeSharesRuleNamespace(route, rule));
    if (relevantRules.length === 0) {
      continue;
    }

    monitoredRoutes.push(route);
    if (!relevantRules.some((rule) => ruleMatchesRoute(route, rule))) {
      gaps.push({
        ...route,
        nearbyRulePaths: relevantRules.map((rule) => {
          const methodHint = rule.methods.size > 0
            ? `[${Array.from(rule.methods).sort().join(",")}] `
            : "";
          return `${methodHint}${rule.path}${rule.prefix ? "/*" : ""}`;
        }),
      });
    }
  }

  return {
    routes,
    rules,
    monitoredRoutes,
    gaps: gaps.sort((left, right) => left.signature.localeCompare(right.signature)),
  };
}

export async function assertGoRouteGuardCoverage(options = {}) {
  const mainSource = typeof options.mainSource === "string"
    ? options.mainSource
    : await readFile(options.mainPath || GO_MAIN_PATH, "utf8");
  const routeGuardSource = typeof options.routeGuardSource === "string"
    ? options.routeGuardSource
    : await readFile(options.routeGuardPath || GO_ROUTE_GUARD_PATH, "utf8");
  const result = findGoRouteGuardCoverageGaps(mainSource, routeGuardSource, options);

  if (result.gaps.length > 0) {
    const lines = result.gaps.map(
      (gap) =>
        `- ${gap.signature} 未被 route_guard 覆盖；邻近规则: ${gap.nearbyRulePaths.join(", ")}`,
    );
    throw new Error(
      [
        "go route guard coverage gaps detected:",
        ...lines,
        "请给新路由补 route_guard 规则，或明确登记为公开例外。",
      ].join("\n"),
    );
  }

  return {
    routeCount: result.routes.length,
    monitoredRouteCount: result.monitoredRoutes.length,
    gapCount: 0,
  };
}

async function main() {
  const result = await assertGoRouteGuardCoverage();
  console.log(
    `go route guard coverage check passed (${result.monitoredRouteCount}/${result.routeCount} routes monitored)`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
