import test from "node:test";
import assert from "node:assert/strict";

import {
  buildVIPNextThresholdText,
  createProfileVipCenterPageOptions,
  DEFAULT_VIP_CENTER_SETTINGS,
  EMPTY_VIP_LEVEL,
  formatVIPProgressPercent,
  formatVIPProgressValueText,
  mapVIPPointRewardList,
  normalizeVIPCenterSettings,
  resolveVIPLevelIndex,
  summarizeVIPBenefits,
} from "./vip-center.js";

function createPageInstance(page) {
  const instance = {
    ...page.data(),
    ...page.methods,
  };

  Object.entries(page.computed || {}).forEach(([key, getter]) => {
    Object.defineProperty(instance, key, {
      configurable: true,
      enumerable: true,
      get: getter.bind(instance),
    });
  });

  return instance;
}

async function flushPromises() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

test("vip center settings normalize defaults and nested collections", () => {
  const normalized = normalizeVIPCenterSettings({
    page_title: "  会员俱乐部 ",
    point_rules: [" 规则一 ", "规则一", "", "规则二"],
    levels: [
      {
        name: " 银卡 ",
        threshold_value: "1200",
        benefits: [{ title: " 积分加速 " }],
      },
      {
        name: " 金卡 ",
        threshold_value: "3200",
        style_class: " level-gold-plus ",
      },
    ],
    growth_tasks: [{ title: " 浏览活动 ", reward_text: " +10 " }],
  });

  assert.equal(normalized.page_title, "会员俱乐部");
  assert.deepEqual(normalized.point_rules, ["规则一", "规则二"]);
  assert.deepEqual(normalized.levels[0], {
    name: "银卡",
    style_class: "level-quality",
    tagline: "",
    threshold_label: "",
    threshold_value: 1200,
    multiplier: 1,
    is_black_gold: false,
    benefits: [
      {
        icon: "/static/icons/star.svg",
        title: "积分加速",
        desc: "",
        detail: "",
      },
    ],
  });
  assert.deepEqual(normalized.growth_tasks, [
    {
      title: "浏览活动",
      description: "",
      reward_text: "+10",
      action_label: "去完成",
    },
  ]);
});

test("vip center helpers keep reward mapping and level progress stable", () => {
  assert.deepEqual(EMPTY_VIP_LEVEL, {
    name: "",
    style_class: "level-quality",
    tagline: "",
    threshold_label: "",
    threshold_value: 1,
    multiplier: 1,
    is_black_gold: false,
    benefits: [],
  });

  assert.deepEqual(
    mapVIPPointRewardList([
      { id: 7, name: " 黑金月卡 ", points: "999", type: "vip", ship_fee: "12" },
      { name: " 保温杯 ", points: 299, shipFee: 0 },
    ]),
    [
      {
        id: 7,
        name: "黑金月卡",
        points: 999,
        shipFee: 12,
        colorClass: "gold-bg",
        emoji: "👑",
        tag: "VIP",
        desc: "",
      },
      {
        id: "reward-1",
        name: "保温杯",
        points: 299,
        shipFee: 0,
        colorClass: "blue-bg",
        emoji: "🎁",
        tag: "实物",
        desc: "",
      },
    ],
  );
  assert.equal(
    mapVIPPointRewardList([{ type: "vip", name: "黑金月卡" }], {
      vipEmoji: "VIP",
      defaultEmoji: "礼",
    })[0].emoji,
    "VIP",
  );

  const levels = normalizeVIPCenterSettings(DEFAULT_VIP_CENTER_SETTINGS).levels;
  assert.equal(resolveVIPLevelIndex(levels, 0), 0);
  assert.equal(resolveVIPLevelIndex(levels, 5000), 2);
  assert.equal(formatVIPProgressPercent(levels[1], 1500), "50.00%");
  assert.equal(formatVIPProgressValueText(levels[1], 3500), "3000/3000");
  assert.equal(buildVIPNextThresholdText(levels, 1), "下一档门槛：成长值 5000");
  assert.equal(
    buildVIPNextThresholdText(levels, levels.length - 1),
    "已达当前配置的最高会员等级",
  );
});

