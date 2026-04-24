import { extractEnvelopeData } from "../../contracts/src/http.js";
import {
  DEFAULT_RIDER_RANK_SETTINGS,
  findRiderRankLevel,
} from "./platform-runtime.js";

function trimRiderHomeValue(value) {
  return String(value == null ? "" : value).trim();
}

function toRiderHomeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeRiderHomeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cloneRiderHomeStringList(values = []) {
  return (Array.isArray(values) ? values : [])
    .map((item) => trimRiderHomeValue(item))
    .filter(Boolean);
}

function unwrapRiderHomePayload(payload) {
  const extracted = extractEnvelopeData(payload);
  const source = normalizeRiderHomeObject(extracted);
  if (Object.keys(source).length > 0) {
    return source;
  }
  return normalizeRiderHomeObject(payload);
}

function fallbackRiderHomeRankConfigMap() {
  return DEFAULT_RIDER_RANK_SETTINGS.levels.reduce((result, item) => {
    result[item.level] = {
      level: item.level,
      name: trimRiderHomeValue(item.name),
      icon: trimRiderHomeValue(item.icon),
      desc: trimRiderHomeValue(item.desc),
      progressTemplate: trimRiderHomeValue(item.progress_template),
      thresholdRules: cloneRiderHomeStringList(item.threshold_rules),
    };
    return result;
  }, {});
}

function listRiderHomeRankLevels(rankConfig = {}) {
  return Object.values(normalizeRiderHomeObject(rankConfig))
    .map((item) => normalizeRiderHomeObject(item))
    .filter((item) => toRiderHomeNumber(item.level, 0) > 0)
    .sort((left, right) => toRiderHomeNumber(left.level, 0) - toRiderHomeNumber(right.level, 0));
}

function resolveRiderHomeProgressMetricKey(rank = {}) {
  const template = trimRiderHomeValue(rank.progressTemplate);
  if (template.includes("{{weekOrders}}")) {
    return "weekOrders";
  }
  return "totalOrders";
}

function resolveRiderHomeProgressTarget(rank = {}) {
  const template = trimRiderHomeValue(rank.progressTemplate);
  const matched = template.match(/\/\s*(\d+)/);
  return matched ? toRiderHomeNumber(matched[1], 0) : 0;
}

function cloneDefaultRiderHomeData() {
  return {
    level: 1,
    totalOrders: 0,
    weekOrders: 0,
    consecutiveWeeks: 0,
    rating: 5,
    ratingCount: 0,
  };
}

export const DEFAULT_RIDER_HOME_ACTIVE_TAB = "day";
export const RIDER_HOME_RANK_TABS = Object.freeze(["day", "week", "month"]);
export const DEFAULT_RIDER_HOME_DATA = Object.freeze(cloneDefaultRiderHomeData());
export const DEFAULT_RIDER_HOME_PROGRESS_TEXTS = Object.freeze({
  1: "累计0/100单，升级白银骑士",
  2: "累计0/300单，升级黄金骑士",
  3: "本周0/100单，升级钻石骑士",
  4: "本周0/150单，升级王者骑士",
  5: "保持王者骑士段位",
  6: "保持传奇骑士段位",
});

export function normalizeRiderHomeTab(value, fallback = DEFAULT_RIDER_HOME_ACTIVE_TAB) {
  const normalized = trimRiderHomeValue(value).toLowerCase();
  return RIDER_HOME_RANK_TABS.includes(normalized) ? normalized : fallback;
}

export function buildRiderHomeRankConfig(levels = []) {
  const source = Array.isArray(levels) && levels.length
    ? levels
    : DEFAULT_RIDER_RANK_SETTINGS.levels;
  const nextConfig = {};

  source.forEach((item, index) => {
    const sourceItem = normalizeRiderHomeObject(item);
    const level = toRiderHomeNumber(sourceItem.level, index + 1);
    if (!level || nextConfig[level]) {
      return;
    }

    const fallback =
      DEFAULT_RIDER_RANK_SETTINGS.levels.find(
        (candidate) => Number(candidate.level) === Number(level),
      ) || DEFAULT_RIDER_RANK_SETTINGS.levels[0];

    nextConfig[level] = {
      level,
      name: trimRiderHomeValue(sourceItem.name || fallback.name),
      icon: trimRiderHomeValue(sourceItem.icon || fallback.icon),
      desc: trimRiderHomeValue(sourceItem.desc || fallback.desc),
      progressTemplate: trimRiderHomeValue(
        sourceItem.progress_template ||
          sourceItem.progressTemplate ||
          fallback.progress_template,
      ),
      thresholdRules: cloneRiderHomeStringList(
        sourceItem.threshold_rules ||
          sourceItem.thresholdRules ||
          fallback.threshold_rules,
      ),
    };
  });

  DEFAULT_RIDER_RANK_SETTINGS.levels.forEach((item) => {
    if (nextConfig[item.level]) {
      return;
    }
    nextConfig[item.level] = {
      level: item.level,
      name: trimRiderHomeValue(item.name),
      icon: trimRiderHomeValue(item.icon),
      desc: trimRiderHomeValue(item.desc),
      progressTemplate: trimRiderHomeValue(item.progress_template),
      thresholdRules: cloneRiderHomeStringList(item.threshold_rules),
    };
  });

  return Object.keys(nextConfig).length > 0
    ? nextConfig
    : fallbackRiderHomeRankConfigMap();
}

