import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CONSUMER_PROFILE_STORAGE_KEY,
  mergeConsumerStoredProfilePatch,
  readConsumerStoredProfile,
  replaceConsumerStoredProfile,
} from "./consumer-profile-storage.js";

test("consumer profile storage helpers normalize read and replace flows", () => {
  const storage = {};
  const uniApp = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
  };

  assert.equal(DEFAULT_CONSUMER_PROFILE_STORAGE_KEY, "userProfile");
  assert.deepEqual(readConsumerStoredProfile({ uniApp }), {});

  const nextProfile = replaceConsumerStoredProfile({
    profile: {
      id: "user-1",
      nickname: "小陈",
    },
    uniApp,
  });

  assert.deepEqual(nextProfile, {
    id: "user-1",
    nickname: "小陈",
  });
  assert.deepEqual(storage.userProfile, {
    id: "user-1",
    nickname: "小陈",
  });
});

test("consumer profile storage helpers merge patches onto cached profile snapshots", () => {
  const storage = {
    userProfile: {
      id: "user-1",
      nickname: "旧昵称",
      avatarUrl: "https://example.com/old.png",
    },
  };
  const uniApp = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
  };

  const nextProfile = mergeConsumerStoredProfilePatch({
    patch: {
      nickname: "新昵称",
      phone: "13812345678",
    },
    uniApp,
  });

  assert.deepEqual(nextProfile, {
    id: "user-1",
    nickname: "新昵称",
    avatarUrl: "https://example.com/old.png",
    phone: "13812345678",
  });
  assert.deepEqual(storage.userProfile, nextProfile);
});
