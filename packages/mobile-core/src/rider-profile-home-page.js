import { extractEnvelopeData } from "../../contracts/src/http.js";
import {
  buildRiderHomeRankConfig,
  resolveRiderHomeCurrentRank,
} from "./rider-home-page.js";

function trimRiderProfileHomeValue(value) {
  return String(value == null ? "" : value).trim();
}

function toRiderProfileHomeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeRiderProfileHomeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function resolveRiderProfileHomeUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveRiderProfileHomeTimeout(setTimeoutFn, callback, delay) {
  if (typeof setTimeoutFn === "function") {
    setTimeoutFn(callback, delay);
    return;
  }

  if (typeof globalThis.setTimeout === "function") {
    globalThis.setTimeout(callback, delay);
    return;
  }

  callback();
}

function readRiderProfileHomeEnvelopeValue(payload) {
  const extracted = extractEnvelopeData(payload);
  const source = normalizeRiderProfileHomeObject(extracted);
  if (Object.keys(source).length > 0) {
    return source;
  }

  const root = normalizeRiderProfileHomeObject(payload);
  const data = normalizeRiderProfileHomeObject(root.data);
  return Object.keys(data).length > 0 ? data : root;
}

function readRiderProfileHomeCachedSupportRuntime(
  getCachedSupportRuntimeSettings,
) {
  if (typeof getCachedSupportRuntimeSettings !== "function") {
    return {};
  }

  const runtime = getCachedSupportRuntimeSettings();
  return normalizeRiderProfileHomeObject(runtime);
}

function readRiderProfileHomeCachedPlatformLevels(
  getCachedPlatformRuntimeSettings,
) {
  if (typeof getCachedPlatformRuntimeSettings !== "function") {
    return [];
  }

  const runtime = normalizeRiderProfileHomeObject(
    getCachedPlatformRuntimeSettings(),
  );
  return Array.isArray(runtime?.riderRankSettings?.levels)
    ? runtime.riderRankSettings.levels.slice()
    : [];
}

function buildRiderProfileHomeDefaultStats() {
  return {
    todayEarnings: "0",
    completedCount: 0,
    onlineHours: 0,
    onTimeRate: 0,
    performance: DEFAULT_RIDER_PROFILE_HOME_PERFORMANCE,
  };
}

function buildRiderProfileHomeRankName(rankLevels = [], level = 1) {
  return resolveRiderHomeCurrentRank(
    buildRiderHomeRankConfig(rankLevels),
    toRiderProfileHomeNumber(level, 1),
  ).name;
}

export const DEFAULT_RIDER_PROFILE_HOME_AVATAR = "/static/images/logo.png";
export const DEFAULT_RIDER_PROFILE_HOME_NAME = "骑手";
export const DEFAULT_RIDER_PROFILE_HOME_SUPPORT_TITLE = "平台客服";
export const DEFAULT_RIDER_PROFILE_HOME_PERFORMANCE = "暂无";
export const DEFAULT_RIDER_PROFILE_HOME_CHART_DATA = Object.freeze([
  16,
  32,
  64,
  96,
  48,
  24,
  40,
  72,
]);
export const DEFAULT_RIDER_PROFILE_HOME_STATS = Object.freeze(
  buildRiderProfileHomeDefaultStats(),
);
export const DEFAULT_RIDER_PROFILE_HOME_ROUTES = Object.freeze({
  avatar: "/pages/profile/avatar-upload",
  profile: "/pages/profile/personal-info",
  wallet: "/pages/profile/wallet",
  riderHome: "/pages/profile/rider-home",
  earnings: "/pages/profile/earnings",
  history: "/pages/profile/history",
  appeal: "/pages/profile/appeal",
  service: "/pages/service/index",
  settings: "/pages/profile/settings",
});

export function normalizeRiderProfileHomeRankPayload(payload = {}) {
  const value = readRiderProfileHomeEnvelopeValue(payload);
  return {
    level: toRiderProfileHomeNumber(value.level, 1),
    rating: toRiderProfileHomeNumber(value.rating, 5),
    ratingCount: toRiderProfileHomeNumber(
      value.ratingCount ?? value.rating_count,
      0,
    ),
  };
}

export function normalizeRiderProfileHomeStatsPayload(payload = {}) {
  const value = readRiderProfileHomeEnvelopeValue(payload);
  return {
    todayEarnings:
      trimRiderProfileHomeValue(
        value.todayEarnings ?? value.today_earnings ?? "0",
      ) || "0",
    completedCount: toRiderProfileHomeNumber(
      value.completedCount ?? value.completed_count,
      0,
    ),
    onlineHours: toRiderProfileHomeNumber(
      value.onlineHours ?? value.online_hours,
      0,
    ),
    onTimeRate: toRiderProfileHomeNumber(
      value.onTimeRate ?? value.on_time_rate,
      0,
    ),
    performance:
      trimRiderProfileHomeValue(value.performance)
      || DEFAULT_RIDER_PROFILE_HOME_PERFORMANCE,
  };
}

