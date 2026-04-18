import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerProfileAvatarText,
  buildConsumerProfileUpdatePayload,
  createProfileEditPage,
  createDefaultProfileEditPresetBackgrounds,
  DEFAULT_CONSUMER_PROFILE_NAME,
  extractConsumerUploadedImageUrl,
  normalizeConsumerProfileEditErrorMessage,
  normalizeConsumerProfileEditViewModel,
} from "./profile-edit.js";

test("profile edit helpers create isolated presets and avatar labels", () => {
  const presets = createDefaultProfileEditPresetBackgrounds();
  assert.equal(Array.isArray(presets), true);
  assert.notEqual(presets[0], createDefaultProfileEditPresetBackgrounds()[0]);
  assert.equal(buildConsumerProfileAvatarText(" 小陈 "), "小");
  assert.equal(buildConsumerProfileAvatarText(""), "U");
});

test("profile edit helpers normalize view model and update payloads", () => {
  assert.deepEqual(normalizeConsumerProfileEditViewModel({}, {}), {
    nickname: DEFAULT_CONSUMER_PROFILE_NAME,
    avatarUrl: "",
    headerBg: "",
  });
  assert.deepEqual(
    normalizeConsumerProfileEditViewModel(
      {
        nickname: " 小陈 ",
        avatarUrl: " https://example.com/avatar.png ",
        headerBg: " https://example.com/bg.png ",
      },
      {},
    ),
    {
      nickname: "小陈",
      avatarUrl: "https://example.com/avatar.png",
      headerBg: "https://example.com/bg.png",
    },
  );
  assert.deepEqual(
    buildConsumerProfileUpdatePayload({
      nickname: " 小陈 ",
      avatarUrl: " https://example.com/avatar.png ",
      headerBg: "",
    }),
    {
      nickname: "小陈",
      avatarUrl: "https://example.com/avatar.png",
      headerBg: "",
    },
  );
  assert.deepEqual(buildConsumerProfileUpdatePayload({ nickname: " " }), {
    nickname: "",
    avatarUrl: "",
    headerBg: "",
  });
});

test("profile edit helpers read uploaded asset urls and normalize errors", () => {
  assert.equal(
    extractConsumerUploadedImageUrl({
      data: {
        asset_url: "/uploads/avatar.png",
      },
    }),
    "/uploads/avatar.png",
  );
  assert.equal(
    extractConsumerUploadedImageUrl({
      url: "https://example.com/avatar.png",
    }),
    "https://example.com/avatar.png",
  );
  assert.equal(
    normalizeConsumerProfileEditErrorMessage({ error: "资料保存失败" }),
    "资料保存失败",
  );
  assert.equal(normalizeConsumerProfileEditErrorMessage({}), "保存失败");
});

test("profile edit page saves merged profile snapshots", async () => {
  const storage = {
    userProfile: {
      id: "user-1",
      nickname: "本地昵称",
      avatarUrl: "https://example.com/local.png",
    },
  };
  let navigatedBack = 0;
  const originalUni = globalThis.uni;
  const originalSetTimeout = globalThis.setTimeout;

  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };
  globalThis.uni = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    showToast() {},
    showLoading() {},
    hideLoading() {},
    navigateBack() {
      navigatedBack += 1;
    },
  };

  try {
    const page = createProfileEditPage({
      fetchUser: async () => ({
        user: {
          id: "user-1",
          nickname: "远端昵称",
          avatarUrl: "https://example.com/remote.png",
        },
      }),
      updateUserProfile: async (_userId, payload) => ({
        user: payload,
      }),
    });
    const instance = {
      ...page.data(),
      ...page.methods,
    };

    await instance.loadProfile();
    instance.nickname = "新昵称";
    instance.avatarUrl = "https://example.com/new-avatar.png";
    await instance.save();

    assert.equal(instance.nickname, "新昵称");
    assert.equal(storage.userProfile.nickname, "新昵称");
    assert.equal(storage.userProfile.avatarUrl, "https://example.com/new-avatar.png");
    assert.equal(navigatedBack, 1);
  } finally {
    globalThis.uni = originalUni;
    globalThis.setTimeout = originalSetTimeout;
  }
});
