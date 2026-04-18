import { extractEnvelopeData } from "../../contracts/src/http.js";

function trimProfileOutreachText(value) {
  return String(value || "").trim();
}

function normalizeProfileOutreachObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export const DEFAULT_CONSUMER_PROFILE_COOPERATION_TYPE_OPTIONS = [
  { label: "用户反馈", value: "feedback" },
  { label: "商务合作", value: "cooperation" },
];

export const DEFAULT_CONSUMER_PROFILE_COOPERATION_CONTENT_MAX_LENGTH = 500;
export const DEFAULT_CONSUMER_PROFILE_COOPERATION_SUBJECT = "未填写主题";
export const DEFAULT_CONSUMER_PROFILE_COOPERATION_REQUIRED_MESSAGE =
  "请填写联系人、电话和内容";

export const DEFAULT_CONSUMER_INVITER_NAME = "悦享e食用户";
export const DEFAULT_CONSUMER_INVITE_CODE_ERROR_MESSAGE =
  "暂时无法获取邀请码，请稍后再试。";
export const DEFAULT_CONSUMER_INVITE_CODE_PLACEHOLDER = "暂未获取";
export const DEFAULT_CONSUMER_INVITE_MESSAGE_FALLBACK =
  "邀请码尚未获取成功，请稍后刷新页面后重试。";
export const DEFAULT_CONSUMER_INVITE_SHARE_TITLE = "邀请你加入悦享e食";
export const CONSUMER_INVITE_CODE_STORAGE_KEY = "inviteCode";
export const CONSUMER_PROFILE_STORAGE_KEY = "userProfile";
export const CONSUMER_INVITE_REGISTER_PAGE_URL =
  "/pages/auth/register/index";

export function createDefaultConsumerCooperationTypeOptions() {
  return DEFAULT_CONSUMER_PROFILE_COOPERATION_TYPE_OPTIONS.map((item) => ({ ...item }));
}

export function createDefaultConsumerCooperationForm() {
  return {
    subject: "",
    name: "",
    phone: "",
    content: "",
  };
}

export function normalizeConsumerCooperationTypeIndex(value) {
  const parsed = Number(value);
  if (
    Number.isInteger(parsed) &&
    parsed >= 0 &&
    parsed < DEFAULT_CONSUMER_PROFILE_COOPERATION_TYPE_OPTIONS.length
  ) {
    return parsed;
  }
  return 0;
}

export function normalizeConsumerCooperationForm(
  form = {},
  maxLength = DEFAULT_CONSUMER_PROFILE_COOPERATION_CONTENT_MAX_LENGTH,
) {
  const source = normalizeProfileOutreachObject(form);
  return {
    subject: trimProfileOutreachText(source.subject),
    name: trimProfileOutreachText(source.name),
    phone: trimProfileOutreachText(source.phone),
    content: trimProfileOutreachText(source.content).slice(0, maxLength),
  };
}

export function validateConsumerCooperationForm(form = {}) {
  const normalized = normalizeConsumerCooperationForm(form);
  if (!normalized.name || !normalized.phone || !normalized.content) {
    return {
      valid: false,
      message: DEFAULT_CONSUMER_PROFILE_COOPERATION_REQUIRED_MESSAGE,
    };
  }
  return { valid: true, message: "" };
}

export function buildConsumerCooperationPayload(form = {}, typeIndex = 0) {
  const normalizedForm = normalizeConsumerCooperationForm(form);
  const normalizedTypeIndex = normalizeConsumerCooperationTypeIndex(typeIndex);
  const cooperationType =
    DEFAULT_CONSUMER_PROFILE_COOPERATION_TYPE_OPTIONS[normalizedTypeIndex]
      ?.value || DEFAULT_CONSUMER_PROFILE_COOPERATION_TYPE_OPTIONS[0].value;

  return {
    company:
      normalizedForm.subject || DEFAULT_CONSUMER_PROFILE_COOPERATION_SUBJECT,
    contact_name: normalizedForm.name,
    contact_phone: normalizedForm.phone,
    cooperation_type: cooperationType,
    city: "",
    description: normalizedForm.content,
  };
}

export function resolveConsumerInviteProfile(profile = {}) {
  const source = normalizeProfileOutreachObject(profile);
  return {
    userId: trimProfileOutreachText(source.id || source.userId || source.phone),
    phone: trimProfileOutreachText(source.phone),
    name:
      trimProfileOutreachText(source.nickname || source.name) ||
      DEFAULT_CONSUMER_INVITER_NAME,
  };
}

