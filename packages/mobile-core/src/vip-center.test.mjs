import test from "node:test";
import assert from "node:assert/strict";

import {
  buildVIPNextThresholdText,
  DEFAULT_VIP_CENTER_SETTINGS,
  EMPTY_VIP_LEVEL,
  formatVIPProgressPercent,
  formatVIPProgressValueText,
  mapVIPPointRewardList,
  normalizeVIPCenterSettings,
  resolveVIPLevelIndex,
  summarizeVIPBenefits,
} from "./vip-center.js";

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
