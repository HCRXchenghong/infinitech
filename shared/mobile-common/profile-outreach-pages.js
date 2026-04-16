import {
  buildConsumerCooperationPayload,
  buildConsumerInviteLink,
  buildConsumerInviteMessage,
  buildConsumerInviteSharePath,
  buildConsumerInviteShareRecordPayload,
  CONSUMER_INVITE_CODE_STORAGE_KEY,
  CONSUMER_PROFILE_STORAGE_KEY,
  createDefaultConsumerCooperationForm,
  createDefaultConsumerCooperationTypeOptions,
  DEFAULT_CONSUMER_INVITE_CODE_ERROR_MESSAGE,
  DEFAULT_CONSUMER_INVITE_SHARE_TITLE,
  DEFAULT_CONSUMER_INVITER_NAME,
  extractConsumerInviteCode,
  extractConsumerInviteLandingUrl,
  hasConsumerInviteCode,
  normalizeConsumerCooperationTypeIndex,
  resolveConsumerInviteCodeDisplay,
  resolveConsumerInviteProfile,
  validateConsumerCooperationForm,
} from "../../packages/mobile-core/src/profile-outreach.js";

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
