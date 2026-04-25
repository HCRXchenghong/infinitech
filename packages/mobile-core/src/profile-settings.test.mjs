import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProfileSettingsUserInfo,
  createProfileSettingsDetailPage,
  createProfileSettingsPage,
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

test("profile settings pages persist toggles and legal runtime summaries", async () => {
  const storage = {
    userProfile: {
      nickname: "小陈",
      phone: "13812345678",
    },
    [PROFILE_SETTINGS_STORAGE_KEY]: {
      sound: false,
      marketingNotice: false,
    },
  };
  const routes = [];
  const originalUni = globalThis.uni;

  globalThis.uni = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    navigateTo({ url }) {
      routes.push(url);
    },
    getStorageInfo({ success }) {
      success({ currentSize: 2048 });
    },
    getStorageInfoSync() {
      return { currentSize: 2048 };
    },
    showModal() {},
    showToast() {},
    navigateBack() {},
  };

  try {
    const page = createProfileSettingsPage({
      getCachedLegalRuntimeSettings: () => ({ aboutSummary: "缓存关于" }),
      loadLegalRuntimeSettings: async () => ({
        aboutSummary: "远端关于",
        privacyPolicySummary: "远端隐私",
        userAgreementSummary: "远端协议",
      }),
      getAppVersionLabel: () => "1.0.2",
      clearAllCache: () => {},
      forceLogout: () => {},
    });
    const instance = {
      ...page.data(),
      ...page.methods,
    };

    await instance.loadLegalRuntimeConfig();
    instance.loadSettings();
    instance.toggleSetting("sound", { detail: { value: true } });
    instance.calculateCacheSize();
    instance.goToPage("/pages/profile/settings/detail/index");

    assert.equal(instance.aboutSummary, "远端关于");
    assert.equal(instance.cacheSize, "2.00 MB");
    assert.equal(storage[PROFILE_SETTINGS_STORAGE_KEY].sound, true);
    assert.deepEqual(routes, ["/pages/profile/settings/detail/index"]);

    const detailPage = createProfileSettingsDetailPage({
      getCachedLegalRuntimeSettings: () => ({}),
      loadLegalRuntimeSettings: async () => ({}),
      getAppVersionLabel: () => "1.0.2",
      clearAllCache: () => {},
      forceLogout: () => {},
    });
    const detailInstance = {
      ...detailPage.data(),
      ...detailPage.methods,
      settings: {
        orderNotice: false,
        personalized: false,
      },
    };

    detailInstance.saveSettings();
    detailInstance.calculateCacheSize();

    assert.equal(storage[PROFILE_SETTINGS_STORAGE_KEY].personalized, false);
    assert.equal(detailInstance.cacheSize, "2.0 MB");
  } finally {
    globalThis.uni = originalUni;
  }
});
