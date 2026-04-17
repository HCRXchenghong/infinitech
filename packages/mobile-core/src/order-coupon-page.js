import {
  buildConsumerOrderCouponConditionText,
  buildConsumerOrderCouponSelectionPayload,
  buildConsumerOrderCouponUnavailableMessage,
  canUseConsumerOrderCoupon,
  extractConsumerAvailableOrderCoupons,
  formatConsumerOrderCouponAmount,
  formatConsumerOrderCouponValidity,
  resolveConsumerOrderCouponUserId,
} from "./order-coupon.js";

export function createOrderCouponPage(options = {}) {
  const { request = async () => ({}) } = options;

  return {
    data() {
      return {
        shopId: "",
        orderAmount: 0,
        coupons: [],
        selectedCoupon: null,
        loading: true,
      };
    },
    onLoad(query) {
      this.shopId = String(query.shopId || "").trim();
      this.orderAmount = Number(query.amount) || 0;
      void this.loadCoupons();
    },
    methods: {
      async loadCoupons() {
        try {
          const profile = uni.getStorageSync("userProfile") || {};
          const userId = resolveConsumerOrderCouponUserId(profile);
          if (!userId) {
            uni.showToast({ title: "请先登录", icon: "none" });
            setTimeout(() => uni.navigateBack(), 1500);
            return;
          }

          uni.showLoading({ title: "加载中..." });
          const response = await request({
            url: "/api/coupons/available",
            method: "GET",
            data: {
              userId,
              shopId: this.shopId,
              orderAmount: this.orderAmount,
            },
          });

          this.coupons = extractConsumerAvailableOrderCoupons(response);
        } catch (error) {
          console.error("加载优惠券失败:", error);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          uni.hideLoading();
          this.loading = false;
        }
      },
      canUseCoupon(userCoupon) {
        return canUseConsumerOrderCoupon(userCoupon, this.orderAmount);
      },
      selectCoupon(coupon) {
        if (!this.canUseCoupon(coupon)) {
          uni.showToast({
            title: buildConsumerOrderCouponUnavailableMessage(coupon),
            icon: "none",
          });
          return;
        }
        this.selectedCoupon = coupon;
      },
      selectNoCoupon() {
        this.selectedCoupon = null;
      },
      confirmSelection() {
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage && prevPage.$vm) {
          const selection = buildConsumerOrderCouponSelectionPayload(
            this.selectedCoupon,
          );
          prevPage.$vm.selectedCoupon = selection.selectedCoupon;
          prevPage.$vm.selectedUserCouponId = selection.selectedUserCouponId;
        }
        uni.navigateBack();
      },
      formatAmount(coupon) {
        return formatConsumerOrderCouponAmount(coupon);
      },
      getConditionText(coupon) {
        return buildConsumerOrderCouponConditionText(coupon);
      },
      formatTime(coupon) {
        return formatConsumerOrderCouponValidity(coupon);
      },
    },
  };
}
