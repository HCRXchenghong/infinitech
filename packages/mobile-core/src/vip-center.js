import { extractEnvelopeData } from "../../contracts/src/http.js";
import {
  readConsumerStoredProfile,
  resolveConsumerStoredProfileUserId,
} from "./consumer-profile-storage.js";

const VIP_POINT_REWARD_COLORS = [
  "red-bg",
  "blue-bg",
  "green-bg",
  "yellow-bg",
  "orange-bg",
  "black-bg",
];

export const EMPTY_VIP_LEVEL = {
  name: "",
  style_class: "level-quality",
  tagline: "",
  threshold_label: "",
  threshold_value: 1,
  multiplier: 1,
  is_black_gold: false,
  benefits: [],
};

export const DEFAULT_VIP_CENTER_SETTINGS = {
  enabled: true,
  page_title: "会员中心",
  rules_title: "会员权益规则",
  benefit_section_title: "权益全景",
  benefit_section_tag: "VIP专享",
  benefit_section_tip: "点击查看详情",
  tasks_section_title: "成长任务",
  tasks_section_tip: "完成任务，逐步解锁更多等级权益",
  points_section_title: "积分好礼",
  points_section_tip: "积分商品由积分商城实时维护",
  service_button_text: "客服",
  standard_action_text: "立即去点餐升级",
  premium_action_text: "联系专属客服",
  point_rules: [
    "平台消费 1 元 = 1 积分，按实付金额累计。",
    "会员倍数积分会在基础积分上额外叠加。",
    "退款订单对应积分会同步扣回。",
    "积分有效期与兑换规则以积分商城说明为准。",
  ],
  levels: [
    {
      name: "优享VIP",
      style_class: "level-quality",
      tagline: "日常省一点，从这里开始",
      threshold_label: "成长值 800",
      threshold_value: 800,
      multiplier: 1,
      is_black_gold: false,
      benefits: [
        {
          icon: "/static/icons/star.svg",
          title: "积分",
          desc: "消费返积分",
          detail: "平台消费 1 元可累计 1 积分，按订单实付金额计算。",
        },
        {
          icon: "/static/icons/gift.svg",
          title: "兑换好礼",
          desc: "积分兑换权益",
          detail: "积分可在积分商城兑换实物商品、会员卡和平台权益。",
        },
        {
          icon: "/static/icons/clock.svg",
          title: "超时赔付",
          desc: "超时自动补偿",
          detail: "订单超过承诺时效后，平台可按规则发放补偿。",
        },
      ],
    },
    {
      name: "黄金VIP",
      style_class: "level-gold",
      tagline: "返利升级，权益更进一步",
      threshold_label: "成长值 3000",
      threshold_value: 3000,
      multiplier: 2,
      is_black_gold: false,
      benefits: [
        {
          icon: "/static/icons/ticket.svg",
          title: "2元无门槛券",
          desc: "每月 1 张",
          detail: "每月发放 1 张 2 元无门槛券，面向指定业务场景可用。",
        },
        {
          icon: "/static/icons/clock.svg",
          title: "超时赔付",
          desc: "超时自动补偿",
          detail: "订单超过承诺时效后，平台可按规则发放补偿。",
        },
        {
          icon: "/static/icons/star.svg",
          title: "双倍积分",
          desc: "积分翻倍累计",
          detail: "在基础积分之上额外发放 1 倍会员积分。",
        },
        {
          icon: "/static/icons/gift.svg",
          title: "兑换好礼",
          desc: "积分兑换权益",
          detail: "积分可在积分商城兑换实物商品、会员卡和平台权益。",
        },
      ],
    },
    {
      name: "尊享VIP",
      style_class: "level-premium",
      tagline: "更多特权，服务更快一步",
      threshold_label: "成长值 5000",
      threshold_value: 5000,
      multiplier: 2,
      is_black_gold: false,
      benefits: [
        {
          icon: "/static/icons/ticket.svg",
          title: "2元无门槛券",
          desc: "每月 1 张",
          detail: "每月发放 1 张 2 元无门槛券，面向指定业务场景可用。",
        },
        {
          icon: "/static/icons/bike.svg",
          title: "免配送费",
          desc: "每月 1 次",
          detail: "每月可享 1 次免配送费权益。",
        },
        {
          icon: "/static/icons/clock.svg",
          title: "超时赔付",
          desc: "超时自动补偿",
          detail: "订单超过承诺时效后，平台可按规则发放补偿。",
        },
        {
          icon: "/static/icons/star.svg",
          title: "双倍积分",
          desc: "积分翻倍累计",
          detail: "在基础积分之上额外发放 1 倍会员积分。",
        },
        {
          icon: "/static/icons/gift.svg",
          title: "兑换好礼",
          desc: "积分兑换权益",
          detail: "积分可在积分商城兑换实物商品、会员卡和平台权益。",
        },
        {
          icon: "/static/icons/headphones.svg",
          title: "专属客服",
          desc: "优先响应支持",
          detail: "会员问题支持优先接入，保障处理效率。",
        },
      ],
    },
    {
      name: "黑金VIP",
      style_class: "level-supreme",
      tagline: "黑金尊享，服务与补贴双升级",
      threshold_label: "成长值 8000",
      threshold_value: 8000,
      multiplier: 3,
      is_black_gold: true,
      benefits: [
        {
          icon: "/static/icons/ticket.svg",
          title: "2元无门槛券",
          desc: "每月 2 张",
          detail: "每月发放 2 张 2 元无门槛券，面向指定业务场景可用。",
        },
        {
          icon: "/static/icons/bike.svg",
          title: "免配送费",
          desc: "每月 2 次",
          detail: "每月可享 2 次免配送费权益。",
        },
        {
          icon: "/static/icons/clock.svg",
          title: "超时赔付",
          desc: "超时自动补偿",
          detail: "订单超过承诺时效后，平台可按规则发放补偿。",
        },
        {
          icon: "/static/icons/star.svg",
          title: "三倍积分",
          desc: "积分三倍累计",
          detail: "在基础积分之上额外发放 2 倍会员积分。",
        },
        {
          icon: "/static/icons/gift.svg",
          title: "兑换好礼",
          desc: "积分兑换权益",
          detail: "积分可在积分商城兑换实物商品、会员卡和平台权益。",
        },
        {
          icon: "/static/icons/headphones.svg",
          title: "24h客服",
          desc: "一对一专属支持",
          detail: "黑金会员可享受一对一专属服务支持。",
        },
      ],
    },
  ],
  growth_tasks: [
    {
      title: "完成 1 笔早餐订单",
      description: "解锁本周首笔早餐订单成长奖励",
      reward_text: "+80 成长值",
      action_label: "去下单",
    },
    {
      title: "本周完成 5 笔订单",
      description: "保持活跃消费，累计会员成长值",
      reward_text: "+200 成长值",
      action_label: "去点餐",
    },
    {
      title: "连续 3 天下单",
      description: "连续活跃可提升等级成长速度",
      reward_text: "+120 成长值",
      action_label: "去完成",
    },
    {
      title: "浏览新品推荐",
      description: "查看新品专区可获得轻量成长奖励",
      reward_text: "+20 成长值",
      action_label: "去看看",
    },
  ],
};

