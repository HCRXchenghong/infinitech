import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_HOME_ENTRY_SETTINGS,
  buildHomeCategoriesForClient,
  createPlatformRuntimeLoader,
  findRiderRankLevel,
  isErrandServiceEnabled,
  isRuntimeRouteEnabled,
  normalizePlatformRuntimeSettings,
} from "./platform-runtime.js";

test("platform runtime normalization fills defaults and emoji images", () => {
  const normalized = normalizePlatformRuntimeSettings({
    home_entry_settings: {
      entries: [
        {
          key: "flash_sale",
          label: " 限时抢购 ",
          icon: "⚡",
          route_type: "feature",
          route_value: "flash_sale",
          client_scopes: [" user-vue "],
        },
      ],
    },
  });

  assert.equal(normalized.homeEntrySettings.entries[0].label, "限时抢购");
  assert.deepEqual(normalized.homeEntrySettings.entries[0].client_scopes, ["user-vue"]);
  assert.ok(normalized.homeEntrySettings.entries[0].image.startsWith("data:image/svg+xml"));
  assert.equal(DEFAULT_HOME_ENTRY_SETTINGS.entries[0].key, "food");
});

test("platform runtime helpers respect route, service, and client filters", () => {
  const runtime = normalizePlatformRuntimeSettings({
    home_entry_settings: {
      entries: [
        {
          key: "errand",
          label: "跑腿",
          route_type: "feature",
          route_value: "errand",
          client_scopes: ["user-vue"],
          enabled: true,
        },
        {
          key: "dining_buddy",
          label: "同频饭友",
          route_type: "feature",
          route_value: "dining_buddy",
          client_scopes: ["user-vue"],
          enabled: true,
        },
      ],
    },
    errand_settings: {
      services: [
        { key: "buy", enabled: true },
        { key: "pickup", enabled: false },
      ],
    },
    dining_buddy_settings: {
      enabled: false,
    },
  });

  assert.deepEqual(
    buildHomeCategoriesForClient(runtime, "user-vue").map((item) => item.key),
    ["errand", "dining_buddy"],
  );
  assert.equal(buildHomeCategoriesForClient(runtime, "merchant-app").length, 0);
  assert.equal(isRuntimeRouteEnabled(runtime, "feature", "errand", "user-vue"), true);
  assert.equal(isRuntimeRouteEnabled(runtime, "feature", "dining_buddy", "user-vue"), false);
  assert.equal(isErrandServiceEnabled(runtime, "buy", "user-vue"), true);
  assert.equal(isErrandServiceEnabled(runtime, "pickup", "user-vue"), false);
});

test("platform runtime loader caches responses and refreshes on demand", async () => {
  const payloads = [
    {
      rider_rank_settings: {
        levels: [
          { level: 1, name: "首档骑手" },
        ],
      },
    },
    {
      rider_rank_settings: {
        levels: [
          { level: 1, name: "刷新档位" },
        ],
      },
    },
  ];
  let calls = 0;
  const loader = createPlatformRuntimeLoader(async () => {
    calls += 1;
    return payloads.shift() || {};
  });

  assert.equal(loader.getCachedPlatformRuntimeSettings().riderRankSettings.levels[0].name, "青铜骑士");

  const first = await loader.loadPlatformRuntimeSettings();
  assert.equal(first.riderRankSettings.levels[0].name, "首档骑手");
  assert.equal((await loader.loadPlatformRuntimeSettings()).riderRankSettings.levels[0].name, "首档骑手");
  assert.equal(calls, 1);

  const refreshed = await loader.loadPlatformRuntimeSettings(true);
  assert.equal(refreshed.riderRankSettings.levels[0].name, "刷新档位");
  assert.equal(findRiderRankLevel(refreshed, 1)?.name, "刷新档位");
  assert.equal(calls, 2);
});