export function extractConsumerInviteLandingUrl(payload) {
  const data = extractEnvelopeData(payload);
  const source =
    data && typeof data === "object" && !Array.isArray(data) ? data : payload;
  return trimProfileOutreachText(
    source?.invite_landing_url || source?.inviteLandingURL,
  );
}

export function extractConsumerInviteCode(payload) {
  const data = extractEnvelopeData(payload);
  const source =
    data && typeof data === "object" && !Array.isArray(data) ? data : payload;
  return trimProfileOutreachText(
    source?.code || source?.invite_code || source?.inviteCode,
  );
}

export function hasConsumerInviteCode(value) {
  return trimProfileOutreachText(value).length > 0;
}

export function resolveConsumerInviteCodeDisplay(
  inviteCode,
  fallback = DEFAULT_CONSUMER_INVITE_CODE_PLACEHOLDER,
) {
  const normalizedCode = trimProfileOutreachText(inviteCode);
  return normalizedCode || fallback;
}

export function buildConsumerInviteLink(inviteLandingURL, inviteCode) {
  const landingURL = trimProfileOutreachText(inviteLandingURL);
  const normalizedCode = trimProfileOutreachText(inviteCode);
  if (!landingURL || !normalizedCode) {
    return "";
  }
  const connector = landingURL.includes("?") ? "&" : "?";
  return `${landingURL}${connector}inviteCode=${encodeURIComponent(normalizedCode)}`;
}

export function buildConsumerInviteMessage({
  inviteCode,
  inviteLink = "",
  inviterName = DEFAULT_CONSUMER_INVITER_NAME,
} = {}) {
  const normalizedCode = trimProfileOutreachText(inviteCode);
  if (!normalizedCode) {
    return DEFAULT_CONSUMER_INVITE_MESSAGE_FALLBACK;
  }

  const normalizedInviterName =
    trimProfileOutreachText(inviterName) || DEFAULT_CONSUMER_INVITER_NAME;
  const normalizedInviteLink = trimProfileOutreachText(inviteLink);
  if (normalizedInviteLink) {
    return `${normalizedInviterName}邀请你体验悦享e食，邀请码：${normalizedCode}。注册时填写邀请码即可绑定邀请关系，注册链接：${normalizedInviteLink}`;
  }

  return `${normalizedInviterName}邀请你体验悦享e食，邀请码：${normalizedCode}。打开应用后，在注册页填写邀请码即可完成绑定。`;
}

export function buildConsumerInviteSharePath(inviteCode) {
  const normalizedCode = trimProfileOutreachText(inviteCode);
  if (!normalizedCode) {
    return CONSUMER_INVITE_REGISTER_PAGE_URL;
  }
  return `${CONSUMER_INVITE_REGISTER_PAGE_URL}?inviteCode=${encodeURIComponent(normalizedCode)}`;
}

export function buildConsumerInviteShareRecordPayload(
  profile = {},
  inviteCode = "",
) {
  const normalizedProfile = resolveConsumerInviteProfile(profile);
  return {
    userId: normalizedProfile.userId,
    phone: normalizedProfile.phone,
    code: trimProfileOutreachText(inviteCode),
  };
}

export function createProfileCooperationPage({
  submitCooperation = async () => ({}),
} = {}) {
  return {
    data() {
      return {
        typeOptions: createDefaultConsumerCooperationTypeOptions().map(
          (item) => item.label,
        ),
        typeIndex: 0,
        submitting: false,
        form: createDefaultConsumerCooperationForm(),
      };
    },
    methods: {
      goBack() {
        uni.navigateBack();
      },
      handleTypeChange(event) {
        this.typeIndex = normalizeConsumerCooperationTypeIndex(
          event?.detail?.value,
        );
      },
      async submitForm() {
        if (this.submitting) return;

        const validation = validateConsumerCooperationForm(this.form);
        if (!validation.valid) {
          uni.showToast({ title: validation.message, icon: "none" });
          return;
        }

        this.submitting = true;
        uni.showLoading({ title: "提交中..." });

        try {
          await submitCooperation(
            buildConsumerCooperationPayload(this.form, this.typeIndex),
          );
          uni.hideLoading();
          uni.showToast({ title: "提交成功", icon: "success" });
          this.form = createDefaultConsumerCooperationForm();
          this.typeIndex = 0;
        } catch (error) {
          console.error("提交反馈与合作失败:", error);
          uni.hideLoading();
          uni.showToast({ title: "提交失败，请稍后再试", icon: "none" });
        } finally {
          this.submitting = false;
        }
      },
    },
  };
}