export function resolveRiderHomeCurrentRank(rankConfig = {}, level = 1) {
  const levels = listRiderHomeRankLevels(rankConfig);
  const runtimeLevels = levels.map((item) => ({
    level: item.level,
    name: item.name,
    icon: item.icon,
    desc: item.desc,
    progress_template: item.progressTemplate,
    threshold_rules: item.thresholdRules,
  }));
  const match = findRiderRankLevel(
    {
      riderRankSettings: {
        levels: runtimeLevels,
      },
    },
    toRiderHomeNumber(level, 1),
  );

  return (
    (match && {
      level: match.level,
      name: match.name,
      icon: match.icon,
      desc: match.desc,
      progressTemplate: match.progress_template,
      thresholdRules: cloneRiderHomeStringList(match.threshold_rules),
    }) ||
    levels[0] ||
    fallbackRiderHomeRankConfigMap()[1]
  );
}

export function normalizeRiderHomeRankData(payload = {}) {
  const source = unwrapRiderHomePayload(payload);
  const data = normalizeRiderHomeObject(source.data);
  const value = Object.keys(data).length > 0 ? data : source;
  const defaults = cloneDefaultRiderHomeData();

  return {
    level: toRiderHomeNumber(value.level, defaults.level),
    totalOrders: toRiderHomeNumber(
      value.totalOrders ?? value.total_orders,
      defaults.totalOrders,
    ),
    weekOrders: toRiderHomeNumber(
      value.weekOrders ?? value.week_orders,
      defaults.weekOrders,
    ),
    consecutiveWeeks: toRiderHomeNumber(
      value.consecutiveWeeks ?? value.consecutive_weeks,
      defaults.consecutiveWeeks,
    ),
    rating: toRiderHomeNumber(value.rating, defaults.rating),
    ratingCount: toRiderHomeNumber(
      value.ratingCount ?? value.rating_count,
      defaults.ratingCount,
    ),
  };
}

export function normalizeRiderHomeRankList(payload = []) {
  if (Array.isArray(payload)) {
    return payload.map((item, index) => normalizeRiderHomeRankListItem(item, index));
  }

  const source = unwrapRiderHomePayload(payload);
  const list = Array.isArray(source)
    ? source
    : Array.isArray(source.list)
      ? source.list
      : Array.isArray(source.data)
        ? source.data
        : Array.isArray(source.data?.list)
          ? source.data.list
          : [];

  return list.map((item, index) => normalizeRiderHomeRankListItem(item, index));
}

function normalizeRiderHomeRankListItem(item, index) {
  const source = normalizeRiderHomeObject(item);
  return {
    id:
      trimRiderHomeValue(
        source.id || source.riderId || source.rider_id || source.userId,
      ) || `rank-${index + 1}`,
    avatar: trimRiderHomeValue(source.avatar),
    name:
      trimRiderHomeValue(source.name || source.riderName || source.nickname) || "骑手",
    level: toRiderHomeNumber(source.level, 1),
    orders: toRiderHomeNumber(
      source.orders ?? source.orderCount ?? source.order_count,
      0,
    ),
    rating: toRiderHomeNumber(source.rating, 5),
  };
}

export function buildRiderHomeProgressPercent(riderData = {}, rankConfig = {}) {
  const normalizedData = normalizeRiderHomeRankData(riderData);
  const currentRank = resolveRiderHomeCurrentRank(rankConfig, normalizedData.level);
  const target = resolveRiderHomeProgressTarget(currentRank);
  if (target <= 0) {
    return 100;
  }

  const metricKey = resolveRiderHomeProgressMetricKey(currentRank);
  const currentValue = toRiderHomeNumber(normalizedData[metricKey], 0);
  return Math.min((currentValue / target) * 100, 100);
}

