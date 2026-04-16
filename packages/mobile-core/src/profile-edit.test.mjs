import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerProfileAvatarText,
  buildConsumerProfileUpdatePayload,
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