test("vip center benefit summary stays readable", () => {
  assert.equal(
    summarizeVIPBenefits([
      { title: "双倍积分" },
      { title: "免配送费" },
      { title: "" },
    ]),
    "双倍积分、免配送费",
  );
});

test("vip center page bootstraps shared profile, settings and rewards", async () => {
  const storage = {
    userProfile: {
      id: "user-1",
      nickname: "小陈",
      avatarUrl: "https://example.com/avatar.png",
    },
  };
  const navigateToUrls = [];
  const switchTabUrls = [];
  let navigateBackCount = 0;
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
    navigateTo({ url }) {
      navigateToUrls.push(url);
    },
    switchTab({ url }) {
      switchTabUrls.push(url);
    },
    navigateBack() {
      navigateBackCount += 1;
    },
  };

  try {
    const page = createProfileVipCenterPageOptions({
      fetchPointsBalance: async (userId) => {
        assert.equal(userId, "user-1");
        return { balance: 5200 };
      },
      fetchPointsGoods: async () => [
        { id: 7, name: "黑金月卡", points: 999, type: "vip" },
      ],
      fetchPublicVIPSettings: async () => ({
        data: {
          premium_action_text: "联系专属客服",
          standard_action_text: "立即去点餐升级",
          levels: [
            { name: "优享VIP", threshold_value: 800, benefits: [{ title: "积分" }] },
            { name: "黄金VIP", threshold_value: 3000, benefits: [{ title: "双倍积分" }] },
            { name: "尊享VIP", threshold_value: 5000, benefits: [{ title: "免配送费" }] },
            {
              name: "黑金VIP",
              threshold_value: 8000,
              is_black_gold: true,
              benefits: [{ title: "24h客服" }],
            },
          ],
          growth_tasks: [{ title: "浏览活动", reward_text: "+10" }],
        },
      }),
    });
    const instance = createPageInstance(page);

    page.onLoad.call(instance);
    await flushPromises();

    assert.equal(instance.nickname, "小陈");
    assert.equal(instance.avatarUrl, "https://example.com/avatar.png");
    assert.equal(instance.points, 5200);
    assert.equal(instance.activeTab, 2);
    assert.equal(instance.vipLevels.length, 4);
    assert.equal(instance.vipTasks.length, 1);
    assert.equal(instance.actionButtonText, "立即去点餐升级");
    assert.equal(instance.pointRewards[0]?.emoji, "VIP");
    assert.equal(storage.pointsBalance, 5200);

    instance.showRules();
    assert.equal(instance.showRulesModal, true);
    instance.closeRules();
    assert.equal(instance.showRulesModal, false);

    instance.switchTab(3);
    assert.equal(instance.activeTab, 3);
    assert.equal(instance.animateCard, false);

    instance.openBenefitDetail({ title: "24h客服" });
    assert.equal(instance.showModal, true);
    instance.closeModal();
    assert.equal(instance.showModal, false);
    assert.equal(instance.selectedBenefit, null);

    instance.goBack();
    instance.goPointsMall();
    instance.contactService();
    instance.handleTaskAction();
    instance.points = 9000;
    assert.equal(instance.actionButtonText, "联系专属客服");
    instance.handleAction();
    instance.points = 2000;
    instance.handleAction();

    assert.equal(navigateBackCount, 1);
    assert.deepEqual(navigateToUrls, [
      "/pages/profile/points-mall/index",
      "/pages/profile/customer-service/index",
      "/pages/profile/customer-service/index",
    ]);
    assert.deepEqual(switchTabUrls, [
      "/pages/index/index",
      "/pages/index/index",
    ]);
  } finally {
    globalThis.uni = originalUni;
    globalThis.setTimeout = originalSetTimeout;
  }
});
