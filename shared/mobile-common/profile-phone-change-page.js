import {
  buildConsumerPhoneChangePayload,
  CONSUMER_PHONE_CHANGE_NEW_SCENE,
  CONSUMER_PHONE_CHANGE_OLD_SCENE,
  DEFAULT_CONSUMER_PHONE_CHANGE_COUNTDOWN_SECONDS,
  getConsumerPhoneChangeResponseMessage,
  getNextConsumerPhoneChangeCountdownValue,
  isConsumerPhoneChangeCodeValid,
  isConsumerPhoneChangeNewPhoneValid,
  isConsumerPhoneChangePhoneValid,
  maskConsumerPhoneChangePhone,
  normalizeConsumerPhoneChangeCode,
  normalizeConsumerPhoneChangeErrorMessage,
  normalizeConsumerPhoneChangeProfile,
  resolveConsumerPhoneChangeOldPhone,
  resolveConsumerPhoneChangeUserId,
} from "../../packages/mobile-core/src/profile-phone-change.js";

export function createProfilePhoneChangePage({
  changeUserPhone = async () => ({}),
  requestSMSCode = async () => ({}),
  saveTokenInfo = () => {},
  verifySMSCodeCheck = async () => ({}),
} = {}) {
  return {
    data() {
      return {
        step: 1,
        oldPhone: "",
        oldCode: "",
        oldCountdown: 0,
        oldTimer: null,
        newPhone: "",
        newCode: "",
        newCountdown: 0,
        newTimer: null,
        loading: false,
      };
    },
    computed: {
      oldPhoneMasked() {
        return maskConsumerPhoneChangePhone(this.oldPhone);
      },
      oldCodeValid() {
        return isConsumerPhoneChangeCodeValid(this.oldCode);
      },
      newPhoneValid() {
        return isConsumerPhoneChangeNewPhoneValid(this.newPhone, this.oldPhone);
      },
      newCodeValid() {
        return this.newPhoneValid && isConsumerPhoneChangeCodeValid(this.newCode);
      },
    },
    onLoad() {
      this.oldPhone = resolveConsumerPhoneChangeOldPhone(
        uni.getStorageSync("userProfile") || {},
      );
    },
    onUnload() {
      this.clearTimer("old");
      this.clearTimer("new");
    },
    methods: {
      clearTimer(which) {
        if (which === "old" && this.oldTimer) {
          clearInterval(this.oldTimer);
          this.oldTimer = null;
        }
        if (which === "new" && this.newTimer) {
          clearInterval(this.newTimer);
          this.newTimer = null;
        }
      },
      startCountdown(which) {
        if (which === "old") {
          this.oldCountdown = DEFAULT_CONSUMER_PHONE_CHANGE_COUNTDOWN_SECONDS;
          this.clearTimer("old");
          this.oldTimer = setInterval(() => {
            this.oldCountdown = getNextConsumerPhoneChangeCountdownValue(
              this.oldCountdown,
            );
            if (this.oldCountdown === 0) {
              this.clearTimer("old");
            }
          }, 1000);
          return;
        }

        this.newCountdown = DEFAULT_CONSUMER_PHONE_CHANGE_COUNTDOWN_SECONDS;
        this.clearTimer("new");
        this.newTimer = setInterval(() => {
          this.newCountdown = getNextConsumerPhoneChangeCountdownValue(
            this.newCountdown,
          );
          if (this.newCountdown === 0) {
            this.clearTimer("new");
          }
        }, 1000);
      },
      resolveUserId() {
        return resolveConsumerPhoneChangeUserId(
          uni.getStorageSync("userProfile") || {},
        );
      },
      resolveErrorMessage(error, fallback = "操作失败，请稍后重试") {
        return normalizeConsumerPhoneChangeErrorMessage(error, fallback);
      },
      async sendOldCode() {
        if (this.oldCountdown > 0 || this.loading) return;
        if (!isConsumerPhoneChangePhoneValid(this.oldPhone)) {
          uni.showToast({ title: "当前手机号无效，请重新登录", icon: "none" });
          return;
        }

        this.loading = true;
        try {
          const response = await requestSMSCode(
            this.oldPhone,
            CONSUMER_PHONE_CHANGE_OLD_SCENE,
            { targetType: "user" },
          );
          uni.showToast({
            title: getConsumerPhoneChangeResponseMessage(response, "验证码已发送"),
            icon: "success",
          });
          this.startCountdown("old");
        } catch (error) {
          uni.showToast({
            title: this.resolveErrorMessage(error, "发送验证码失败"),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
      async toStep2() {
        if (!this.oldCodeValid || this.loading) return;

        this.loading = true;
        try {
          const response = await verifySMSCodeCheck(
            this.oldPhone,
            CONSUMER_PHONE_CHANGE_OLD_SCENE,
            normalizeConsumerPhoneChangeCode(this.oldCode),
          );
          if (response.success === false) {
            throw response;
          }
          this.step = 2;
          uni.showToast({
            title: getConsumerPhoneChangeResponseMessage(response, "验证通过"),
            icon: "success",
          });
        } catch (error) {
          uni.showToast({
            title: this.resolveErrorMessage(error, "原手机号验证失败"),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
      async sendNewCode() {
        if (this.newCountdown > 0 || this.loading) return;
        if (!this.newPhoneValid) {
          uni.showToast({ title: "请输入未注册的新手机号", icon: "none" });
          return;
        }

        this.loading = true;
        try {
          const response = await requestSMSCode(
            this.newPhone,
            CONSUMER_PHONE_CHANGE_NEW_SCENE,
            { targetType: "user" },
          );
          uni.showToast({
            title: getConsumerPhoneChangeResponseMessage(response, "验证码已发送"),
            icon: "success",
          });
          this.startCountdown("new");
        } catch (error) {
          uni.showToast({
            title: this.resolveErrorMessage(error, "发送验证码失败"),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
      async submit() {
        if (!this.newCodeValid || this.loading) return;

        const userId = this.resolveUserId();
        if (!userId) {
          uni.showToast({ title: "登录状态已失效，请重新登录", icon: "none" });
          return;
        }

        this.loading = true;
        try {
          const response = await changeUserPhone(
            userId,
            buildConsumerPhoneChangePayload({
              oldPhone: this.oldPhone,
              oldCode: this.oldCode,
              newPhone: this.newPhone,
              newCode: this.newCode,
            }),
          );
          if (response.success === false) {
            throw response;
          }

          if (response.token && response.refreshToken) {
            saveTokenInfo(
              response.token,
              response.refreshToken,
              response.expiresIn || 7200,
            );
          }

          const nextProfile = normalizeConsumerPhoneChangeProfile(
            uni.getStorageSync("userProfile") || {},
            response.user,
            this.newPhone,
          );
          uni.setStorageSync("userProfile", nextProfile);

          uni.showToast({
            title: getConsumerPhoneChangeResponseMessage(response, "修改成功"),
            icon: "success",
          });
          setTimeout(() => uni.navigateBack(), 500);
        } catch (error) {
          uni.showToast({
            title: this.resolveErrorMessage(error, "修改失败"),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
    },
  };
}
