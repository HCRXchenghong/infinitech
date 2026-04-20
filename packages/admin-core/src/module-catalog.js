import {
  ADMIN_METADATA_DUPLICATE_HINT,
  requireAdminProtectedRoute,
} from "./route-registry.js";
import { adminNavigationCatalog, adminNavigationModules } from "./navigation-catalog.js";

function normalizeText(value) {
  return String(value == null ? "" : value).trim();
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

function freezeRouteList(routes = []) {
  return Object.freeze([...routes]);
}

function buildAdminModuleCatalogFromNavigation(catalog = adminNavigationCatalog) {
  const buckets = new Map(
    adminNavigationModules.map((module) => [
      module.key,
      { key: module.key, title: module.title, routes: [] },
    ]),
  );

  for (const group of catalog) {
    for (const section of group.sections || []) {
      for (const item of section.items || []) {
        const moduleKey = normalizeText(item?.moduleKey);
        if (!moduleKey) {
          continue;
        }
        const bucket = buckets.get(moduleKey);
        if (!bucket) {
          throw new Error(
            `admin module route is assigned to unknown module: ${moduleKey} <- ${item.route}`,
          );
        }
        bucket.routes.push(item.route);
      }
    }
  }

  return adminNavigationModules
    .map((module) => buckets.get(module.key))
    .filter((bucket) => Array.isArray(bucket?.routes) && bucket.routes.length > 0);
}

export const adminModuleCatalog = Object.freeze(
  validateAdminModuleCatalog(buildAdminModuleCatalogFromNavigation()).map((section) =>
    Object.freeze({
      ...section,
      routes: freezeRouteList(section.routes),
    }),
  ),
);
