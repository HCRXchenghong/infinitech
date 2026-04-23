import test from "node:test";
import assert from "node:assert/strict";

import {
  formatRoleSettingsCacheSize,
  maskRoleSettingsPhone,
  mergeRoleSettings,
  normalizeRoleSettingsSwitchValue,
  readRoleSettingsCacheSizeSync,
  readRoleSettingsStorageEntries,
  restoreRoleSettingsStorageEntries,
} from "./role-settings-portal.js";

test("role settings helpers normalize phone labels, switches and cache sizes", () => {
  assert.equal(maskRoleSettingsPhone("13812345678"), "138****5678");
  assert.equal(maskRoleSettingsPhone("", "未绑定"), "未绑定");
  assert.deepEqual(
    mergeRoleSettings({ sound: false }, {
      notification: true,
      sound: true,
      vibrate: true,
    }),
    {
      notification: true,
      sound: false,
      vibrate: true,
    },
  );
  assert.equal(normalizeRoleSettingsSwitchValue({ detail: { value: 1 } }), true);
  assert.equal(normalizeRoleSettingsSwitchValue(null, true), true);
  assert.equal(formatRoleSettingsCacheSize(512), "512 KB");
  assert.equal(
    formatRoleSettingsCacheSize(2048, { emptyLabel: "0 MB", mbDigits: 1 }),
    "2.0 MB",
  );
});

test("role settings helpers read cache size and preserve selected storage entries", () => {
  const storage = {
    access_token: "token-1",
    empty_value: "",
    notification_settings: { sound: true },
  };
  const writes = [];
  const uniApp = {
    getStorageInfoSync() {
      return { currentSize: 1536 };
    },
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      writes.push({ key, value });
      storage[key] = value;
    },
  };

  assert.equal(readRoleSettingsCacheSizeSync(uniApp), "1.50 MB");
  assert.deepEqual(
    readRoleSettingsStorageEntries(uniApp, [
      "access_token",
      "empty_value",
      "notification_settings",
      "",
    ]),
    [
      { key: "access_token", value: "token-1" },
      { key: "notification_settings", value: { sound: true } },
    ],
  );

  restoreRoleSettingsStorageEntries(uniApp, [
    { key: "socket_token", value: "socket-1" },
    { key: "", value: "ignored" },
  ]);

  assert.deepEqual(writes, [{ key: "socket_token", value: "socket-1" }]);
});

test("role settings helpers tolerate missing storage runtime", () => {
  assert.equal(readRoleSettingsCacheSizeSync(null), "--");
  assert.deepEqual(readRoleSettingsStorageEntries(null, ["access_token"]), []);
  assert.doesNotThrow(() => restoreRoleSettingsStorageEntries(null, []));
});
