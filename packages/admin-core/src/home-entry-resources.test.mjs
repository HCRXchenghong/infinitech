import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminHomeEntryPreviewEntries,
  buildAdminHomeEntrySettingsPayload,
  canAdminHomeEntryShowImageIcon,
  createAdminHomeEntryDraft,
  createAdminHomeEntryLocalKey,
  DEFAULT_ADMIN_HOME_ENTRY_PREVIEW_CLIENT,
  getAdminHomeEntryRoutePlaceholder,
  normalizeAdminHomeEntry,
  normalizeAdminHomeEntrySettings,
  validateAdminHomeEntries,
} from "./home-entry-resources.js";

test("home entry resources normalize entry state and placeholders", () => {
  assert.equal(DEFAULT_ADMIN_HOME_ENTRY_PREVIEW_CLIENT, "user-vue");
  assert.match(createAdminHomeEntryLocalKey("food"), /^food-[a-z0-9]{8}$/);
  assert.equal(
    getAdminHomeEntryRoutePlaceholder("feature"),
    "errand / medicine / dining_buddy / charity",
  );
  assert.equal(
    getAdminHomeEntryRoutePlaceholder("category"),
    "food / groupbuy / dessert_drinks ...",
  );
  assert.equal(
    getAdminHomeEntryRoutePlaceholder("external"),
    "https://example.com",
  );
  assert.equal(
    getAdminHomeEntryRoutePlaceholder("page"),
    "/pages/activity/index",
  );
  assert.deepEqual(
    normalizeAdminHomeEntry({
      localKey: "food-fixed",
      key: " food ",
      label: " 美食 ",
      icon: "",
      icon_type: "",
      bg_color: "",
      sort_order: "20",
      enabled: 1,
      city_scopes: [" 上海 ", ""],
      client_scopes: [],
      route_type: " category ",
      route_value: " food ",
      badge_text: " HOT ",
    }),
    {
      localKey: "food-fixed",
      key: "food",
      label: "美食",
      icon: "✨",
      icon_type: "emoji",
      bg_color: "#F3F4F6",
      sort_order: 20,
      enabled: true,
      city_scopes: ["上海"],
      client_scopes: ["user-vue", "app-mobile"],
      route_type: "category",
      route_value: "food",
      badge_text: "HOT",
    },
  );
});

test("home entry resources build preview and payload semantics", () => {
  const previewEntries = buildAdminHomeEntryPreviewEntries(
    [
      {
        localKey: "page-1",
        key: "page_1",
        label: "页面1",
        enabled: true,
        client_scopes: ["app-mobile"],
        route_value: "/pages/one",
        route_type: "page",
        sort_order: 20,
      },
      {
        localKey: "page-2",
        key: "page_2",
        label: "页面2",
        enabled: true,
        client_scopes: ["user-vue"],
        route_value: "/pages/two",
        route_type: "page",
        sort_order: 10,
      },
      {
        localKey: "page-3",
        key: "page_3",
        label: "页面3",
        enabled: false,
        client_scopes: ["user-vue"],
        route_value: "/pages/three",
        route_type: "page",
        sort_order: 0,
      },
    ],
    "user-vue",
  );

  assert.deepEqual(
    previewEntries.map((item) => item.key),
    ["page_2"],
  );
  assert.equal(
    canAdminHomeEntryShowImageIcon({ icon_type: "image" }),
    true,
  );
  assert.equal(
    canAdminHomeEntryShowImageIcon({ icon_type: "emoji" }),
    false,
  );
  assert.deepEqual(
    buildAdminHomeEntrySettingsPayload([
      {
        localKey: "food-fixed",
        key: "food",
        label: "美食",
        route_type: "category",
        route_value: "food",
      },
    ]),
    {
      entries: [
        {
          key: "food",
          label: "美食",
          icon: "✨",
          icon_type: "emoji",
          bg_color: "#F3F4F6",
          sort_order: 0,
          enabled: true,
          city_scopes: [],
          client_scopes: ["user-vue", "app-mobile"],
          route_type: "category",
          route_value: "food",
          badge_text: "",
        },
      ],
    },
  );
});

test("home entry resources validate entry collections and create drafts", () => {
  const draft = createAdminHomeEntryDraft([
    { sort_order: 10 },
    { sort_order: 30 },
  ]);
  assert.equal(draft.key, "custom_3");
  assert.equal(draft.label, "新入口");
  assert.equal(draft.sort_order, 40);
  assert.match(draft.localKey, /^custom_3-[a-z0-9]{8}$/);

  const settingsState = normalizeAdminHomeEntrySettings({
    entries: [{ key: "food", route_value: "food" }],
  });
  assert.equal(settingsState.entries.length, 1);
  assert.match(settingsState.entries[0].localKey, /^food-[a-z0-9]{8}$/);
  assert.deepEqual(
    { ...settingsState.entries[0], localKey: "__dynamic__" },
    {
      localKey: "__dynamic__",
      key: "food",
      label: "",
      icon: "✨",
      icon_type: "emoji",
      bg_color: "#F3F4F6",
      sort_order: 0,
      enabled: true,
      city_scopes: [],
      client_scopes: ["user-vue", "app-mobile"],
      route_type: "page",
      route_value: "food",
      badge_text: "",
    },
  );
  assert.deepEqual(validateAdminHomeEntries([]), {
    valid: false,
    message: "至少保留一个首页入口",
  });
  assert.deepEqual(
    validateAdminHomeEntries([{ key: "", route_value: "/pages/one" }]),
    {
      valid: false,
      message: "首页入口 key 不能为空",
    },
  );
  assert.deepEqual(
    validateAdminHomeEntries([
      { key: "food", label: "美食", route_value: "/pages/food" },
      { key: "food", label: "重复", route_value: "/pages/dup" },
    ]),
    {
      valid: false,
      message: "首页入口 key 重复：food",
    },
  );
  assert.deepEqual(
    validateAdminHomeEntries([
      { key: "food", label: "", route_value: "/pages/food" },
    ]),
    {
      valid: false,
      message: "入口 food 的显示名称不能为空",
    },
  );
  assert.deepEqual(
    validateAdminHomeEntries([
      { key: "food", label: "美食", route_value: "" },
    ]),
    {
      valid: false,
      message: "入口 food 的路由值不能为空",
    },
  );
  assert.deepEqual(
    validateAdminHomeEntries([
      { key: "food", label: "美食", route_value: "/pages/food" },
    ]),
    {
      valid: true,
      message: "",
    },
  );
});
