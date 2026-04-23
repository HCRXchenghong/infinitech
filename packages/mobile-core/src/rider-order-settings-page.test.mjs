import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderOrderSettingsSavePayload,
  createRiderOrderSettingsPageLogic,
  normalizeRiderOrderSettings,
  normalizeRiderOrderSettingsDistance,
  RIDER_ORDER_SETTINGS_AUTO_ACCEPT_CONFIRM,
  RIDER_ORDER_SETTINGS_TIP,
} from "./rider-order-settings-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("rider order settings helpers normalize defaults, clamp distance and build payloads", () => {
  assert.equal(RIDER_ORDER_SETTINGS_TIP.includes("接单偏好"), true);
  assert.equal(
    RIDER_ORDER_SETTINGS_AUTO_ACCEPT_CONFIRM.title,
    "开启自动接单",
  );
  assert.deepEqual(normalizeRiderOrderSettings({}), {
    maxDistanceKm: 3,
    autoAcceptEnabled: false,
    preferRoute: true,
    preferHighPrice: true,
    preferNearby: false,
  });
  assert.equal(normalizeRiderOrderSettingsDistance(0), 3);
  assert.equal(normalizeRiderOrderSettingsDistance(25), 20);
  assert.deepEqual(
    buildRiderOrderSettingsSavePayload({
      maxDistanceKm: 6,
      autoAcceptEnabled: true,
      preferRoute: false,
      preferHighPrice: true,
      preferNearby: true,
    }),
    {
      max_distance_km: 6,
      auto_accept_enabled: true,
      prefer_route: false,
      prefer_high_price: true,
      prefer_nearby: true,
    },
  );
});

test("rider order settings page loads preferences, edits fields and saves payloads", async () => {
  const fetchCalls = [];
  const saveCalls = [];
  const toasts = [];

  const component = createRiderOrderSettingsPageLogic({
    async fetchRiderPreferences() {
      fetchCalls.push("fetch");
      return {
        data: {
          max_distance_km: 4.5,
          auto_accept_enabled: false,
          prefer_route: true,
          prefer_high_price: false,
          prefer_nearby: true,
        },
      };
    },
    async saveRiderPreferences(payload) {
      saveCalls.push(payload);
      return {
        data: {
          ...payload,
        },
      };
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      showModal() {},
    },
  });
  const page = instantiatePage(component);

  await page.loadPreferences();
  page.handleDistanceChange({ detail: { value: 18 } });
  page.handleSwitchChange("preferHighPrice", { detail: { value: true } });
  page.handleSwitchChange("preferRoute", { detail: { value: false } });
  await page.savePreferences();

  assert.deepEqual(fetchCalls, ["fetch"]);
  assert.deepEqual(saveCalls, [
    {
      max_distance_km: 18,
      auto_accept_enabled: false,
      prefer_route: false,
      prefer_high_price: true,
      prefer_nearby: true,
    },
  ]);
  assert.deepEqual(page.orderSettings, {
    maxDistanceKm: 18,
    autoAcceptEnabled: false,
    preferRoute: false,
    preferHighPrice: true,
    preferNearby: true,
  });
  assert.deepEqual(toasts, [{ title: "保存成功", icon: "success" }]);
});

test("rider order settings page confirms auto accept and reports load failures", async () => {
  const toasts = [];
  const modals = [];

  const component = createRiderOrderSettingsPageLogic({
    async fetchRiderPreferences() {
      throw new Error("加载失败");
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      showModal(payload) {
        modals.push(payload);
        payload.success({ confirm: true });
      },
    },
  });
  const page = instantiatePage(component);

  await page.loadPreferences();
  page.toggleAuto();

  assert.deepEqual(page.orderSettings, {
    maxDistanceKm: 3,
    autoAcceptEnabled: true,
    preferRoute: true,
    preferHighPrice: true,
    preferNearby: false,
  });
  assert.deepEqual(toasts, [{ title: "加载失败", icon: "none" }]);
  assert.equal(modals.length, 1);
  assert.equal(modals[0].title, "开启自动接单");
});

test("rider order settings page resets auto accept and surfaces save errors", async () => {
  const toasts = [];
  const component = createRiderOrderSettingsPageLogic({
    async saveRiderPreferences() {
      throw { error: "保存异常" };
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      showModal() {},
    },
  });
  const page = instantiatePage(component);

  page.orderSettings.autoAcceptEnabled = true;
  page.toggleAuto();
  await page.savePreferences();

  assert.equal(page.orderSettings.autoAcceptEnabled, false);
  assert.deepEqual(toasts, [{ title: "保存异常", icon: "none" }]);
});
