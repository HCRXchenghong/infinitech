import { createApp, h } from "vue";

import DesktopShellApp from "./DesktopShellApp.vue";

function normalizePlatform(platform) {
  const normalized = String(platform || "").trim().toLowerCase();
  if (normalized === "mac" || normalized === "win") {
    return normalized;
  }
  return "desktop";
}

export function mountAdminDesktopShell(platform = "desktop", selector = "#app") {
  const resolvedSelector = String(selector || "#app").trim() || "#app";
  const resolvedPlatform = normalizePlatform(platform);

  createApp({
    name: "AdminDesktopShellRoot",
    render() {
      return h(DesktopShellApp, {
        platform: resolvedPlatform,
      });
    },
  }).mount(resolvedSelector);
}