export function createProfileInviteFriendsPage({
  fetchInviteCode = async () => ({}),
  fetchPublicRuntimeSettings = async () => ({}),
  recordInviteShare = async () => ({}),
} = {}) {
  return {
    data() {
      return {
        inviteCode: "",
        inviteLandingURL: "",
        inviterName: DEFAULT_CONSUMER_INVITER_NAME,
        codeStatus: "loading",
        codeErrorMessage: DEFAULT_CONSUMER_INVITE_CODE_ERROR_MESSAGE,
      };
    },
    computed: {
      hasInviteCode() {
        return hasConsumerInviteCode(this.inviteCode);
      },
      inviteCodeDisplay() {
        return resolveConsumerInviteCodeDisplay(this.inviteCode);
      },
      inviteLink() {
        return buildConsumerInviteLink(this.inviteLandingURL, this.inviteCode);
      },
      inviteMessage() {
        return buildConsumerInviteMessage({
          inviteCode: this.inviteCode,
          inviteLink: this.inviteLink,
          inviterName: this.inviterName,
        });
      },
    },
    onLoad() {
      void this.initializePage();
    },
    onShareAppMessage() {
      return {
        title: DEFAULT_CONSUMER_INVITE_SHARE_TITLE,
        path: buildConsumerInviteSharePath(this.inviteCode),
        desc: this.inviteMessage,
      };
    },
    methods: {
      resolveProfile() {
        return resolveConsumerInviteProfile(
          uni.getStorageSync(CONSUMER_PROFILE_STORAGE_KEY) || {},
        );
      },
      async initializePage() {
        const profile = this.resolveProfile();
        this.inviterName = profile.name;
        await Promise.allSettled([
          this.loadRuntimeSettings(),
          this.loadInviteCode(profile),
        ]);
      },
      async loadRuntimeSettings() {
        try {
          const response = await fetchPublicRuntimeSettings();
          this.inviteLandingURL = extractConsumerInviteLandingUrl(response);
        } catch (_error) {
          this.inviteLandingURL = "";
        }
      },
      async loadInviteCode(profile = this.resolveProfile()) {
        this.codeStatus = "loading";
        this.codeErrorMessage = DEFAULT_CONSUMER_INVITE_CODE_ERROR_MESSAGE;

        try {
          const response = await fetchInviteCode({
            userId: profile.userId,
            phone: profile.phone,
          });
          const nextCode = extractConsumerInviteCode(response);
          if (nextCode) {
            this.inviteCode = nextCode;
            this.codeStatus = "ready";
            uni.setStorageSync(CONSUMER_INVITE_CODE_STORAGE_KEY, nextCode);
            return;
          }
        } catch (_error) {
          // Only fall back to a previously cached real invite code.
        }

        const storedCode = resolveConsumerInviteCodeDisplay(
          uni.getStorageSync(CONSUMER_INVITE_CODE_STORAGE_KEY),
          "",
        );
        if (storedCode) {
          this.inviteCode = storedCode;
          this.codeStatus = "ready";
          return;
        }

        this.inviteCode = "";
        this.codeStatus = "error";
        this.codeErrorMessage = DEFAULT_CONSUMER_INVITE_CODE_ERROR_MESSAGE;
      },
      goBack() {
        uni.navigateBack();
      },
      copyText(text, title) {
        uni.setClipboardData({
          data: text,
          success: () => {
            uni.showToast({ title, icon: "success" });
          },
        });
      },
      copyCode() {
        if (!this.hasInviteCode) {
          uni.showToast({ title: this.codeErrorMessage, icon: "none" });
          return;
        }
        this.copyText(this.inviteCode, "邀请码已复制");
      },
      copyInviteLink() {
        if (!this.inviteLink) {
          uni.showToast({ title: "后台未配置邀请落地页", icon: "none" });
          return;
        }
        this.copyText(this.inviteLink, "注册链接已复制");
      },
      copyInviteText() {
        if (!this.hasInviteCode) {
          uni.showToast({ title: this.codeErrorMessage, icon: "none" });
          return;
        }
        this.copyText(this.inviteMessage, "邀请文案已复制");
      },
      recordShareAction() {
        if (!this.hasInviteCode) {
          return Promise.resolve();
        }

        return Promise.resolve(
          recordInviteShare(
            buildConsumerInviteShareRecordPayload(
              this.resolveProfile(),
              this.inviteCode,
            ),
          ),
        ).catch(() => null);
      },
      shareInvite() {
        if (!this.hasInviteCode) {
          uni.showToast({ title: this.codeErrorMessage, icon: "none" });
          return;
        }
        this.recordShareAction().finally(() => {
          this.copyInviteText();
        });
      },
    },
  };
}