function resolveVIPCenterSettingsPayload(payload = {}) {
  const data = extractEnvelopeData(payload);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data;
  }
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};
}

function normalizeText(value, fallback = "") {
  const normalized = String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  return normalized || fallback;
}

function dedupeList(items = []) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item) => normalizeText(item))
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
}

function normalizeBenefits(items = [], fallback = []) {
  const source = Array.isArray(items) && items.length ? items : fallback;
  return source
    .map((item) => ({
      icon: normalizeText(item?.icon, "/static/icons/star.svg"),
      title: normalizeText(item?.title),
      desc: normalizeText(item?.desc),
      detail: normalizeText(item?.detail),
    }))
    .filter((item) => item.title || item.desc || item.detail || item.icon);
}

function normalizeLevels(items = [], fallback = []) {
  const source = Array.isArray(items) && items.length ? items : fallback;
  return source
    .map((item, index) => ({
      name: normalizeText(item?.name),
      style_class: normalizeText(
        item?.style_class,
        index === 0 ? "level-quality" : "level-gold",
      ),
      tagline: normalizeText(item?.tagline),
      threshold_label: normalizeText(item?.threshold_label),
      threshold_value: Math.max(1, Number(item?.threshold_value || 0)),
      multiplier: Math.max(1, Number(item?.multiplier || 1)),
      is_black_gold: Boolean(item?.is_black_gold),
      benefits: normalizeBenefits(item?.benefits, []),
    }))
    .filter((item) => item.name || item.threshold_value || item.benefits.length)
    .sort((left, right) => left.threshold_value - right.threshold_value);
}

