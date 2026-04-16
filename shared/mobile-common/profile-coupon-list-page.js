import {
  buildConsumerProfileCouponQuery,
  createDefaultConsumerProfileCouponTabs,
  normalizeConsumerProfileCouponErrorMessage,
  normalizeConsumerProfileCouponList,
  resolveConsumerProfileCouponUserId,
} from "../../packages/mobile-core/src/profile-coupon-list.js";

export function createProfileCouponListPage({
  fetchUserCoupons = async () => ([]),
} = {}) {
  return {
    data() {
      return {
        loading: false,
        status: "",
        userId: "",
        coupons: [],
        tabs: createDefaultConsumerProfileCouponTabs(),
      };
    },
    onShow() {
      this.initUserAndLoad();
    },
    methods: {
      changeStatus(status) {
        if (this.status === status) return;
        this.status = status;
        void this.loadCoupons();
      },
      initUserAndLoad() {
        const profile = uni.getStorageSync("userProfile") || {};
        this.userId = resolveConsumerProfileCouponUserId({
          profile,
          storagePhone: uni.getStorageSync("phone"),
          storageUserId: uni.getStorageSync("userId"),
        });
        void this.loadCoupons();
      },
      async loadCoupons() {
        const query = buildConsumerProfileCouponQuery(this.userId, this.status);
        if (!query) {
          this.coupons = [];
          return;
        }

        this.loading = true;
        try {
          const response = await fetchUserCoupons(query);
          this.coupons = normalizeConsumerProfileCouponList(response);
        } catch (error) {
          this.coupons = [];
          uni.showToast({
            title: normalizeConsumerProfileCouponErrorMessage(error),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
    },
  };
}
