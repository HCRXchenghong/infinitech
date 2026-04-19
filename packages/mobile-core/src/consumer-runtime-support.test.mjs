import test from "node:test";
import assert from "node:assert/strict";

import {
  createConsumerLegalRuntimeBindings,
  createConsumerPlatformRuntimeBindings,
  createConsumerRTCRuntimeBindings,
  createConsumerSupportRuntimeBindings,
  ensureConsumerRuntimeFeatureOpen,
} from "./consumer-runtime-support.js";

test("consumer runtime support factories compose shared loaders consistently", async () => {
  const platformRuntime = createConsumerPlatformRuntimeBindings(async () => ({
    home_entry_settings: {
      entries: [
        {
          key: "custom_feature",
          label: "自定义能力",
          enabled: true,
          client_scopes: ["user-vue"],
          route_type: "feature",
          route_value: "custom_feature",
        },
      ],
    },
  }));
  const supportRuntime = createConsumerSupportRuntimeBindings(async () => ({
    support_chat_title: "统一客服",
  }));
  const legalRuntime = createConsumerLegalRuntimeBindings(async () => ({
    consumer_about_summary: "统一平台简介",
  }));
  const rtcRuntime = createConsumerRTCRuntimeBindings(async () => ({
    rtc_timeout_seconds: 45,
  }));

  assert.equal(
    (await platformRuntime.loadPlatformRuntimeSettings()).homeEntrySettings.entries[0].key,
    "custom_feature",
  );
  assert.equal((await supportRuntime.loadSupportRuntimeSettings()).title, "统一客服");
  assert.equal((await legalRuntime.loadLegalRuntimeSettings()).aboutSummary, "统一平台简介");
  assert.equal((await rtcRuntime.loadRTCRuntimeSettings()).timeoutSeconds, 45);
});

test("consumer runtime support blocks closed features and falls back to home tab", async () => {
  const events = [];

  const enabled = await ensureConsumerRuntimeFeatureOpen("charity", {
    clientScope: "user-vue",
    async loadPlatformRuntimeSettings() {
      return { runtime: "mock" };
    },
    isRuntimeRouteEnabled() {
      return false;
    },
    navigationDelayMs: 0,
    setTimeoutImpl(handler) {
      handler();
      return 0;
    },
    uniApp: {
      showToast(payload) {
        events.push(["toast", payload.title]);
      },
      navigateBack({ fail }) {
        events.push(["navigateBack"]);
        fail();
      },
      switchTab({ url }) {
        events.push(["switchTab", url]);
      },
    },
  });

  assert.equal(enabled, false);
  assert.deepEqual(events, [
    ["toast", "当前服务暂未开放"],
    ["navigateBack"],
    ["switchTab", "/pages/index/index"],
  ]);
});

test("consumer runtime support keeps enabled features on the current page", async () => {
  const events = [];

  const enabled = await ensureConsumerRuntimeFeatureOpen("medicine", {
    async loadPlatformRuntimeSettings() {
      return { runtime: "mock" };
    },
    isRuntimeRouteEnabled() {
      return true;
    },
    setTimeoutImpl() {
      events.push(["timeout"]);
      return 0;
    },
    uniApp: {
      showToast() {
        events.push(["toast"]);
      },
    },
  });

  assert.equal(enabled, true);
  assert.deepEqual(events, []);
});
