import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerPointsMallRedeemConfirmation,
  buildConsumerPointsMallRedeemPayload,
  canConsumerPointsMallRedeem,
  createDefaultConsumerPointsMallVipConfig,
  normalizeConsumerPointsMallBalance,
  normalizeConsumerPointsMallErrorMessage,
  normalizeConsumerPointsMallGoods,
  normalizeConsumerPointsMallRedeemResult,
  normalizeConsumerPointsMallVipSettings,
  resolveConsumerPointsMallStoredBalance,
  resolveConsumerPointsMallUserId,
} from "./profile-points-mall.js";

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