function normalizeTasks(items = [], fallback = []) {
  const source = Array.isArray(items) && items.length ? items : fallback;
  return source
    .map((item) => ({
      title: normalizeText(item?.title),
      description: normalizeText(item?.description),
      reward_text: normalizeText(item?.reward_text),
      action_label: normalizeText(item?.action_label, "去完成"),
    }))
    .filter(
      (item) => item.title || item.description || item.reward_text || item.action_label,
    );
}

export function normalizeVIPCenterSettings(payload = {}) {
  const source = resolveVIPCenterSettingsPayload(payload);
  const merged = {
    ...DEFAULT_VIP_CENTER_SETTINGS,
    ...source,
  };

  return {
    enabled: Boolean(merged.enabled),
    page_title: normalizeText(
      merged.page_title,
      DEFAULT_VIP_CENTER_SETTINGS.page_title,
    ),
    rules_title: normalizeText(
      merged.rules_title,
      DEFAULT_VIP_CENTER_SETTINGS.rules_title,
    ),
    benefit_section_title: normalizeText(
      merged.benefit_section_title,
      DEFAULT_VIP_CENTER_SETTINGS.benefit_section_title,
    ),
    benefit_section_tag: normalizeText(
      merged.benefit_section_tag,
      DEFAULT_VIP_CENTER_SETTINGS.benefit_section_tag,
    ),
    benefit_section_tip: normalizeText(
      merged.benefit_section_tip,
      DEFAULT_VIP_CENTER_SETTINGS.benefit_section_tip,
    ),
    tasks_section_title: normalizeText(
      merged.tasks_section_title,
      DEFAULT_VIP_CENTER_SETTINGS.tasks_section_title,
    ),
    tasks_section_tip: normalizeText(
      merged.tasks_section_tip,
      DEFAULT_VIP_CENTER_SETTINGS.tasks_section_tip,
    ),
    points_section_title: normalizeText(
      merged.points_section_title,
      DEFAULT_VIP_CENTER_SETTINGS.points_section_title,
    ),
    points_section_tip: normalizeText(
      merged.points_section_tip,
      DEFAULT_VIP_CENTER_SETTINGS.points_section_tip,
    ),
    service_button_text: normalizeText(
      merged.service_button_text,
      DEFAULT_VIP_CENTER_SETTINGS.service_button_text,
    ),
    standard_action_text: normalizeText(
      merged.standard_action_text,
      DEFAULT_VIP_CENTER_SETTINGS.standard_action_text,
    ),
    premium_action_text: normalizeText(
      merged.premium_action_text,
      DEFAULT_VIP_CENTER_SETTINGS.premium_action_text,
    ),
    point_rules: dedupeList(merged.point_rules).slice(0, 20),
    levels: normalizeLevels(
      merged.levels,
      DEFAULT_VIP_CENTER_SETTINGS.levels,
    ).slice(0, 8),
    growth_tasks: normalizeTasks(
      merged.growth_tasks,
      DEFAULT_VIP_CENTER_SETTINGS.growth_tasks,
    ).slice(0, 20),
  };
}

