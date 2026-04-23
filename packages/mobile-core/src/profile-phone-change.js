import { persistConsumerAuthSessionResult } from "./consumer-auth-session.js";
import {
  readConsumerStoredProfile,
  replaceConsumerStoredProfile,
} from "./consumer-profile-storage.js";
import {
  buildRolePhoneChangePayload,
  createRolePhoneChangeCountdownController,
  DEFAULT_ROLE_PHONE_CHANGE_COUNTDOWN_SECONDS,
  getNextRolePhoneChangeCountdownValue,
  getRolePhoneChangeResponseMessage,
  isRolePhoneChangeCodeValid,
  isRolePhoneChangeNewPhoneValid,
  isRolePhoneChangePhoneValid,
  maskRolePhoneChangePhone,
  normalizeRolePhoneChangeCode,
  normalizeRolePhoneChangeErrorMessage,
  normalizeRolePhoneChangePhone,
  normalizeRolePhoneChangeProfile,
  requestRolePhoneChangeCode,
  resolveRolePhoneChangeProfileId,
  resolveRolePhoneChangeProfilePhone,
  ROLE_PHONE_CHANGE_NEW_SCENE,
  ROLE_PHONE_CHANGE_OLD_SCENE,
  verifyRolePhoneChangeCode,
} from "./role-phone-change-portal.js";

export const CONSUMER_PHONE_CHANGE_OLD_SCENE = ROLE_PHONE_CHANGE_OLD_SCENE;
export const CONSUMER_PHONE_CHANGE_NEW_SCENE = ROLE_PHONE_CHANGE_NEW_SCENE;
export const DEFAULT_CONSUMER_PHONE_CHANGE_COUNTDOWN_SECONDS =
  DEFAULT_ROLE_PHONE_CHANGE_COUNTDOWN_SECONDS;

export function normalizeConsumerPhoneChangePhone(value) {
  return normalizeRolePhoneChangePhone(value);
}

export function maskConsumerPhoneChangePhone(value, fallback = "--") {
  return maskRolePhoneChangePhone(value, fallback);
}

export function normalizeConsumerPhoneChangeCode(value, length = 6) {
  return normalizeRolePhoneChangeCode(value, length);
}

export function isConsumerPhoneChangePhoneValid(value) {
  return isRolePhoneChangePhoneValid(value);
}

export function isConsumerPhoneChangeCodeValid(value, length = 6) {
  return isRolePhoneChangeCodeValid(value, length);
}

export function isConsumerPhoneChangeNewPhoneValid(newPhone, oldPhone) {
  return isRolePhoneChangeNewPhoneValid(newPhone, oldPhone);
}

export function resolveConsumerPhoneChangeOldPhone(profile = {}) {
  return resolveRolePhoneChangeProfilePhone(profile);
}

export function resolveConsumerPhoneChangeUserId(profile = {}) {
  return resolveRolePhoneChangeProfileId(profile);
}

export function normalizeConsumerPhoneChangeErrorMessage(
  error,
  fallback = "操作失败，请稍后重试",
) {
  return normalizeRolePhoneChangeErrorMessage(error, fallback);
}

export function getConsumerPhoneChangeResponseMessage(response, fallback) {
  return getRolePhoneChangeResponseMessage(response, fallback);
}

export function buildConsumerPhoneChangePayload({
  oldPhone = "",
  oldCode = "",
  newPhone = "",
  newCode = "",
} = {}) {
  return buildRolePhoneChangePayload({
    oldPhone,
    oldCode,
    newPhone,
    newCode,
  });
}

export function normalizeConsumerPhoneChangeProfile(
  profile = {},
  responseUser = {},
  newPhone = "",
) {
  return normalizeRolePhoneChangeProfile(profile, responseUser, newPhone);
}

export function getNextConsumerPhoneChangeCountdownValue(value) {
  return getNextRolePhoneChangeCountdownValue(value);
}

