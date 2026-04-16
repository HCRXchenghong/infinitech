import {
  createDefaultProfileHomeMoreEntries,
  createDefaultProfileHomeTools,
  DEFAULT_CONSUMER_PROFILE_NAME,
  extractConsumerProfilePayload,
  formatConsumerProfileSavedAmount,
  buildConsumerProfileHeaderStyle,
  maskConsumerProfilePhone,
  normalizeConsumerProfileViewModel,
  resolveConsumerProfileUserId,
} from "../../packages/mobile-core/src/profile-home.js";

export function createProfileHomePage({ fetchUser } = {}) {
  return {
    data() {
      return {
        nickname: DEFAULT_CONSUMER_PROFILE_NAME,
        avatarUrl: "",
        phone: "",
        headerBg: "",
        savedAmount: 0,
        vipLabel: "SVIP",
        isVip: false,
        tools: createDefaultProfileHomeTools(),
        moreEntries: createDefaultProfileHomeMoreEntries(),
      };
    },
    computed: {
      displayName() {
        return normalizeConsumerProfileViewModel({}, this).nickname;
      },
      phoneMasked() {
        return maskConsumerProfilePhone(this.phone);
      },
      savedAmountText() {
        return formatConsumerProfileSavedAmount(this.savedAmount);
      },
      headerStyle() {
        return buildConsumerProfileHeaderStyle(this.headerBg);
      },
    },
    onShow() {
      void this.bootstrap();
    },
    methods: {
      applyProfile(profile = {}) {
        const next = normalizeConsumerProfileViewModel(profile, this);
        this.nickname = next.nickname;
        this.avatarUrl = next.avatarUrl;
        this.phone = next.phone;
        this.headerBg = next.headerBg;
        this.savedAmount = next.savedAmount;
        this.vipLabel = next.vipLabel;
        this.isVip = next.isVip;
      },
      syncLocalProfile(patch = {}) {
        const current = uni.getStorageSync("userProfile") || {};
        uni.setStorageSync("userProfile", {
          ...current,
          ...patch,
        });
      },
      async bootstrap() {
        if (uni.getStorageSync("authMode") !== "user") {
          uni.reLaunch({ url: "/pages/auth/login/index" });
          return;
        }

        const localProfile = uni.getStorageSync("userProfile") || {};
        this.applyProfile(localProfile);

        const userId = resolveConsumerProfileUserId(localProfile);
        if (!userId) {
          return;
        }

        try {
          const remoteProfile = extractConsumerProfilePayload(await fetchUser(userId));
          this.syncLocalProfile(remoteProfile);
          this.applyProfile(remoteProfile);
        } catch (error) {
          console.error("加载用户资料失败:", error);
        }
      },
      go(path) {
        if (!path) return;
        uni.navigateTo({ url: path });
      },
      goEditProfile() {
        uni.navigateTo({ url: "/pages/profile/edit/index" });
      },
      goChangePhone() {
        uni.navigateTo({ url: "/pages/profile/phone-change/index" });
      },
      goWallet() {
        uni.navigateTo({ url: "/pages/profile/wallet/index" });
      },
      goVip() {
        uni.navigateTo({ url: "/pages/profile/vip-center/index" });
      },
    },
  };
}
