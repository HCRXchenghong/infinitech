import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_RIDER_SUPPORT_RUNTIME_SETTINGS,
  DEFAULT_SUPPORT_RUNTIME_SETTINGS,
  createDefaultRolePlatformRuntimeBindings,
  createDefaultRoleSupportRuntimeBindings,
  resolveRoleSupportRuntimeDefaultSettings,
} from "./role-runtime-support.js";

test("role runtime support derives rider support defaults", () => {
  let receivedOptions = null;

  createDefaultRoleSupportRuntimeBindings({
    role: "rider",
    fetchRuntimeSettings() {
      return { ok: true };
    },
    createSupportRuntimeStoreImpl(options) {
      receivedOptions = options;
      return { type: "support-store" };
    },
  });

  assert.equal(
    receivedOptions.defaultSettings.aboutSummary,
    DEFAULT_RIDER_SUPPORT_RUNTIME_SETTINGS.aboutSummary,
  );
  assert.equal(
    receivedOptions.defaultSettings.title,
    DEFAULT_SUPPORT_RUNTIME_SETTINGS.title,
  );
});

test("role runtime support merges explicit support default overrides", () => {
  assert.deepEqual(
    resolveRoleSupportRuntimeDefaultSettings("rider", {
      aboutSummary: "自定义骑手简介",
      title: "专属客服",
    }),
    {
      ...DEFAULT_RIDER_SUPPORT_RUNTIME_SETTINGS,
      aboutSummary: "自定义骑手简介",
      title: "专属客服",
    },
  );
});

test("role runtime support wires platform runtime loaders through shared fetcher fallback", async () => {
  let receivedFetcher = null;

  const loader = createDefaultRolePlatformRuntimeBindings({
    createPlatformRuntimeLoaderImpl(fetcher) {
      receivedFetcher = fetcher;
      return { type: "platform-loader" };
    },
  });

  assert.deepEqual(loader, { type: "platform-loader" });
  assert.deepEqual(await receivedFetcher(), {});
});

test("role runtime support passes explicit runtime fetchers through platform bindings", async () => {
  let receivedFetcher = null;

  createDefaultRolePlatformRuntimeBindings({
    async fetchRuntimeSettings() {
      return { rider_rank_settings: { levels: [] } };
    },
    createPlatformRuntimeLoaderImpl(fetcher) {
      receivedFetcher = fetcher;
      return { type: "platform-loader" };
    },
  });

  assert.deepEqual(await receivedFetcher(), {
    rider_rank_settings: { levels: [] },
  });
});
