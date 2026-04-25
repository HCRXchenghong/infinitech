import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { adminProtectedRouteRecords } from "../../packages/admin-core/src/route-registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const ADMIN_VUE_SRC_ROOT = path.join(REPO_ROOT, "admin-vue", "src");
export const ADMIN_VUE_ROUTER_PATH = path.join(ADMIN_VUE_SRC_ROOT, "router", "index.js");
export const ADMIN_CORE_ROUTE_REGISTRY_IMPORT_TOKEN = "@infinitech/admin-core/route-registry";
export const ADMIN_CORE_ADOPTION_HINT =
  "管理 Web 的菜单树、权限 catalog、共享 query builder 必须继续收敛到 packages/admin-core，admin-vue 只保留页面装配与交互壳层。";
export const ADMIN_CORE_SHARED_SYMBOLS = Object.freeze([
  "PUBLIC_API_PERMISSION_CATALOG",
  "PUBLIC_API_PERMISSION_OPTIONS",
  "buildPublicApiPayload",
  "buildPublicApiSummary",
  "buildSystemLogListQuery",
  "buildPaymentCallbackQuery",
  "buildAdminRTCCallAuditQuery",
  "buildAdminContactPhoneAuditQuery",
  "buildDiningBuddyPartyListQuery",
  "buildDiningBuddyReportListQuery",
  "buildAdminOfficialSiteSupportListQuery",
  "buildAdminOfficialSiteExposureListQuery",
  "buildAdminOfficialSiteCooperationListQuery",
  "buildAdminHomeCampaignListQuery",
  "buildAdminHomeSlotQuery",
  "createPublicApiFormState",
  "generatePublicApiKey",
  "getPublicApiPermissionLabel",
  "normalizePublicApiList",
  "normalizePublicApiPermissionList",
  "normalizePublicApiRecord",
  "resolvePublicApiPermissionSelection",
]);

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "dist",
  "node_modules",
]);

const SUPPORTED_SOURCE_EXTENSIONS = new Set([".js", ".ts", ".vue"]);

function normalizeValues(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ).sort();
}

async function collectFilesRecursively(rootDir, bucket) {
  let entries = [];
  try {
    entries = await readdir(rootDir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }
      await collectFilesRecursively(fullPath, bucket);
      continue;
    }
    if (entry.isFile() && SUPPORTED_SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      bucket.push(fullPath);
    }
  }
}

export async function collectAdminVueSourceFiles(options = {}) {
  const rootDir = path.resolve(options.rootDir || ADMIN_VUE_SRC_ROOT);
  const files = [];
  await collectFilesRecursively(rootDir, files);
  return files.sort();
}

export function extractProtectedViewRouteNames(source = "") {
  const match = String(source || "").match(/const\s+protectedViewMap\s*=\s*\{([\s\S]*?)\}\s*;?/m);
  if (!match) {
    return [];
  }
  const routeNames = Array.from(
    match[1].matchAll(/^\s*(?:"([^"]+)"|([A-Za-z0-9_-]+))\s*:/gm),
  ).map((item) => item[1] || item[2] || "");
  return normalizeValues(routeNames);
}

function hasLocalSharedDefinition(source = "", symbol = "") {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const declarationPattern = new RegExp(
    `(^|\\n)\\s*(?:export\\s+)?(?:(?:async\\s+)?function|const|let|var|class)\\s+${escaped}\\b`,
    "m",
  );
  return declarationPattern.test(String(source || ""));
}

export function findAdminCoreAdoptionViolations({
  routerSource = "",
  sourceFiles = [],
} = {}) {
  const failures = [];
  const normalizedRouterSource = String(routerSource || "");

  if (!normalizedRouterSource.includes(ADMIN_CORE_ROUTE_REGISTRY_IMPORT_TOKEN)) {
    failures.push("admin router is not importing @infinitech/admin-core/route-registry");
  }
  if (!/\badminProtectedRouteRecords\b/.test(normalizedRouterSource)) {
    failures.push("admin router must source protected routes from adminProtectedRouteRecords");
  }
  if (!/\bbuildAdminRouteMeta\b/.test(normalizedRouterSource)) {
    failures.push("admin router must keep route meta derived from buildAdminRouteMeta");
  }

  const sharedProtectedRouteNames = normalizeValues(
    adminProtectedRouteRecords.map((record) => record?.name),
  );
  const routerProtectedRouteNames = extractProtectedViewRouteNames(normalizedRouterSource);

  for (const routeName of sharedProtectedRouteNames) {
    if (!routerProtectedRouteNames.includes(routeName)) {
      failures.push(`admin router protected view map is missing shared route: ${routeName}`);
    }
  }
  for (const routeName of routerProtectedRouteNames) {
    if (!sharedProtectedRouteNames.includes(routeName)) {
      failures.push(`admin router protected view map defines extra local route: ${routeName}`);
    }
  }

  for (const file of sourceFiles) {
    const filePath = typeof file === "string" ? file : file.path;
    const source = typeof file === "string" ? "" : file.source;
    const relativePath = path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
    for (const symbol of ADMIN_CORE_SHARED_SYMBOLS) {
      if (hasLocalSharedDefinition(source, symbol)) {
        failures.push(`admin-vue locally defines shared admin-core symbol ${symbol}: ${relativePath}`);
      }
    }
  }

  return failures;
}

export async function assertAdminCoreAdoption(options = {}) {
  const routerSource = typeof options.routerSource === "string"
    ? options.routerSource
    : await readFile(options.routerPath || ADMIN_VUE_ROUTER_PATH, "utf8");
  const filePaths = Array.isArray(options.filePaths)
    ? options.filePaths.map((filePath) => path.resolve(filePath))
    : await collectAdminVueSourceFiles(options);
  const sourceFiles = Array.isArray(options.sourceFiles)
    ? options.sourceFiles
    : await Promise.all(
        filePaths
          .filter((filePath) => path.resolve(filePath) !== path.resolve(options.routerPath || ADMIN_VUE_ROUTER_PATH))
          .map(async (filePath) => ({
            path: path.resolve(filePath),
            source: await readFile(filePath, "utf8"),
          })),
      );

  const failures = findAdminCoreAdoptionViolations({
    routerSource,
    sourceFiles,
  });

  if (failures.length > 0) {
    throw new Error(
      [
        "admin-core adoption drift detected:",
        ...failures.map((failure) => `- ${failure}`),
        ADMIN_CORE_ADOPTION_HINT,
      ].join("\n"),
    );
  }

  return {
    fileCount: filePaths.length,
    protectedRouteCount: adminProtectedRouteRecords.length,
  };
}

async function main() {
  const result = await assertAdminCoreAdoption();
  console.log(
    `admin-core adoption check passed (${result.protectedRouteCount} protected routes across ${result.fileCount} admin-vue source files)`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