export function renderRiderHomeProgressText(riderData = {}, rankConfig = {}) {
  const normalizedData = normalizeRiderHomeRankData(riderData);
  const currentRank = resolveRiderHomeCurrentRank(rankConfig, normalizedData.level);
  const template = trimRiderHomeValue(currentRank.progressTemplate);

  if (template) {
    return template
      .replace(/\{\{\s*totalOrders\s*\}\}/g, String(normalizedData.totalOrders))
      .replace(/\{\{\s*weekOrders\s*\}\}/g, String(normalizedData.weekOrders))
      .replace(
        /\{\{\s*consecutiveWeeks\s*\}\}/g,
        String(normalizedData.consecutiveWeeks),
      )
      .replace(/\{\{\s*ratingCount\s*\}\}/g, String(normalizedData.ratingCount))
      .replace(/\{\{\s*rating\s*\}\}/g, String(normalizedData.rating));
  }

  if (normalizedData.level === 1) {
    return `累计${normalizedData.totalOrders}/100单，升级白银骑士`;
  }
  if (normalizedData.level === 2) {
    return `累计${normalizedData.totalOrders}/300单，升级黄金骑士`;
  }
  if (normalizedData.level === 3) {
    return `本周${normalizedData.weekOrders}/100单，升级钻石骑士`;
  }
  if (normalizedData.level === 4) {
    return `本周${normalizedData.weekOrders}/150单，升级王者骑士`;
  }
  if (normalizedData.level === 5) {
    return DEFAULT_RIDER_HOME_PROGRESS_TEXTS[5];
  }
  return DEFAULT_RIDER_HOME_PROGRESS_TEXTS[6];
}

export function createRiderHomePageLogic(options = {}) {
  const {
    getRiderRank,
    getRankList,
    getCachedPlatformRuntimeSettings,
    loadPlatformRuntimeSettings,
  } = options;

  return {
    data() {
      const cachedRuntime =
        typeof getCachedPlatformRuntimeSettings === "function"
          ? getCachedPlatformRuntimeSettings()
          : {};
      return {
        activeTab: DEFAULT_RIDER_HOME_ACTIVE_TAB,
        riderData: cloneDefaultRiderHomeData(),
        rankConfig: buildRiderHomeRankConfig(
          cachedRuntime?.riderRankSettings?.levels,
        ),
        rankList: [],
      };
    },
    computed: {
      currentRank() {
        return resolveRiderHomeCurrentRank(this.rankConfig, this.riderData.level);
      },
      progress() {
        return buildRiderHomeProgressPercent(this.riderData, this.rankConfig);
      },
      progressText() {
        return renderRiderHomeProgressText(this.riderData, this.rankConfig);
      },
    },
    onLoad() {
      void this.initializePage();
    },
    methods: {
      rankName(level) {
        return resolveRiderHomeCurrentRank(this.rankConfig, level).name;
      },

      async initializePage() {
        await Promise.allSettled([
          this.loadRuntimeConfig(),
          this.loadRiderData(),
          this.loadRankList(),
        ]);
      },

      async loadRuntimeConfig() {
        try {
          const runtime =
            typeof loadPlatformRuntimeSettings === "function"
              ? await loadPlatformRuntimeSettings()
              : {};
          this.rankConfig = buildRiderHomeRankConfig(
            runtime?.riderRankSettings?.levels,
          );
        } catch (error) {
          if (typeof console !== "undefined" && console.error) {
            console.error("加载骑手等级 runtime 失败:", error);
          }
          this.rankConfig = buildRiderHomeRankConfig();
        }
      },

      async loadRiderData() {
        try {
          const payload =
            typeof getRiderRank === "function" ? await getRiderRank() : {};
          this.riderData = normalizeRiderHomeRankData(payload);
        } catch (error) {
          if (typeof console !== "undefined" && console.error) {
            console.error("加载骑手段位数据失败:", error);
          }
          this.riderData = cloneDefaultRiderHomeData();
        }
      },

      async loadRankList() {
        try {
          const payload =
            typeof getRankList === "function"
              ? await getRankList(this.activeTab)
              : [];
          this.rankList = normalizeRiderHomeRankList(payload);
        } catch (error) {
          if (typeof console !== "undefined" && console.error) {
            console.error("加载骑手排行榜失败:", error);
          }
          this.rankList = [];
        }
      },

      async switchTab(tab) {
        this.activeTab = normalizeRiderHomeTab(tab, this.activeTab);
        await this.loadRankList();
      },
    },
  };
}