export function createProfilePhoneChangePage({
  changeUserPhone = async () => ({}),
  persistConsumerAuthSessionResultImpl = persistConsumerAuthSessionResult,
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
        oldCountdownController: null,
        newPhone: "",
        newCode: "",
        newCountdown: 0,
        newCountdownController: null,
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
        readConsumerStoredProfile({ uniApp: uni }),
      );
      this.oldCountdownController = createRolePhoneChangeCountdownController({
        setValue: (value) => {
          this.oldCountdown = value;
        },
      });
      this.newCountdownController = createRolePhoneChangeCountdownController({
        setValue: (value) => {
          this.newCountdown = value;
        },
      });
    },
    onUnload() {
      this.clearTimer("old");
      this.clearTimer("new");
    },
    methods: {
      clearTimer(which) {
        if (which === "old" && this.oldCountdownController?.clear) {
          this.oldCountdownController.clear();
          this.oldCountdownController = null;
        }
        if (which === "new" && this.newCountdownController?.clear) {
          this.newCountdownController.clear();
          this.newCountdownController = null;
        }
      },
      startCountdown(which) {
        if (which === "old") {
          if (!this.oldCountdownController) {
            this.oldCountdownController = createRolePhoneChangeCountdownController({
              setValue: (value) => {
                this.oldCountdown = value;
              },
            });
          }
          this.oldCountdownController.start(
            DEFAULT_CONSUMER_PHONE_CHANGE_COUNTDOWN_SECONDS,
          );
          return;
        }

        if (!this.newCountdownController) {
          this.newCountdownController = createRolePhoneChangeCountdownController({
            setValue: (value) => {
              this.newCountdown = value;
            },
          });
        }
        this.newCountdownController.start(
          DEFAULT_CONSUMER_PHONE_CHANGE_COUNTDOWN_SECONDS,
        );
      },
      resolveUserId() {
        return resolveConsumerPhoneChangeUserId(
          readConsumerStoredProfile({ uniApp: uni }),
        );
      },
      resolveErrorMessage(error, fallback = "操作失败，请稍后重试") {
        return normalizeConsumerPhoneChangeErrorMessage(error, fallback);
      },
      async sendOldCode() {
        if (this.oldCountdown > 0 || this.loading) return;

        this.loading = true;
        try {
          const result = await requestRolePhoneChangeCode({
            step: "old",
            phoneValue: this.oldPhone,
            scene: CONSUMER_PHONE_CHANGE_OLD_SCENE,
            requestSMSCode,
            extra: { targetType: "user" },
            cooldownController: {
              start: () => this.startCountdown("old"),
            },
            invalidPhoneMessage: "当前手机号无效，请重新登录",
            failureMessage: "发送验证码失败",
          });
          if (!result.ok) {
            uni.showToast({ title: result.message, icon: "none" });
            return;
          }

          uni.showToast({ title: result.message, icon: "success" });
        } finally {
          this.loading = false;
        }
      },
      async toStep2() {
        if (!this.oldCodeValid || this.loading) return;

        this.loading = true;
        try {
          const result = await verifyRolePhoneChangeCode({
            phoneValue: this.oldPhone,
            codeValue: this.oldCode,
            scene: CONSUMER_PHONE_CHANGE_OLD_SCENE,
            verifySMSCodeCheck,
            invalidPhoneMessage: "当前手机号无效，请重新登录",
            invalidCodeMessage: "请输入6位验证码",
            failureMessage: "原手机号验证失败",
            successMessage: "验证通过",
          });
          if (!result.ok) {
            uni.showToast({ title: result.message, icon: "none" });
            return;
          }
          this.step = 2;
          uni.showToast({ title: result.message, icon: "success" });
        } finally {
          this.loading = false;
        }
      },
      async sendNewCode() {
        if (this.newCountdown > 0 || this.loading) return;

        this.loading = true;
        try {
          const result = await requestRolePhoneChangeCode({
            step: "new",
            phoneValue: this.newPhone,
            oldPhoneValue: this.oldPhone,
            scene: CONSUMER_PHONE_CHANGE_NEW_SCENE,
            requestSMSCode,
            extra: { targetType: "user" },
            cooldownController: {
              start: () => this.startCountdown("new"),
            },
            invalidPhoneMessage: "请输入未注册的新手机号",
            samePhoneMessage: "请输入未注册的新手机号",
            failureMessage: "发送验证码失败",
          });
          if (!result.ok) {
            uni.showToast({ title: result.message, icon: "none" });
            return;
          }

          uni.showToast({ title: result.message, icon: "success" });
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

          const nextProfile = normalizeConsumerPhoneChangeProfile(
            readConsumerStoredProfile({ uniApp: uni }),
            response.user,
            this.newPhone,
          );
          const persistedSession = persistConsumerAuthSessionResultImpl({
            result: response,
            profile: nextProfile,
            saveTokenInfo,
            uniApp: uni,
          });
          if (!persistedSession.persisted) {
            replaceConsumerStoredProfile({
              profile: nextProfile,
              uniApp: uni,
            });
          }

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
