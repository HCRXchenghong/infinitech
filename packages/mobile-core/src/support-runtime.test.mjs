import test from "node:test";
import assert from "node:assert/strict";

import {
  createSupportRuntimeStore,
  DEFAULT_SUPPORT_RUNTIME_SETTINGS,
  normalizeSupportRuntimeSettings,
} from "./support-runtime.js";

test("support runtime normalizes payloads with default fallbacks", () => {
  assert.deepEqual(
    normalizeSupportRuntimeSettings({
      support_chat_title: "  在线客服 ",
      support_chat_welcome_message: "  欢迎咨询 ",
      rider_about_summary: "  骑手介绍 ",
    }, {
      aboutSummary: "默认骑手介绍",
    }),
    {
      ...DEFAULT_SUPPORT_RUNTIME_SETTINGS,
      title: "在线客服",
      welcomeMessage: "欢迎咨询",
      aboutSummary: "骑手介绍",
    },
  );
});

test("support runtime store caches results and supports force refresh", async () => {
  const payloads = [
    { support_chat_title: "首次标题" },
    { support_chat_title: "刷新标题" },
  ];
  let calls = 0;
  const store = createSupportRuntimeStore({
    async fetchRuntimeSettings() {
      calls += 1;
      return payloads.shift() || {};
    },
  });

  assert.deepEqual(
    store.getCachedSupportRuntimeSettings(),
    DEFAULT_SUPPORT_RUNTIME_SETTINGS,
  );
  assert.equal((await store.loadSupportRuntimeSettings()).title, "首次标题");
  assert.equal((await store.loadSupportRuntimeSettings()).title, "首次标题");
  assert.equal(calls, 1);
  assert.equal((await store.loadSupportRuntimeSettings(true)).title, "刷新标题");
  assert.equal(calls, 2);
});

test("support runtime store preserves overridden rider defaults on fetch failure", async () => {
  const store = createSupportRuntimeStore({
    defaultSettings: {
      aboutSummary: "骑手端默认简介",
    },
    async fetchRuntimeSettings() {
      throw new Error("network failed");
    },
  });

  assert.deepEqual(
    await store.loadSupportRuntimeSettings(),
    {
      ...DEFAULT_SUPPORT_RUNTIME_SETTINGS,
      aboutSummary: "骑手端默认简介",
    },
  );
});
