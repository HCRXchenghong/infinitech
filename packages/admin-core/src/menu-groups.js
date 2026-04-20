import {
  ADMIN_METADATA_DUPLICATE_HINT,
  requireAdminProtectedRoute,
} from "./route-registry.js";
import { adminNavigationCatalog } from "./navigation-catalog.js";

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

function buildAdminMenuGroupsFromNavigation(catalog = adminNavigationCatalog) {
  return catalog.map((group) => ({
    id: group.id,
    name: group.name,
    sections: (group.sections || []).map((menuSection) => ({
      id: menuSection.id,
      name: menuSection.name,
      routes: (menuSection.items || []).map((item) => item.route),
    })),
  }));
}

export const adminMenuGroups = Object.freeze(
  validateAdminMenuGroups(buildAdminMenuGroupsFromNavigation()).map((group) =>
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
