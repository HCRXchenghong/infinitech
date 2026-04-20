import { adminModuleCatalog } from "./module-catalog.js";
import { requireAdminProtectedRoute } from "./route-registry.js";

export function buildDesktopShellModel(platform = "desktop") {
  const platformTitle =
    platform === "mac"
      ? "macOS 管理端"
      : platform === "win"
        ? "Windows 管理端"
        : "桌面管理端";

  return {
    platform,
    platformTitle,
    sections: adminModuleCatalog.map((section) => ({
      ...section,
      items: section.routes
        .map((routeName) => requireAdminProtectedRoute(routeName)),
    })),
  };
}