export function mapVIPPointRewardList(
  list = [],
  {
    vipEmoji = "👑",
    defaultEmoji = "🎁",
    vipColorClass = "gold-bg",
  } = {},
) {
  return Array.isArray(list)
    ? list.map((item, index) => {
        const type = String(item?.type || "").trim().toLowerCase();
        return {
          id: item?.id ?? `reward-${index}`,
          name: String(item?.name || "").trim(),
          points: Number(item?.points || 0),
          shipFee: Number(item?.ship_fee || item?.shipFee || 0),
          colorClass:
            type === "vip"
              ? vipColorClass
              : VIP_POINT_REWARD_COLORS[index % VIP_POINT_REWARD_COLORS.length],
          emoji: type === "vip" ? vipEmoji : defaultEmoji,
          tag: item?.tag || (type === "vip" ? "VIP" : "实物"),
          desc: String(item?.desc || "").trim(),
        };
      })
    : [];
}

export function resolveVIPLevelIndex(levels = [], points = 0) {
  const normalizedLevels = Array.isArray(levels) ? levels : [];
  const currentPoints = Number(points || 0);
  let resolved = 0;
  normalizedLevels.forEach((level, index) => {
    if (currentPoints >= Number(level?.threshold_value || 0)) {
      resolved = index;
    }
  });
  return resolved;
}

export function formatVIPProgressPercent(level = {}, points = 0) {
  const threshold = Number(level?.threshold_value || 0);
  if (!threshold) {
    return "0%";
  }
  const percent = Math.min(100, Math.max(0, (Number(points || 0) / threshold) * 100));
  return `${percent.toFixed(2)}%`;
}

export function formatVIPProgressValueText(level = {}, points = 0) {
  const threshold = Number(level?.threshold_value || 0);
  const currentPoints = Math.max(0, Number(points || 0));
  if (!threshold) {
    return `${currentPoints}/0`;
  }
  return `${Math.min(currentPoints, threshold)}/${threshold}`;
}

export function buildVIPNextThresholdText(levels = [], index = 0) {
  const normalizedLevels = Array.isArray(levels) ? levels : [];
  const nextLevel = normalizedLevels[index + 1];
  if (!nextLevel) {
    return "已达当前配置的最高会员等级";
  }
  return `下一档门槛：${nextLevel.threshold_label || `成长值 ${nextLevel.threshold_value}`}`;
}

export function summarizeVIPBenefits(benefits = []) {
  return (Array.isArray(benefits) ? benefits : [])
    .map((item) => item?.title)
    .filter(Boolean)
    .join("、");
}

function resolveVipCenterUserId(profile = {}) {
  return String(profile.id || profile.userId || profile.phone || "").trim();
}

function normalizeVipCenterBalance(payload, fallback = 0) {
  const data = extractEnvelopeData(payload);
  const candidates = [
    data?.balance,
    data?.points,
    payload?.balance,
    payload?.points,
  ];

  for (const value of candidates) {
    const balance = Number(value);
    if (Number.isFinite(balance)) {
      return Math.max(0, balance);
    }
  }

  return Math.max(0, Number(fallback) || 0);
}

