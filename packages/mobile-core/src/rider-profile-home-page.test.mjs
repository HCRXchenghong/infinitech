import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderProfileHomeIdentity,
  createRiderProfileHomePageLogic,
  DEFAULT_RIDER_PROFILE_HOME_SUPPORT_TITLE,
  normalizeRiderProfileHomeRankPayload,
  normalizeRiderProfileHomeStatsPayload,
} from "./rider-profile-home-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  if (typeof component.onLoad === "function") {
    instance.onLoad = component.onLoad.bind(instance);
  }

  if (typeof component.onShow === "function") {
    instance.onShow = component.onShow.bind(instance);
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

test("rider profile home helpers normalize auth identity, rank and stats payloads", () => {
  assert.deepEqual(
    buildRiderProfileHomeIdentity(
      {
        riderId: "1001",
        riderName: " 骑手阿强 ",
        profile: {
          avatar: " https://cdn.example.com/avatar.png ",
        },
      },
      (value, role) => `${role}-${value}`,
    ),
    {
      rawRiderId: "1001",
      riderId: "rider-1001",
      riderName: "骑手阿强",
      avatarUrl: "https://cdn.example.com/avatar.png",
    },
  );

  assert.deepEqual(
    normalizeRiderProfileHomeRankPayload({
      data: {
        level: 3,
        rating: 4.9,
        rating_count: 22,
      },
    }),
    {
      level: 3,
      rating: 4.9,
      ratingCount: 22,
    },
  );

  assert.deepEqual(
    normalizeRiderProfileHomeStatsPayload({
      data: {
        today_earnings: "88.6",
        completed_count: 12,
        online_hours: 7.5,
        on_time_rate: 98,
        performance: "优秀",
      },
    }),
    {
      todayEarnings: "88.6",
      completedCount: 12,
      onlineHours: 7.5,
      onTimeRate: 98,
      performance: "优秀",
    },
  );
});

test("rider profile home page hydrates auth, runtime, stats and guarded navigation", async () => {
  const routes = [];
  const scheduled = [];
  const riderOrderStore = {
    todayEarnings: "0",
    completedCount: 0,
    earningsLog: [{ source: "配送收入", amount: "12", time: "04-24 10:00" }],
  };

  const component = createRiderProfileHomePageLogic({
    riderOrderStore,
    getCachedSupportRuntimeSettings() {
      return {
        title: "缓存客服",
      };
    },
    async loadSupportRuntimeSettings() {
      return {
        title: "无限科技客服",
      };
    },
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
              progress_template: "累计{{totalOrders}}/300单，升级黄金骑士",
            },
          ],
        },
      };
    },
    readRiderAuthIdentity() {
      return {
        riderId: "1001",
        riderName: " 骑手阿强 ",
        profile: {
          avatar: "https://cdn.example.com/rider.png",
        },
      };
    },
    formatRoleId(value, role) {
      return `${role}-${value}`;
    },
    async getRiderRank() {
      return {
        data: {
          level: 2,
          rating: 4.8,
          rating_count: 18,
        },
      };
    },
    async fetchRiderStats() {
      return {
        data: {
          today_earnings: "66.8",
          completed_count: 9,
          online_hours: 6,
          on_time_rate: 97,
          performance: "优",
        },
      };
    },
    uniApp: {
      getSystemInfoSync() {
        return { statusBarHeight: 32 };
      },
      navigateTo({ url }) {
        routes.push(url);
      },
    },
    setTimeoutFn(callback) {
      scheduled.push(callback);
    },
  });
  const page = instantiatePage(component);

  assert.equal(page.rankName, "缓存青铜");
  assert.equal(page.supportChatTitle, "缓存客服");
  page.applySystemInfo();
  await page.initializePage();

  assert.equal(page.statusBarHeight, 32);
  assert.equal(page.avatarUrl, "https://cdn.example.com/rider.png");
  assert.equal(page.riderName, "骑手阿强");
  assert.equal(page.riderId, "rider-1001");
  assert.equal(page.riderLevel, 2);
  assert.equal(page.rankName, "远端白银");
  assert.equal(page.riderRating, 4.8);
  assert.equal(page.riderRatingCount, 18);
  assert.equal(page.onlineHours, 6);
  assert.equal(page.onTimeRate, 97);
  assert.equal(page.performance, "优");
  assert.equal(page.supportChatTitle, "无限科技客服");
  assert.equal(page.todayEarnings, "66.8");
  assert.equal(page.completedCount, 9);
  assert.deepEqual(page.earningsLog, riderOrderStore.earningsLog);

  page.changeAvatar();
  page.goToWallet();
  page.goToWallet();
  assert.deepEqual(routes, [
    "/pages/profile/avatar-upload",
    "/pages/profile/wallet",
  ]);

  scheduled[0]();
  page.goToService();
  assert.deepEqual(routes, [
    "/pages/profile/avatar-upload",
    "/pages/profile/wallet",
    "/pages/service/index",
  ]);
});

test("rider profile home page falls back cleanly when runtime and api loading fail", async () => {
  const riderOrderStore = {
    todayEarnings: "0",
    completedCount: 0,
    earningsLog: [],
  };
  const component = createRiderProfileHomePageLogic({
    riderOrderStore,
    async loadSupportRuntimeSettings() {
      throw new Error("support failed");
    },
    async loadPlatformRuntimeSettings() {
      throw new Error("platform failed");
    },
    readRiderAuthIdentity() {
      return {
        riderId: "1002",
      };
    },
    async getRiderRank() {
      throw new Error("rank failed");
    },
    async fetchRiderStats() {
      throw new Error("stats failed");
    },
  });
  const page = instantiatePage(component);
  const originalConsoleError = console.error;

  try {
    console.error = () => {};
    page.applySystemInfo();
    await page.initializePage();
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(page.rankName, "青铜骑士");
  assert.equal(page.supportChatTitle, DEFAULT_RIDER_PROFILE_HOME_SUPPORT_TITLE);
  assert.equal(page.riderLevel, 1);
  assert.equal(page.riderRating, 5);
  assert.equal(page.riderRatingCount, 0);
  assert.equal(page.onlineHours, 0);
  assert.equal(page.onTimeRate, 0);
  assert.equal(page.performance, "暂无");
  assert.equal(page.todayEarnings, "0");
  assert.equal(page.completedCount, 0);
});
