import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerPointsMallRedeemConfirmation,
  buildConsumerPointsMallRedeemPayload,
  canConsumerPointsMallRedeem,
  createProfilePointsMallPage,
  createDefaultConsumerPointsMallVipConfig,
  normalizeConsumerPointsMallBalance,
  normalizeConsumerPointsMallErrorMessage,
  normalizeConsumerPointsMallGoods,
  normalizeConsumerPointsMallRedeemResult,
  normalizeConsumerPointsMallVipSettings,
  resolveConsumerPointsMallStoredBalance,
  resolveConsumerPointsMallUserId,
} from "./profile-points-mall.js";

async function flushPromises() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

test("profile points mall helpers normalize identity and settings", () => {
  assert.equal(
    resolveConsumerPointsMallUserId({ userId: "user-1" }),
    "user-1",
  );
  assert.equal(resolveConsumerPointsMallStoredBalance("18"), 18);
  assert.equal(
    createDefaultConsumerPointsMallVipConfig().points_section_title,
    "积分好礼",
  );
  assert.deepEqual(
    normalizeConsumerPointsMallVipSettings({
      data: {
        point_rules: [" 规则一 ", "规则一", "规则二"],
      },
    }).point_rules,
    ["规则一", "规则二"],
  );
});

test("profile points mall helpers normalize goods, balance and redeem flow", () => {
  assert.equal(
    normalizeConsumerPointsMallBalance({ data: { balance: "66" } }, 5),
    66,
  );
  assert.deepEqual(
    normalizeConsumerPointsMallGoods({
      data: {
        list: [{ id: 7, name: " 黑金月卡 ", points: "999", type: "vip" }],
      },
    }),
    [
      {
        id: 7,
        name: "黑金月卡",
        points: 999,
        shipFee: 0,
        colorClass: "gold-bg",
        emoji: "👑",
        tag: "VIP",
        desc: "",
      },
    ],
  );
  assert.equal(
    buildConsumerPointsMallRedeemConfirmation({ name: "月卡", points: "299" }),
    "确认使用 299 积分兑换「月卡」吗？",
  );
  assert.deepEqual(
    buildConsumerPointsMallRedeemPayload({
      profile: { id: "user-1", phone: "13800000000" },
      item: { id: 88 },
    }),
    {
      userId: "user-1",
      phone: "13800000000",
      goodId: 88,
    },
  );
  assert.equal(canConsumerPointsMallRedeem(300, { points: 299 }), true);
  assert.deepEqual(
    normalizeConsumerPointsMallRedeemResult(
      { data: { success: true, balance: 12 } },
      80,
    ),
    {
      success: true,
      balance: 12,
      errorMessage: "兑换失败",
    },
  );
});

test("profile points mall helpers normalize errors", () => {
  assert.equal(
    normalizeConsumerPointsMallErrorMessage(
      { response: { data: { error: "积分商品读取失败" } } },
      "fallback",
    ),
    "积分商品读取失败",
  );
});

test("profile points mall page loads shared data and completes exchange flow", async () => {
  const storage = {
    userProfile: {
      id: "user-1",
      phone: "13800000000",
    },
    pointsBalance: "18",
  };
  const toasts = [];
  const loadingStates = [];
  const redeemPayloads = [];
  let navigateBackCount = 0;
  let modalPromise = Promise.resolve();
  const originalUni = globalThis.uni;

  globalThis.uni = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    showToast(payload) {
      toasts.push(payload);
    },
    showLoading(payload) {
      loadingStates.push(`show:${payload.title}`);
    },
    hideLoading() {
      loadingStates.push("hide");
    },
    showModal(options) {
      modalPromise = Promise.resolve(options.success?.({ confirm: true }));
    },
    navigateBack() {
      navigateBackCount += 1;
    },
  };

  try {
    const page = createProfilePointsMallPage({
      fetchPointsBalance: async (userId) => {
        assert.equal(userId, "user-1");
        return { balance: 88 };
      },
      fetchPointsGoods: async () => ({
        data: {
          list: [{ id: 8, name: " 黑金月卡 ", points: 20, type: "vip" }],
        },
      }),
      redeemPoints: async (payload) => {
        redeemPayloads.push(payload);
        return { success: true, balance: 68 };
      },
      fetchPublicVIPSettings: async () => ({
        data: {
          points_section_title: "积分豪礼",
        },
      }),
    });
    const instance = {
      ...page.data(),
      ...page.methods,
    };

    page.onLoad.call(instance);
    await flushPromises();

    assert.equal(instance.points, 88);
    assert.equal(instance.goods.length, 1);
    assert.equal(instance.goods[0].tag, "VIP");
    assert.equal(instance.vipConfig.points_section_title, "积分豪礼");
    assert.equal(storage.pointsBalance, 88);

    instance.goBack();
    assert.equal(navigateBackCount, 1);

    instance.exchange(instance.goods[0]);
    await modalPromise;
    await flushPromises();

    assert.deepEqual(redeemPayloads, [
      {
        userId: "user-1",
        phone: "13800000000",
        goodId: 8,
      },
    ]);
    assert.equal(instance.points, 68);
    assert.equal(storage.pointsBalance, 68);
    assert.deepEqual(loadingStates, ["show:兑换中...", "hide"]);
    assert.equal(toasts.at(-1)?.title, "兑换成功");
  } finally {
    globalThis.uni = originalUni;
  }
});
