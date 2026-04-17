import test from "node:test";
import assert from "node:assert/strict";

import {
  createConsumerAuthRuntimeStore,
  DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS,
  normalizeConsumerAuthRuntimeSettings,
} from "./consumer-auth-runtime.js";

test("consumer auth runtime normalizes titles and wechat entry flags", () => {
  assert.deepEqual(
    normalizeConsumerAuthRuntimeSettings({
      consumer_portal_title: "  登录页标题 ",
      consumer_portal_subtitle: "  登录页副标题 ",
      consumer_portal_login_footer: "  登录页说明 ",
      wechat_login_enabled: true,
      wechat_login_entry_url: " https://example.com/auth/wechat/start ",
    }),
    {
      title: "登录页标题",
      subtitle: "登录页副标题",
      loginFooter: "登录页说明",
      wechatLoginEnabled: true,
      wechatLoginEntryUrl: "https://example.com/auth/wechat/start",
    },
  );

  assert.deepEqual(
    normalizeConsumerAuthRuntimeSettings({
      wechat_login_enabled: true,
      wechat_login_entry_url: " ",
    }),
    DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS,
  );
});

test("consumer auth runtime store caches results and supports force reload", async () => {
  const payloads = [
    {
      consumer_portal_title: "首次标题",
    },
    {
      consumer_portal_title: "刷新标题",
    },
  ];
  const calls = [];
  const store = createConsumerAuthRuntimeStore({
    async fetchRuntimeSettings() {
      calls.push(Date.now());
      return payloads.shift() || {};
    },
  });

  assert.deepEqual(
    store.getCachedConsumerAuthRuntimeSettings(),
    DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS,
  );

  assert.deepEqual(await store.loadConsumerAuthRuntimeSettings(), {
    ...DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS,
    title: "首次标题",
  });
  assert.deepEqual(await store.loadConsumerAuthRuntimeSettings(), {
    ...DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS,
    title: "首次标题",
  });
  assert.equal(calls.length, 1);

  assert.deepEqual(await store.loadConsumerAuthRuntimeSettings(true), {
    ...DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS,
    title: "刷新标题",
  });
  assert.equal(calls.length, 2);
});

test("consumer auth runtime store falls back to cached settings on fetch errors", async () => {
  const store = createConsumerAuthRuntimeStore({
    async fetchRuntimeSettings() {
      throw new Error("network failed");
    },
  });

  assert.deepEqual(
    await store.loadConsumerAuthRuntimeSettings(),
    DEFAULT_CONSUMER_AUTH_RUNTIME_SETTINGS,
  );
});
