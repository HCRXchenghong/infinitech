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
} from "../../packages/mobile-core/src/vip-center.js";

function resolveVipCenterUserId(profile = {}) {
  return String(profile.id || profile.userId || profile.phone || "").trim();
}

function normalizeVipCenterBalance(payload, fallback = 0) {
  const balance = Number(payload?.balance);
  if (Number.isFinite(balance)) {
    return Math.max(0, balance);
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
        const profile = uni.getStorageSync("userProfile") || {};
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
        const profile = uni.getStorageSync("userProfile") || {};
        const userId = resolveVipCenterUserId(profile);
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
