import {
  hasConsumerStoredAuthMode,
  mergeConsumerStoredProfilePatch,
  readConsumerStoredProfile,
} from "./consumer-profile-storage.js";

function trimProfileText(value) {
  return String(value || "").trim();
}

function normalizeProfileNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

export const DEFAULT_CONSUMER_PROFILE_NAME = "悦享e食用户";

export const DEFAULT_PROFILE_HOME_TOOLS = [
  {
    icon: "/static/icons/location.svg",
    label: "我的地址",
    path: "/pages/profile/address-list/index",
    colorClass: "blue",
  },
  {
    icon: "/static/icons/star.svg",
    label: "我的收藏",
    path: "/pages/profile/favorites/index",
    colorClass: "yellow",
  },
  {
    icon: "/static/icons/comment.svg",
    label: "我的评价",
    path: "/pages/profile/my-reviews/index",
    colorClass: "green",
  },
];

export const DEFAULT_PROFILE_HOME_MORE_ENTRIES = [
  {
    icon: "/static/icons/gift.svg",
    label: "邀请好友",
    path: "/pages/profile/invite-friends/index",
  },
  {
    icon: "/static/icons/briefcase.svg",
    label: "反馈与合作",
    path: "/pages/profile/cooperation/index",
  },
  {
    icon: "/static/icons/settings.svg",
    label: "系统设置",
    path: "/pages/profile/settings/index",
  },
];

export function createDefaultProfileHomeTools() {
  return DEFAULT_PROFILE_HOME_TOOLS.map((item) => ({ ...item }));
}

export function createDefaultProfileHomeMoreEntries() {
  return DEFAULT_PROFILE_HOME_MORE_ENTRIES.map((item) => ({ ...item }));
}

export function maskConsumerProfilePhone(
  value,
  fallback = "点击绑定手机号",
) {
  const phone = trimProfileText(value);
  if (/^1\d{10}$/.test(phone)) {
    return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
  }
  return fallback;
}

export function formatConsumerProfileSavedAmount(value) {
  return `¥${normalizeProfileNumber(value).toFixed(2)}`;
}

export function buildConsumerProfileHeaderStyle(background) {
  const normalized = trimProfileText(background);
  if (!normalized) {
    return {};
  }
  if (normalized.startsWith("linear-gradient")) {
    return { background: normalized };
  }
  return {
    backgroundImage: `url(${normalized})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

export function extractConsumerProfilePayload(payload) {
  if (payload?.user && typeof payload.user === "object") {
    return payload.user;
  }
  return payload && typeof payload === "object" ? payload : {};
}

export function resolveConsumerProfileUserId(profile = {}) {
  return trimProfileText(profile.id || profile.userId || "");
}

export function normalizeConsumerProfileViewModel(profile = {}, fallback = {}) {
  const source =
    profile && typeof profile === "object" && !Array.isArray(profile)
      ? profile
      : {};
  const current =
    fallback && typeof fallback === "object" && !Array.isArray(fallback)
      ? fallback
      : {};
  const memberLabelSource = trimProfileText(
    source.vipLabel || source.membershipName || source.memberLevelName,
  );
  const vipLabel =
    memberLabelSource ||
    trimProfileText(current.vipLabel) ||
    "SVIP";

  return {
    nickname:
      trimProfileText(source.nickname || source.name) ||
      trimProfileText(current.nickname) ||
      DEFAULT_CONSUMER_PROFILE_NAME,
    avatarUrl:
      trimProfileText(source.avatarUrl) || trimProfileText(current.avatarUrl),
    phone: trimProfileText(source.phone) || trimProfileText(current.phone),
    headerBg:
      trimProfileText(source.headerBg) || trimProfileText(current.headerBg),
    savedAmount: normalizeProfileNumber(
      source.savedAmount ??
        source.monthlySavedAmount ??
        source.monthSavedAmount ??
        current.savedAmount,
    ),
    vipLabel,
    isVip: Boolean(
      source.isVip || source.vip || memberLabelSource || current.isVip,
    ),
  };
}

export function createProfileHomePage({ fetchUser = async () => ({}) } = {}) {
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
        return mergeConsumerStoredProfilePatch({
          patch,
          uniApp: uni,
        });
      },
      async bootstrap() {
        if (!hasConsumerStoredAuthMode({ uniApp: uni })) {
          uni.reLaunch({ url: "/pages/auth/login/index" });
          return;
        }

        const localProfile = readConsumerStoredProfile({ uniApp: uni });
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
