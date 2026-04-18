import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerProfileHeaderStyle,
  createProfileHomePage,
  createDefaultProfileHomeMoreEntries,
  createDefaultProfileHomeTools,
  DEFAULT_CONSUMER_PROFILE_NAME,
  extractConsumerProfilePayload,
  formatConsumerProfileSavedAmount,
  maskConsumerProfilePhone,
  normalizeConsumerProfileViewModel,
  resolveConsumerProfileUserId,
} from "./profile-home.js";

test("profile home helpers normalize phone, amount and header style", () => {
  assert.equal(maskConsumerProfilePhone("13812345678"), "138****5678");
  assert.equal(maskConsumerProfilePhone(""), "点击绑定手机号");
  assert.equal(formatConsumerProfileSavedAmount("18.6"), "¥18.60");
  assert.deepEqual(buildConsumerProfileHeaderStyle(""), {});
  assert.deepEqual(buildConsumerProfileHeaderStyle("linear-gradient(90deg, #fff, #000)"), {
    background: "linear-gradient(90deg, #fff, #000)",
  });
  assert.deepEqual(buildConsumerProfileHeaderStyle("https://example.com/bg.png"), {
    backgroundImage: "url(https://example.com/bg.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
  });
});

test("profile home helpers create isolated defaults and extract payloads", () => {
  const tools = createDefaultProfileHomeTools();
  const entries = createDefaultProfileHomeMoreEntries();
  assert.equal(Array.isArray(tools), true);
  assert.equal(Array.isArray(entries), true);
  assert.notEqual(tools[0], createDefaultProfileHomeTools()[0]);
  assert.notEqual(entries[0], createDefaultProfileHomeMoreEntries()[0]);
  assert.deepEqual(extractConsumerProfilePayload({ user: { id: 7 } }), { id: 7 });
  assert.deepEqual(extractConsumerProfilePayload({ id: 9 }), { id: 9 });
  assert.deepEqual(extractConsumerProfilePayload(null), {});
  assert.equal(resolveConsumerProfileUserId({ id: " 12 " }), "12");
  assert.equal(resolveConsumerProfileUserId({ userId: " A-1 " }), "A-1");
});

test("profile home helpers normalize profile view models without forcing vip badges", () => {
  assert.deepEqual(normalizeConsumerProfileViewModel({}, {}), {
    nickname: DEFAULT_CONSUMER_PROFILE_NAME,
    avatarUrl: "",
    phone: "",
    headerBg: "",
    savedAmount: 0,
    vipLabel: "SVIP",
    isVip: false,
  });
  assert.deepEqual(
    normalizeConsumerProfileViewModel(
      {
        nickname: " 小陈 ",
        avatarUrl: " https://example.com/avatar.png ",
        phone: "13812345678",
        headerBg: " https://example.com/bg.png ",
        monthlySavedAmount: "28.4",
        membershipName: " 黑金会员 ",
      },
      { isVip: false },
    ),
    {
      nickname: "小陈",
      avatarUrl: "https://example.com/avatar.png",
      phone: "13812345678",
      headerBg: "https://example.com/bg.png",
      savedAmount: 28.4,
      vipLabel: "黑金会员",
      isVip: true,
    },
  );
});

test("profile home page bootstraps remote profile and syncs local cache", async () => {
  const storage = {
    authMode: "user",
    userProfile: {
      id: "user-1",
      nickname: "本地昵称",
    },
  };
  const navigation = [];
  const originalUni = globalThis.uni;

  globalThis.uni = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    reLaunch({ url }) {
      navigation.push(`relaunch:${url}`);
    },
    navigateTo({ url }) {
      navigation.push(url);
    },
  };

  try {
    const page = createProfileHomePage({
      fetchUser: async (userId) => ({
        user: {
          id: userId,
          nickname: "远端昵称",
          phone: "13812345678",
          savedAmount: 19.8,
        },
      }),
    });
    const instance = {
      ...page.data(),
      ...page.methods,
    };

    await instance.bootstrap();
    instance.go("/pages/profile/edit/index");

    assert.equal(instance.nickname, "远端昵称");
    assert.equal(instance.phone, "13812345678");
    assert.equal(instance.savedAmount, 19.8);
    assert.equal(storage.userProfile.nickname, "远端昵称");
    assert.deepEqual(navigation, ["/pages/profile/edit/index"]);
  } finally {
    globalThis.uni = originalUni;
  }
});
