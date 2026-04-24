import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderHomeProgressPercent,
  buildRiderHomeRankConfig,
  createRiderHomePageLogic,
  DEFAULT_RIDER_HOME_ACTIVE_TAB,
  normalizeRiderHomeRankData,
  normalizeRiderHomeRankList,
  normalizeRiderHomeTab,
  renderRiderHomeProgressText,
  resolveRiderHomeCurrentRank,
} from "./rider-home-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  if (typeof component.onLoad === "function") {
    instance.onLoad = component.onLoad.bind(instance);
  }

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  for (const [name, getter] of Object.entries(component.computed || {})) {
    Object.defineProperty(instance, name, {
      get: () => getter.call(instance),
      enumerable: true,
      configurable: true,
    });
  }

  return instance;
}

test("rider home helpers normalize rank config, progress text, and rank payloads", () => {
  const rankConfig = buildRiderHomeRankConfig([
    {
      level: 2,
      name: "稳定白银",
      icon: "🥈",
      desc: "稳稳接单",
      progress_template: "累计{{totalOrders}}/300单，升级黄金骑士",
    },
    {
      level: 3,
      name: "高频黄金",
      icon: "🥇",
      desc: "冲榜模式",
      progress_template: "本周{{weekOrders}}/120单，升级钻石骑士",
    },
  ]);

  assert.equal(normalizeRiderHomeTab("WEEK"), "week");
  assert.equal(normalizeRiderHomeTab("invalid"), DEFAULT_RIDER_HOME_ACTIVE_TAB);
  assert.equal(resolveRiderHomeCurrentRank(rankConfig, 2).name, "稳定白银");
  assert.equal(
    renderRiderHomeProgressText(
      {
        level: 2,
        totalOrders: 150,
      },
      rankConfig,
    ),
    "累计150/300单，升级黄金骑士",
  );
  assert.equal(
    buildRiderHomeProgressPercent(
      {
        level: 2,
        totalOrders: 150,
      },
      rankConfig,
    ),
    50,
  );
  assert.equal(
    buildRiderHomeProgressPercent(
      {
        level: 3,
        weekOrders: 90,
      },
      rankConfig,
    ),
    75,
  );

  assert.deepEqual(
    normalizeRiderHomeRankData({
      data: {
        level: 4,
        total_orders: 560,
        week_orders: 128,
        consecutive_weeks: 3,
        rating: 4.9,
        rating_count: 26,
      },
    }),
    {
      level: 4,
      totalOrders: 560,
      weekOrders: 128,
      consecutiveWeeks: 3,
      rating: 4.9,
      ratingCount: 26,
    },
  );

  assert.deepEqual(
    normalizeRiderHomeRankList({
      data: {
        list: [
          {
            rider_id: "rider-1",
            name: "骑手阿强",
            level: 2,
            order_count: 88,
            rating: 4.8,
          },
        ],
      },
    }),
    [
      {
        id: "rider-1",
        avatar: "",
        name: "骑手阿强",
        level: 2,
        orders: 88,
        rating: 4.8,
      },
    ],
  );
});

test("rider home page loads cached runtime, remote runtime, rider data, and rank list", async () => {
  const rankListCalls = [];
  const component = createRiderHomePageLogic({
    getCachedPlatformRuntimeSettings() {
      return {
        riderRankSettings: {
          levels: [
            {
              level: 1,
              name: "缓存青铜",
              icon: "🥉",
              desc: "缓存描述",
              progress_template: "累计{{totalOrders}}/100单，升级白银骑士",
            },
          ],
        },
      };
    },
    async loadPlatformRuntimeSettings() {
      return {
        riderRankSettings: {
          levels: [
            {
              level: 1,
              name: "远端青铜",
              icon: "🥉",
              desc: "远端描述",
              progress_template: "累计{{totalOrders}}/100单，升级白银骑士",
            },
            {
              level: 2,
              name: "远端白银",
              icon: "🥈",
              desc: "稳定履约",
              progress_template: "累计{{totalOrders}}/200单，升级黄金骑士",
            },
          ],
        },
      };
    },
    async getRiderRank() {
      return {
        data: {
          level: 2,
          total_orders: 120,
          week_orders: 56,
          rating: 4.8,
          rating_count: 18,
        },
      };
    },
    async getRankList(tab) {
      rankListCalls.push(tab);
      return {
        data: {
          list: [
            {
              id: `${tab}-1`,
              name: `榜单-${tab}`,
              level: 2,
              order_count: 90,
              rating: 4.9,
            },
          ],
        },
      };
    },
  });
  const page = instantiatePage(component);

  assert.equal(page.currentRank.name, "缓存青铜");
  await page.initializePage();

  assert.equal(page.currentRank.name, "远端白银");
  assert.equal(page.progress, 60);
  assert.equal(page.progressText, "累计120/200单，升级黄金骑士");
  assert.deepEqual(page.riderData, {
    level: 2,
    totalOrders: 120,
    weekOrders: 56,
    consecutiveWeeks: 0,
    rating: 4.8,
    ratingCount: 18,
  });
  assert.deepEqual(page.rankList, [
    {
      id: "day-1",
      avatar: "",
      name: "榜单-day",
      level: 2,
      orders: 90,
      rating: 4.9,
    },
  ]);

  await page.switchTab("week");
  assert.equal(page.activeTab, "week");
  assert.equal(page.rankList[0].id, "week-1");
  assert.deepEqual(rankListCalls, ["day", "week"]);
  assert.equal(page.rankName(2), "远端白银");
});

test("rider home page falls back cleanly when runtime and rank endpoints fail", async () => {
  const component = createRiderHomePageLogic({
    async loadPlatformRuntimeSettings() {
      throw new Error("runtime failed");
    },
    async getRiderRank() {
      throw new Error("rank failed");
    },
    async getRankList() {
      throw new Error("list failed");
    },
  });
  const page = instantiatePage(component);
  const originalConsoleError = console.error;

  try {
    console.error = () => {};
    await page.initializePage();
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(page.currentRank.name, "青铜骑士");
  assert.equal(page.progress, 0);
  assert.equal(page.progressText, "累计0/100单，升级白银骑士");
  assert.deepEqual(page.rankList, []);
  assert.deepEqual(page.riderData, {
    level: 1,
    totalOrders: 0,
    weekOrders: 0,
    consecutiveWeeks: 0,
    rating: 5,
    ratingCount: 0,
  });
});