export function buildRiderProfileHomeIdentity(
  authIdentity = {},
  formatRoleIdImpl,
) {
  const value = normalizeRiderProfileHomeObject(authIdentity);
  const profile = normalizeRiderProfileHomeObject(value.profile);
  const rawRiderId = trimRiderProfileHomeValue(
    value.riderId || value.id || value.userId,
  );
  const formattedRiderId = rawRiderId
    ? typeof formatRoleIdImpl === "function"
      ? trimRiderProfileHomeValue(formatRoleIdImpl(rawRiderId, "rider"))
      : rawRiderId
    : "";

  return {
    rawRiderId,
    riderId: formattedRiderId,
    riderName:
      trimRiderProfileHomeValue(
        value.riderName || value.name || profile.name || profile.nickname,
      ) || "",
    avatarUrl: trimRiderProfileHomeValue(profile.avatar),
  };
}

export function createRiderProfileHomePageLogic(options = {}) {
  const {
    riderOrderStore,
    getRiderRank,
    fetchRiderStats,
    getCachedSupportRuntimeSettings,
    loadSupportRuntimeSettings,
    getCachedPlatformRuntimeSettings,
    loadPlatformRuntimeSettings,
    readRiderAuthIdentity,
    formatRoleId,
    routes = {},
    uniApp,
    setTimeoutFn,
  } = options;
  const runtimeUni = resolveRiderProfileHomeUniRuntime(uniApp);
  const orderStore =
    riderOrderStore && typeof riderOrderStore === "object" ? riderOrderStore : {};
  const pageRoutes = {
    ...DEFAULT_RIDER_PROFILE_HOME_ROUTES,
    ...(routes && typeof routes === "object" ? routes : {}),
  };

  return {
    data() {
      const cachedSupportRuntime = readRiderProfileHomeCachedSupportRuntime(
        getCachedSupportRuntimeSettings,
      );

      return {
        statusBarHeight: 44,
        isNavigating: false,
        avatarUrl: DEFAULT_RIDER_PROFILE_HOME_AVATAR,
        riderName: DEFAULT_RIDER_PROFILE_HOME_NAME,
        riderId: "",
        riderLevel: 1,
        rankName: buildRiderProfileHomeRankName(
          readRiderProfileHomeCachedPlatformLevels(
            getCachedPlatformRuntimeSettings,
          ),
          1,
        ),
        rankLevels: readRiderProfileHomeCachedPlatformLevels(
          getCachedPlatformRuntimeSettings,
        ),
        supportChatTitle:
          trimRiderProfileHomeValue(cachedSupportRuntime.title)
          || DEFAULT_RIDER_PROFILE_HOME_SUPPORT_TITLE,
        riderRating: 5,
        riderRatingCount: 0,
        onlineHours: DEFAULT_RIDER_PROFILE_HOME_STATS.onlineHours,
        onTimeRate: DEFAULT_RIDER_PROFILE_HOME_STATS.onTimeRate,
        performance: DEFAULT_RIDER_PROFILE_HOME_STATS.performance,
        chartData: DEFAULT_RIDER_PROFILE_HOME_CHART_DATA.slice(),
      };
    },
    computed: {
      todayEarnings() {
        return trimRiderProfileHomeValue(orderStore.todayEarnings) || "0";
      },
      completedCount() {
        return toRiderProfileHomeNumber(orderStore.completedCount, 0);
      },
      earningsLog() {
        return Array.isArray(orderStore.earningsLog) ? orderStore.earningsLog : [];
      },
    },
    onLoad() {
      this.applySystemInfo();
      void this.initializePage();
    },
    onShow() {
      void this.refreshPage();
    },
    methods: {
      resolveRankName(level) {
        return buildRiderProfileHomeRankName(this.rankLevels, level);
      },

      applySystemInfo() {
        if (!runtimeUni || typeof runtimeUni.getSystemInfoSync !== "function") {
          return;
        }

        const systemInfo = runtimeUni.getSystemInfoSync();
        this.statusBarHeight = toRiderProfileHomeNumber(
          systemInfo && systemInfo.statusBarHeight,
          44,
        );
      },

      syncAuthIdentity() {
        const authIdentity =
          typeof readRiderAuthIdentity === "function"
            ? readRiderAuthIdentity({ uniApp: runtimeUni })
            : {};
        const profile = buildRiderProfileHomeIdentity(authIdentity, formatRoleId);

        if (profile.avatarUrl) {
          this.avatarUrl = profile.avatarUrl;
        }
        if (profile.riderName) {
          this.riderName = profile.riderName;
        }
        if (profile.riderId) {
          this.riderId = profile.riderId;
        }

        return profile;
      },

      async initializePage() {
        const profile = this.syncAuthIdentity();
        await Promise.allSettled([
          this.loadSupportRuntimeConfig(),
          this.loadPlatformRuntimeConfig(),
          profile.rawRiderId ? this.loadRiderData() : Promise.resolve(),
        ]);
      },

      async refreshPage() {
        const profile = this.syncAuthIdentity();
        await Promise.allSettled([
          this.loadSupportRuntimeConfig(),
          this.loadPlatformRuntimeConfig(),
          profile.rawRiderId ? this.loadRiderData() : Promise.resolve(),
        ]);
      },

      async loadPlatformRuntimeConfig() {
        try {
          const runtime =
            typeof loadPlatformRuntimeSettings === "function"
              ? await loadPlatformRuntimeSettings()
              : {};
          this.rankLevels = Array.isArray(runtime?.riderRankSettings?.levels)
            ? runtime.riderRankSettings.levels.slice()
            : [];
        } catch (error) {
          if (typeof console !== "undefined" && console.error) {
            console.error("加载骑手等级 runtime 失败:", error);
          }
        }

        this.rankName = this.resolveRankName(this.riderLevel);
      },

      async loadSupportRuntimeConfig() {
        try {
          const runtime =
            typeof loadSupportRuntimeSettings === "function"
              ? await loadSupportRuntimeSettings()
              : {};
          const title = trimRiderProfileHomeValue(runtime && runtime.title);
          if (title) {
            this.supportChatTitle = title;
          }
        } catch (error) {
          if (typeof console !== "undefined" && console.error) {
            console.error("加载客服 runtime 失败:", error);
          }
        }
      },

      async loadRiderData() {
        try {
          const [rankRes, statsRes] = await Promise.all([
            typeof getRiderRank === "function" ? getRiderRank() : {},
            typeof fetchRiderStats === "function" ? fetchRiderStats() : {},
          ]);
          const rankData = normalizeRiderProfileHomeRankPayload(rankRes);
          const stats = normalizeRiderProfileHomeStatsPayload(statsRes);

          this.riderLevel = rankData.level;
          this.riderRating = rankData.rating;
          this.riderRatingCount = rankData.ratingCount;
          this.rankName = this.resolveRankName(rankData.level);
          this.onlineHours = stats.onlineHours;
          this.onTimeRate = stats.onTimeRate;
          this.performance = stats.performance;

          if (orderStore && typeof orderStore === "object") {
            orderStore.todayEarnings = stats.todayEarnings;
            orderStore.completedCount = stats.completedCount;
          }
        } catch (error) {
          if (typeof console !== "undefined" && console.error) {
            console.error("加载骑手主页数据失败:", error);
          }
        }
      },

      withNavigateLock(callback) {
        if (this.isNavigating || typeof callback !== "function") {
          return;
        }

        this.isNavigating = true;
        callback();
        resolveRiderProfileHomeTimeout(setTimeoutFn, () => {
          this.isNavigating = false;
        }, 300);
      },

      goToPage(path) {
        const target = trimRiderProfileHomeValue(path);
        if (!target || !runtimeUni || typeof runtimeUni.navigateTo !== "function") {
          return;
        }

        runtimeUni.navigateTo({ url: target });
      },

      changeAvatar() {
        this.goToPage(pageRoutes.avatar);
      },

      goToPersonalInfo() {
        this.goToPage(pageRoutes.profile);
      },

      goToWallet() {
        this.withNavigateLock(() => {
          this.goToPage(pageRoutes.wallet);
        });
      },

      goToRiderHome() {
        this.withNavigateLock(() => {
          this.goToPage(pageRoutes.riderHome);
        });
      },

      goToEarnings() {
        this.withNavigateLock(() => {
          this.goToPage(pageRoutes.earnings);
        });
      },

      goToHistory() {
        this.withNavigateLock(() => {
          this.goToPage(pageRoutes.history);
        });
      },

      goToAppeal() {
        this.withNavigateLock(() => {
          this.goToPage(pageRoutes.appeal);
        });
      },

      goToService() {
        this.withNavigateLock(() => {
          this.goToPage(pageRoutes.service);
        });
      },

      goToSettings() {
        this.withNavigateLock(() => {
          this.goToPage(pageRoutes.settings);
        });
      },
    },
  };
}