export function createProfileVipCenterPageOptions({
  fetchPointsBalance = async () => ({}),
  fetchPointsGoods = async () => ([]),
  fetchPublicVIPSettings = async () => ({}),
} = {}) {
  return {
    data() {
      return {
        nickname: "美食家",
        avatarUrl: "",
        points: 0,
        activeTab: 0,
        showRulesModal: false,
        showModal: false,
        selectedBenefit: null,
        animateCard: false,
        vipConfig: normalizeVIPCenterSettings(DEFAULT_VIP_CENTER_SETTINGS),
        pointRewards: [],
      };
    },

    computed: {
      vipLevels() {
        return Array.isArray(this.vipConfig.levels) ? this.vipConfig.levels : [];
      },
      vipTasks() {
        return Array.isArray(this.vipConfig.growth_tasks)
          ? this.vipConfig.growth_tasks
          : [];
      },
      currentLevel() {
        return this.vipLevels[this.activeTab] || this.vipLevels[0] || EMPTY_VIP_LEVEL;
      },
      currentUserLevelIndex() {
        return resolveVIPLevelIndex(this.vipLevels, this.points);
      },
      currentUserLevel() {
        return this.vipLevels[this.currentUserLevelIndex] || this.currentLevel;
      },
      actionButtonText() {
        return this.currentUserLevel.is_black_gold
          ? this.vipConfig.premium_action_text
          : this.vipConfig.standard_action_text;
      },
    },

    onLoad() {
      this.loadProfile();
      this.loadVipSettings();
      this.loadPoints();
      this.loadRewards();
    },

    onShow() {
      this.loadProfile();
      this.loadPoints();
      this.loadRewards();
    },

    methods: {
      loadProfile() {
        const profile = readConsumerStoredProfile({ uniApp: uni });
        if (profile.nickname) this.nickname = profile.nickname;
        if (profile.avatarUrl) this.avatarUrl = profile.avatarUrl;
      },
      async loadVipSettings() {
        try {
          const payload = await fetchPublicVIPSettings();
          this.vipConfig = normalizeVIPCenterSettings(payload || {});
        } catch (error) {
          this.vipConfig = normalizeVIPCenterSettings(DEFAULT_VIP_CENTER_SETTINGS);
        }
        this.activeTab = resolveVIPLevelIndex(this.vipLevels, this.points);
      },
      resolveLevelIndex(points) {
        return resolveVIPLevelIndex(this.vipLevels, points);
      },
      progressPercent(level) {
        return formatVIPProgressPercent(level, this.points);
      },
      progressValueText(level) {
        return formatVIPProgressValueText(level, this.points);
      },
      nextThresholdText(index) {
        return buildVIPNextThresholdText(this.vipLevels, index);
      },
      summarizeBenefits(benefits) {
        return summarizeVIPBenefits(benefits);
      },
      loadPoints() {
        const profile = readConsumerStoredProfile({ uniApp: uni });
        const userId =
          resolveVipCenterUserId(profile) ||
          resolveConsumerStoredProfileUserId({ profile });
        if (!userId) return;

        fetchPointsBalance(userId)
          .then((response) => {
            const balance = normalizeVipCenterBalance(response, this.points);
            this.points = balance;
            uni.setStorageSync("pointsBalance", balance);
            if (!this.showRulesModal && !this.showModal) {
              this.activeTab = resolveVIPLevelIndex(this.vipLevels, balance);
            }
          })
          .catch(() => {});
      },
      loadRewards() {
        fetchPointsGoods()
          .then((list) => {
            this.pointRewards = mapVIPPointRewardList(list, {
              vipEmoji: "VIP",
              defaultEmoji: "礼",
            });
          })
          .catch(() => {
            this.pointRewards = [];
          });
      },
      goBack() {
        uni.navigateBack();
      },
      showRules() {
        this.showRulesModal = true;
      },
      closeRules() {
        this.showRulesModal = false;
      },
      switchTab(index) {
        this.activeTab = index;
        this.animateCard = true;
        setTimeout(() => {
          this.animateCard = false;
        }, 500);
      },
      openBenefitDetail(benefit) {
        this.selectedBenefit = benefit;
        this.showModal = true;
      },
      closeModal() {
        this.showModal = false;
        this.selectedBenefit = null;
      },
      goPointsMall() {
        uni.navigateTo({ url: "/pages/profile/points-mall/index" });
      },
      exchangeReward() {
        this.goPointsMall();
      },
      contactService() {
        uni.navigateTo({ url: "/pages/profile/customer-service/index" });
      },
      handleTaskAction() {
        uni.switchTab({ url: "/pages/index/index" });
      },
      handleAction() {
        if (this.currentUserLevel.is_black_gold) {
          this.contactService();
          return;
        }
        uni.switchTab({ url: "/pages/index/index" });
      },
    },
  };
}
