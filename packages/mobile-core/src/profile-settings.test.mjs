import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProfileSettingsUserInfo,
  DEFAULT_PROFILE_SETTINGS,
  DEFAULT_PROFILE_SETTINGS_DETAIL,
  DEFAULT_PROFILE_SETTINGS_NAME,
  formatProfileSettingsCacheSize,
  maskProfileSettingsPhone,
  mergeProfileSettings,
  mergeProfileSettingsSnapshot,
  PROFILE_SETTINGS_STORAGE_KEY,
} from "./profile-settings.js";

test("profile settings helpers build user info and phone labels", () => {
  assert.equal(PROFILE_SETTINGS_STORAGE_KEY, "appSettings");
  assert.deepEqual(buildProfileSettingsUserInfo({ nickname: " 小陈 ", phone: "13812345678" }), {
    nickname: "小陈",
    phone: "13812345678",
  });
  assert.deepEqual(buildProfileSettingsUserInfo({}), {
    nickname: DEFAULT_PROFILE_SETTINGS_NAME,
    phone: "",
  });
  assert.equal(maskProfileSettingsPhone("13812345678"), "138****5678");
  assert.equal(maskProfileSettingsPhone(""), "未绑定");
});

test("profile settings helpers merge snapshots without dropping defaults", () => {
  assert.deepEqual(mergeProfileSettings({ sound: false }, DEFAULT_PROFILE_SETTINGS), {
    notification: true,
    sound: false,
    vibrate: true,
    location: true,
  });
  assert.deepEqual(
    mergeProfileSettingsSnapshot(
      { marketingNotice: false, location: false },
      { personalized: false },
      DEFAULT_PROFILE_SETTINGS_DETAIL,
    ),
    {
      orderNotice: true,
      marketingNotice: false,
      location: false,
      personalized: false,
    },
  );
});

test("profile settings helpers format cache sizes consistently", () => {
  assert.equal(formatProfileSettingsCacheSize(512), "512 KB");
  assert.equal(
    formatProfileSettingsCacheSize(2048, { emptyLabel: "0 MB", mbDigits: 1 }),
    "2.0 MB",
  );
  assert.equal(
    formatProfileSettingsCacheSize("bad", { emptyLabel: "0 MB" }),
    "0 MB",
  );
});
