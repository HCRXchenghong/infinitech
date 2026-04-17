import test from "node:test";
import assert from "node:assert/strict";

import {
  createPortalRuntimeStore,
  normalizePortalRuntimeSettings,
} from "./portal-runtime.js";

test("portal runtime normalization trims mapped payload fields with defaults", () => {
  const normalized = normalizePortalRuntimeSettings({
    merchant_portal_title: " 商户工作台 ",
    merchant_service_agreement: " 商户服务协议 ",
  }, {
    defaultSettings: {
      title: "默认标题",
      subtitle: "默认副标题",
      loginFooter: "默认页脚",
      serviceAgreement: "默认协议",
    },
    fieldMap: {
      title: "merchant_portal_title",
      subtitle: "merchant_portal_subtitle",
      loginFooter: "merchant_portal_login_footer",
      serviceAgreement: "merchant_service_agreement",
    },
  });

  assert.deepEqual(normalized, {
    title: "商户工作台",
    subtitle: "默认副标题",
    loginFooter: "默认页脚",
    serviceAgreement: "商户服务协议",
  });
});

test("portal runtime store caches and force refreshes", async () => {
  const payloads = [
    { rider_portal_title: "首屏标题" },
    { rider_portal_title: "刷新标题" },
  ];
  let calls = 0;
  const store = createPortalRuntimeStore({
    defaultSettings: {
      title: "骑手登录",
      subtitle: "悦享e食 · 骑手端",
      loginFooter: "默认页脚",
    },
    fieldMap: {
      title: "rider_portal_title",
      subtitle: "rider_portal_subtitle",
      loginFooter: "rider_portal_login_footer",
    },
    async fetchRuntimeSettings() {
      calls += 1;
      return payloads.shift() || {};
    },
  });

  assert.equal(store.getCachedPortalRuntimeSettings().title, "骑手登录");
  assert.equal((await store.loadPortalRuntimeSettings()).title, "首屏标题");
  assert.equal((await store.loadPortalRuntimeSettings()).title, "首屏标题");
  assert.equal(calls, 1);
  assert.equal((await store.loadPortalRuntimeSettings(true)).title, "刷新标题");
  assert.equal(calls, 2);
});

test("portal runtime store preserves defaults on fetch failure and reset", async () => {
  const store = createPortalRuntimeStore({
    defaultSettings: {
      title: "骑手登录",
      subtitle: "悦享e食 · 骑手端",
      loginFooter: "默认页脚",
    },
    fieldMap: {
      title: "rider_portal_title",
      subtitle: "rider_portal_subtitle",
      loginFooter: "rider_portal_login_footer",
    },
    async fetchRuntimeSettings() {
      throw new Error("network failed");
    },
  });

  assert.deepEqual(await store.loadPortalRuntimeSettings(), {
    title: "骑手登录",
    subtitle: "悦享e食 · 骑手端",
    loginFooter: "默认页脚",
  });

  store.resetPortalRuntimeSettings();
  assert.deepEqual(store.getCachedPortalRuntimeSettings(), {
    title: "骑手登录",
    subtitle: "悦享e食 · 骑手端",
    loginFooter: "默认页脚",
  });
});
