import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCharityLeaderboardToShow,
  createDefaultCharitySettings,
  DEFAULT_CHARITY_SETTINGS,
  formatCharityAmount,
  normalizeCharityJoinUrl,
  normalizeCharitySettings,
} from "./charity-page.js";

test("charity page helpers create isolated defaults and normalize payloads", () => {
  const defaults = createDefaultCharitySettings();
  assert.deepEqual(defaults, DEFAULT_CHARITY_SETTINGS);
  assert.notEqual(defaults.leaderboard, DEFAULT_CHARITY_SETTINGS.leaderboard);
  assert.notEqual(defaults.news_list, DEFAULT_CHARITY_SETTINGS.news_list);

  const normalized = normalizeCharitySettings({
    enabled: 0,
    page_title: "  公益行动 ",
    hero_days_running: "18",
    fund_pool_amount: "1024.5",
    today_donation_count: "7",
    join_url: " javascript:alert(1) ",
    leaderboard: [
      { name: " Alice ", amount: "88.5", time_label: " 刚刚 " },
      { name: " ", amount: -1, time_label: "" },
    ],
    news_list: [
      {
        title: " 最新动态 ",
        summary: " 项目持续推进 ",
        source: " 运营中心 ",
        time_label: " 今天 ",
        image_url: " https://example.com/news.png ",
      },
      {},
    ],
  });

  assert.equal(normalized.enabled, false);
  assert.equal(normalized.page_title, "公益行动");
  assert.equal(normalized.hero_days_running, 18);
  assert.equal(normalized.fund_pool_amount, 1024.5);
  assert.equal(normalized.today_donation_count, 7);
  assert.equal(normalized.join_url, "");
  assert.deepEqual(normalized.leaderboard, [
    {
      name: "Alice",
      amount: 88.5,
      time_label: "刚刚",
    },
  ]);
  assert.deepEqual(normalized.news_list, [
    {
      title: "最新动态",
      summary: "项目持续推进",
      source: "运营中心",
      time_label: "今天",
      image_url: "https://example.com/news.png",
    },
  ]);
});

test("charity page helpers keep leaderboard preview and amount format stable", () => {
  const leaderboard = Array.from({ length: 7 }, (_, index) => ({
    name: `用户${index + 1}`,
    amount: index + 1,
    time_label: "最近更新",
  }));

  assert.deepEqual(
    buildCharityLeaderboardToShow(leaderboard, false, 5),
    leaderboard.slice(0, 5),
  );
  assert.deepEqual(buildCharityLeaderboardToShow(leaderboard, true, 5), leaderboard);
  assert.equal(formatCharityAmount(12345), "12,345");
  assert.equal(formatCharityAmount("not-a-number"), "0");
});

test("charity page helpers only keep safe join urls", () => {
  assert.equal(
    normalizeCharityJoinUrl(" https://example.com/charity/join "),
    "https://example.com/charity/join",
  );
  assert.equal(
    normalizeCharityJoinUrl("weixin://dl/business/?t=charity"),
    "weixin://dl/business/?t=charity",
  );
  assert.equal(normalizeCharityJoinUrl("/pages/charity/join"), "/pages/charity/join");
  assert.equal(normalizeCharityJoinUrl("javascript:alert(1)"), "");
  assert.equal(normalizeCharityJoinUrl("data:text/html,test"), "");
});
