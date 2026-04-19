import test from "node:test";
import assert from "node:assert/strict";

import {
  createConsumerLegalRuntimeStore,
  DEFAULT_CONSUMER_LEGAL_RUNTIME_SETTINGS,
  normalizeConsumerLegalRuntimeSettings,
} from "./consumer-legal-runtime.js";

test("consumer legal runtime normalizes payloads with default fallbacks", () => {
  assert.deepEqual(
    normalizeConsumerLegalRuntimeSettings({
      consumer_about_summary: "  平台简介  ",
      consumer_privacy_policy: "  隐私摘要  ",
    }),
    {
      ...DEFAULT_CONSUMER_LEGAL_RUNTIME_SETTINGS,
      aboutSummary: "平台简介",
      privacyPolicySummary: "隐私摘要",
    },
  );
});

test("consumer legal runtime store caches values and supports force refresh", async () => {
  const payloads = [
    {
      consumer_about_summary: "首次简介",
    },
    {
      consumer_about_summary: "刷新简介",
      consumer_user_agreement: "新版协议",
    },
  ];
  let calls = 0;
  const store = createConsumerLegalRuntimeStore({
    async fetchRuntimeSettings() {
      calls += 1;
      return payloads.shift() || {};
    },
  });

  assert.deepEqual(
    store.getCachedLegalRuntimeSettings(),
    DEFAULT_CONSUMER_LEGAL_RUNTIME_SETTINGS,
  );
  assert.equal((await store.loadLegalRuntimeSettings()).aboutSummary, "首次简介");
  assert.equal((await store.loadLegalRuntimeSettings()).aboutSummary, "首次简介");
  assert.equal(calls, 1);
  assert.equal((await store.loadLegalRuntimeSettings(true)).aboutSummary, "刷新简介");
  assert.equal(calls, 2);
});

test("consumer legal runtime store resets to overridden defaults after failures", async () => {
  const store = createConsumerLegalRuntimeStore({
    defaultSettings: {
      aboutSummary: "默认平台简介",
    },
    async fetchRuntimeSettings() {
      throw new Error("network failed");
    },
  });

  assert.deepEqual(await store.loadLegalRuntimeSettings(), {
    ...DEFAULT_CONSUMER_LEGAL_RUNTIME_SETTINGS,
    aboutSummary: "默认平台简介",
  });

  store.resetLegalRuntimeSettings();
  assert.deepEqual(store.getCachedLegalRuntimeSettings(), {
    ...DEFAULT_CONSUMER_LEGAL_RUNTIME_SETTINGS,
    aboutSummary: "默认平台简介",
  });
});
