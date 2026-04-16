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
} from "../../packages/mobile-core/src/profile-points-mall.js";

export function createProfilePointsMallPage({
  fetchPointsBalance = async () => ({}),
  fetchPointsGoods = async () => ([]),
  redeemPoints = async () => ({}),
  fetchPublicVIPSettings = async () => ({}),
} = {}) {
  return {
    data() {
      return {
        points: 0,
        goods: [],
        vipConfig: createDefaultConsumerPointsMallVipConfig(),
      };
    },
    onLoad() {
      this.points = resolveConsumerPointsMallStoredBalance(
        uni.getStorageSync("pointsBalance"),
      );
      this.loadVipSettings();
      this.loadPoints();
      this.loadGoods();
    },
    onShow() {
      this.loadPoints();
    },
    methods: {
      loadVipSettings() {
        fetchPublicVIPSettings()
          .then((payload) => {
            this.vipConfig = normalizeConsumerPointsMallVipSettings(payload || {});
          })
          .catch(() => {
            this.vipConfig = createDefaultConsumerPointsMallVipConfig();
          });
      },
      goBack() {
        uni.navigateBack();
      },
      loadPoints() {
        const profile = uni.getStorageSync("userProfile") || {};
        const userId = resolveConsumerPointsMallUserId(profile);
        if (!userId) return;

        fetchPointsBalance(userId)
          .then((response) => {
            const balance = normalizeConsumerPointsMallBalance(
              response,
              this.points,
            );
            this.points = balance;
            uni.setStorageSync("pointsBalance", balance);
          })
          .catch(() => {});
      },
      loadGoods() {
        fetchPointsGoods()
          .then((payload) => {
            this.goods = normalizeConsumerPointsMallGoods(payload);
          })
          .catch(() => {});
      },
      exchange(item) {
        if (!canConsumerPointsMallRedeem(this.points, item)) {
          uni.showToast({ title: "积分不足", icon: "none" });
          return;
        }

        const profile = uni.getStorageSync("userProfile") || {};
        const payload = buildConsumerPointsMallRedeemPayload({ profile, item });

        if (!payload.userId) {
          uni.showToast({ title: "请先登录", icon: "none" });
          return;
        }

        uni.showModal({
          title: "确认兑换",
          content: buildConsumerPointsMallRedeemConfirmation(item),
          confirmText: "立即兑换",
          cancelText: "取消",
          success: async (modalResult) => {
            if (!modalResult.confirm) return;

            uni.showLoading({ title: "兑换中..." });
            try {
              const response = await redeemPoints(payload);
              const result = normalizeConsumerPointsMallRedeemResult(
                response,
                this.points,
              );

              if (result.success) {
                this.points = result.balance;
                uni.setStorageSync("pointsBalance", result.balance);
                uni.showToast({ title: "兑换成功", icon: "success" });
                return;
              }

              uni.showToast({
                title: result.errorMessage || "兑换失败",
                icon: "none",
              });
            } catch (error) {
              uni.showToast({
                title: normalizeConsumerPointsMallErrorMessage(error, "兑换失败"),
                icon: "none",
              });
            } finally {
              uni.hideLoading();
            }
          },
        });
      },
    },
  };
}
