import {
  createRolePasswordChangeCountdownController,
  normalizeRolePasswordChangeVerifyType,
  requestRolePasswordChangeCode,
  submitRolePasswordChange,
} from "./role-password-change-portal.js";

function trimRiderChangePasswordText(value) {
  return String(value == null ? "" : value).trim();
}

function resolveRiderChangePasswordUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function showRiderChangePasswordToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function scheduleRiderChangePasswordTimeout(setTimeoutFn, callback, delay) {
  if (typeof setTimeoutFn === "function") {
    setTimeoutFn(callback, delay);
    return;
  }

  if (typeof globalThis.setTimeout === "function") {
    globalThis.setTimeout(callback, delay);
    return;
  }

  callback();
}

function createDefaultRiderChangePasswordState() {
  return {
    verifyType: "password",
    oldPassword: "",
    phone: "",
    code: "",
    nextPassword: "",
    confirmPassword: "",
    codeCooldown: 0,
    codeCooldownController: null,
    sendingCode: false,
    submitting: false,
  };
}

export const RIDER_CHANGE_PASSWORD_BACK_DELAY = 1500;
export const DEFAULT_RIDER_CHANGE_PASSWORD_STATE = Object.freeze(
  createDefaultRiderChangePasswordState(),
);

export function createRiderChangePasswordPageLogic(options = {}) {
  const {
    requestSMSCode,
    changePassword,
    readRiderAuthIdentity,
    uniApp,
    setTimeoutFn,
  } = options;
  const runtimeUni = resolveRiderChangePasswordUniRuntime(uniApp);

  return {
    data() {
      return createDefaultRiderChangePasswordState();
    },
    onLoad() {
      const riderAuth =
        typeof readRiderAuthIdentity === "function"
          ? readRiderAuthIdentity({ uniApp: runtimeUni })
          : {};
      if (riderAuth && riderAuth.riderPhone) {
        this.phone = trimRiderChangePasswordText(riderAuth.riderPhone);
      }
      this.codeCooldownController = this.createCountdownController();
    },
    onUnload() {
      this.clearCooldownController();
    },
    methods: {
      switchVerifyType(type) {
        this.verifyType = normalizeRolePasswordChangeVerifyType(type);
        if (this.verifyType === "password") {
          this.code = "";
          return;
        }
        this.oldPassword = "";
      },

      createCountdownController() {
        return createRolePasswordChangeCountdownController({
          setValue: (value) => {
            this.codeCooldown = value;
          },
        });
      },

      clearCooldownController() {
        if (this.codeCooldownController?.clear) {
          this.codeCooldownController.clear();
          this.codeCooldownController = null;
        }
      },

      async sendCode() {
        if (this.codeCooldown > 0 || this.sendingCode) {
          return;
        }

        this.sendingCode = true;
        try {
          const cooldownController =
            this.codeCooldownController || this.createCountdownController();
          this.codeCooldownController = cooldownController;

          const result = await requestRolePasswordChangeCode({
            phoneValue: this.phone,
            scene: "rider_change_password",
            requestSMSCode,
            cooldownController,
            extra: { targetType: "rider" },
            invalidPhoneMessage: "请输入正确手机号",
            failureMessage: "发送失败",
          });

          if (!result.ok) {
            showRiderChangePasswordToast(runtimeUni, {
              title: result.message,
              icon: "none",
            });
            return;
          }

          this.phone = result.phone;
          showRiderChangePasswordToast(runtimeUni, {
            title: result.message,
            icon: "success",
          });
        } finally {
          this.sendingCode = false;
        }
      },

      async submitChangePassword() {
        if (this.submitting) {
          return;
        }

        this.submitting = true;
        try {
          const result = await submitRolePasswordChange({
            verifyTypeValue: this.verifyType,
            oldPasswordValue: this.oldPassword,
            phoneValue: this.phone,
            codeValue: this.code,
            nextPasswordValue: this.nextPassword,
            confirmPasswordValue: this.confirmPassword,
            changePassword,
            emptyCurrentPasswordMessage: "请输入原密码",
            invalidPhoneMessage: "请输入正确手机号",
            invalidCodeMessage: "请输入6位验证码",
            shortPasswordMessage: "密码至少6位",
            mismatchPasswordMessage: "两次密码不一致",
            failureMessage: "修改失败",
            successMessage: "密码修改成功",
          });

          if (!result.ok) {
            showRiderChangePasswordToast(runtimeUni, {
              title: result.message,
              icon: "none",
            });
            return;
          }

          if (result.payload?.phone) {
            this.phone = result.payload.phone;
          }

          showRiderChangePasswordToast(runtimeUni, {
            title: result.message,
            icon: "success",
          });

          scheduleRiderChangePasswordTimeout(setTimeoutFn, () => {
            if (runtimeUni && typeof runtimeUni.navigateBack === "function") {
              runtimeUni.navigateBack();
            }
          }, RIDER_CHANGE_PASSWORD_BACK_DELAY);
        } finally {
          this.submitting = false;
        }
      },
    },
  };
}
