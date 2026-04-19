import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_MERCHANT_PORTAL_RUNTIME_FIELD_MAP,
  DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS,
  DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS,
  createDefaultRolePortalRuntimeBindings,
  resolveRolePortalRuntimeDefaultSettings,
  resolveRolePortalRuntimeFieldMap,
} from "./role-portal-runtime-shell.js";

test("role portal runtime shell exposes stable role defaults", () => {
  assert.deepEqual(
    resolveRolePortalRuntimeDefaultSettings("merchant"),
    DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS,
  );
  assert.deepEqual(
    resolveRolePortalRuntimeDefaultSettings("rider"),
    DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS,
  );
});

test("role portal runtime shell merges explicit defaults and field maps", () => {
  assert.deepEqual(
    resolveRolePortalRuntimeDefaultSettings("rider", {
      loginFooter: "自定义页脚",
    }),
    {
      ...DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS,
      loginFooter: "自定义页脚",
    },
  );
  assert.deepEqual(
    resolveRolePortalRuntimeFieldMap("merchant", {
      subtitle: ["merchant_portal_subtitle", "merchant_subtitle"],
    }),
    {
      ...DEFAULT_MERCHANT_PORTAL_RUNTIME_FIELD_MAP,
      subtitle: ["merchant_portal_subtitle", "merchant_subtitle"],
    },
  );
});

test("role portal runtime shell wires shared store creation", () => {
  let receivedOptions = null;

  const store = createDefaultRolePortalRuntimeBindings({
    role: "merchant",
    async fetchRuntimeSettings() {
      return { merchant_portal_title: "商户中心" };
    },
    createPortalRuntimeStoreImpl(options) {
      receivedOptions = options;
      return { type: "portal-runtime-store" };
    },
  });

  assert.deepEqual(store, { type: "portal-runtime-store" });
  assert.deepEqual(
    receivedOptions.defaultSettings,
    DEFAULT_MERCHANT_PORTAL_RUNTIME_SETTINGS,
  );
  assert.deepEqual(
    receivedOptions.fieldMap,
    DEFAULT_MERCHANT_PORTAL_RUNTIME_FIELD_MAP,
  );
});
