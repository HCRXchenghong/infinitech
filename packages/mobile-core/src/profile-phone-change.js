import { persistConsumerAuthSessionResult } from "./consumer-auth-session.js";
import {
  readConsumerStoredProfile,
  replaceConsumerStoredProfile,
} from "./consumer-profile-storage.js";

function trimPhoneChangeText(value) {
  return String(value || "").trim();
}

function normalizePhoneChangeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export const CONSUMER_PHONE_CHANGE_OLD_SCENE = "change_phone_verify";
export const CONSUMER_PHONE_CHANGE_NEW_SCENE = "change_phone_new";
export const DEFAULT_CONSUMER_PHONE_CHANGE_COUNTDOWN_SECONDS = 60;

export function normalizeConsumerPhoneChangePhone(value) {
  return trimPhoneChangeText(value);
}

export function maskConsumerPhoneChangePhone(value, fallback = "--") {
  const phone = normalizeConsumerPhoneChangePhone(value);
  if (/^1\d{10}$/.test(phone)) {
    return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
  }
  return phone || fallback;
}

export function normalizeConsumerPhoneChangeCode(value, length = 6) {
  return trimPhoneChangeText(value).slice(0, length);
}

export function isConsumerPhoneChangePhoneValid(value) {
  return /^1\d{10}$/.test(normalizeConsumerPhoneChangePhone(value));
}

export function isConsumerPhoneChangeCodeValid(value, length = 6) {
  return normalizeConsumerPhoneChangeCode(value, length).length === length;
}

export function isConsumerPhoneChangeNewPhoneValid(newPhone, oldPhone) {
  const normalizedNewPhone = normalizeConsumerPhoneChangePhone(newPhone);
  return (
    isConsumerPhoneChangePhoneValid(normalizedNewPhone) &&
    normalizedNewPhone !== normalizeConsumerPhoneChangePhone(oldPhone)
  );
}

export function resolveConsumerPhoneChangeOldPhone(profile = {}) {
  return normalizeConsumerPhoneChangePhone(profile?.phone);
}

export function resolveConsumerPhoneChangeUserId(profile = {}) {
  return trimPhoneChangeText(profile?.id || profile?.userId || profile?.phone);
}

export function normalizeConsumerPhoneChangeErrorMessage(
  error,
  fallback = "操作失败，请稍后重试",
) {
  const source = normalizePhoneChangeObject(error);
  const data = normalizePhoneChangeObject(source.data);
  return (
    trimPhoneChangeText(data.error) ||
    trimPhoneChangeText(data.message) ||
    trimPhoneChangeText(source.error) ||
    trimPhoneChangeText(source.message) ||
    trimPhoneChangeText(source.errMsg) ||
    fallback
  );
}

export function getConsumerPhoneChangeResponseMessage(response, fallback) {
  const source = normalizePhoneChangeObject(response);
  return trimPhoneChangeText(source.message) || fallback;
}

export function buildConsumerPhoneChangePayload({
  oldPhone = "",
  oldCode = "",
  newPhone = "",
  newCode = "",
} = {}) {
  return {
    oldPhone: normalizeConsumerPhoneChangePhone(oldPhone),
    oldCode: normalizeConsumerPhoneChangeCode(oldCode),
    newPhone: normalizeConsumerPhoneChangePhone(newPhone),
    newCode: normalizeConsumerPhoneChangeCode(newCode),
  };
}

export function normalizeConsumerPhoneChangeProfile(
  profile = {},
  responseUser = {},
  newPhone = "",
) {
  const current = normalizePhoneChangeObject(profile);
  const user = normalizePhoneChangeObject(responseUser);
  const normalizedPhone =
    normalizeConsumerPhoneChangePhone(newPhone) ||
    normalizeConsumerPhoneChangePhone(user.phone) ||
    normalizeConsumerPhoneChangePhone(current.phone);

  const nextProfile = {
    ...current,
    ...user,
    phone: normalizedPhone,
  };

  if (nextProfile.id || nextProfile.userId) {
    nextProfile.userId = trimPhoneChangeText(
      nextProfile.userId || nextProfile.id,
    );
  }

  return nextProfile;
}

export function getNextConsumerPhoneChangeCountdownValue(value) {
  const current = Number(value);
  if (!Number.isFinite(current) || current <= 1) {
    return 0;
  }
  return current - 1;
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
        readConsumerStoredProfile({ uniApp: uni }),
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
          readConsumerStoredProfile({ uniApp: uni }),
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
