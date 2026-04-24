import { persistRoleAuthSessionFromAuthResult } from "../../client-sdk/src/role-auth-response.js";
import {
  createRoleLoginCodeCooldownController,
  pickRoleLoginErrorMessage,
  requestRoleLoginCode,
  validateRoleLoginPhoneInput,
} from "./role-login-portal.js";

function trimRiderLoginText(value) {
  return String(value == null ? "" : value).trim();
}

function resolveRiderLoginUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function showRiderLoginToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function scheduleRiderLoginTimeout(setTimeoutFn, callback, delay) {
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

function normalizeRiderLoginPortalRuntime(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export const RIDER_LOGIN_DEFAULT_TYPE = "code";
export const RIDER_LOGIN_SCENE = "rider_login";
export const RIDER_LOGIN_SUCCESS_DELAY = 500;
export const RIDER_LOGIN_SUCCESS_ROUTE = "/pages/hall/index";
export const RIDER_LOGIN_RESET_PASSWORD_ROUTE = "/pages/reset-password/index";
export const DEFAULT_RIDER_LOGIN_PORTAL_RUNTIME = Object.freeze({
  title: "骑手登录",
  subtitle: "请使用骑手账号登录",
  loginFooter: "登录后开始接单与配送",
});

function createDefaultRiderLoginState(portalRuntime = DEFAULT_RIDER_LOGIN_PORTAL_RUNTIME) {
  return {
    loginType: RIDER_LOGIN_DEFAULT_TYPE,
    phone: "",
    code: "",
    password: "",
    codeCooldown: 0,
    sendingCode: false,
    submitting: false,
    cooldownController: null,
    portalRuntime: {
      ...DEFAULT_RIDER_LOGIN_PORTAL_RUNTIME,
      ...normalizeRiderLoginPortalRuntime(portalRuntime),
    },
  };
}

export const DEFAULT_RIDER_LOGIN_STATE = Object.freeze(
  createDefaultRiderLoginState(),
);

export function buildRiderLoginPayload({ loginType = RIDER_LOGIN_DEFAULT_TYPE, phone = "", code = "", password = "" } = {}) {
  const normalizedType = trimRiderLoginText(loginType) === "password" ? "password" : "code";
  const normalizedPhone = trimRiderLoginText(phone);
  const payload = { phone: normalizedPhone };

  if (normalizedType === "password") {
    payload.password = trimRiderLoginText(password);
    return payload;
  }

  payload.code = trimRiderLoginText(code);
  return payload;
}

export function formatRiderLoginErrorMessage(error) {
  return pickRoleLoginErrorMessage(error, "登录失败", (rawError) => {
    const raw = String(
      rawError?.error
        || rawError?.message
        || rawError?.data?.error
        || rawError?.data?.message
        || "",
    ).toLowerCase();

    if (!raw) {
      return "";
    }
    if (raw.includes("rider not found") || raw.includes("骑手不存在")) {
      return "该手机号不是骑手账号，请使用骑手账号登录";
    }
    if (raw.includes("invalid password") || raw.includes("密码错误")) {
      return "登录密码错误，请重试";
    }
    if (raw.includes("invalid code") || raw.includes("验证码")) {
      return "验证码错误或已过期";
    }
    if (raw.includes("unauthorized") || raw.includes("401")) {
      return "账号或密码错误";
    }
    return "";
  });
}

export function createRiderLoginPageLogic(options = {}) {
  const {
    requestSMSCode,
    riderLogin,
    persistRiderAuthSession,
    getCachedPortalRuntimeSettings,
    loadPortalRuntimeSettings,
    getAppFn = globalThis.getApp,
    uniApp,
    setTimeoutFn,
  } = options;
  const runtimeUni = resolveRiderLoginUniRuntime(uniApp);

  return {
    data() {
      return createDefaultRiderLoginState(
        typeof getCachedPortalRuntimeSettings === "function"
          ? getCachedPortalRuntimeSettings()
          : {},
      );
    },
    onLoad() {
      this.cooldownController = this.createCooldownController();
      void this.loadPortalRuntime();
    },
    onUnload() {
      if (this.cooldownController?.clear) {
        this.cooldownController.clear();
      }
    },
    methods: {
      createCooldownController() {
        return createRoleLoginCodeCooldownController({
          setValue: (nextValue) => {
            this.codeCooldown = nextValue;
          },
        });
      },

      async loadPortalRuntime() {
        if (typeof loadPortalRuntimeSettings !== "function") {
          return;
        }
        const runtime = await loadPortalRuntimeSettings();
        this.portalRuntime = {
          ...this.portalRuntime,
          ...normalizeRiderLoginPortalRuntime(runtime),
        };
      },

      saveRiderSession(payload, phone) {
        persistRoleAuthSessionFromAuthResult({
          uniApp: runtimeUni,
          persistRoleAuthSession: persistRiderAuthSession,
          response: payload,
          profileFallback: { phone, nickname: "骑手" },
          extraStorageValues({ responseUser, profile }) {
            return {
              riderId: responseUser.id != null ? String(responseUser.id) : null,
              riderName:
                responseUser.name
                || responseUser.nickname
                || profile.nickname
                || "骑手",
            };
          },
        });
      },

      connectSocketAfterLogin() {
        try {
          const app = typeof getAppFn === "function" ? getAppFn() : null;
          const vm = app && app.$vm;
          if (vm && typeof vm.tryConnectSocket === "function") {
            vm.tryConnectSocket();
          }
        } catch (error) {
          if (typeof console !== "undefined" && console.error) {
            console.error("[RiderLogin] 触发 Socket 连接失败:", error);
          }
        }
      },

      switchLoginType(type) {
        this.loginType = trimRiderLoginText(type) === "password" ? "password" : "code";
        this.code = "";
        this.password = "";
      },

      goResetPassword() {
        if (runtimeUni && typeof runtimeUni.navigateTo === "function") {
          runtimeUni.navigateTo({ url: RIDER_LOGIN_RESET_PASSWORD_ROUTE });
        }
      },

      validatePhone() {
        const result = validateRoleLoginPhoneInput(this.phone);
        if (!result.phone) {
          showRiderLoginToast(runtimeUni, {
            title: result.error,
            icon: "none",
          });
          return "";
        }
        return result.phone;
      },

      formatLoginError(error) {
        return formatRiderLoginErrorMessage(error);
      },

      async sendCode() {
        if (this.codeCooldown > 0 || this.sendingCode) {
          return;
        }

        const cooldownController = this.cooldownController || this.createCooldownController();
        this.cooldownController = cooldownController;
        this.sendingCode = true;
        try {
          const result = await requestRoleLoginCode({
            phoneValue: this.phone,
            scene: RIDER_LOGIN_SCENE,
            requestSMSCode,
            cooldownController,
            failureMessage: "发送验证码失败",
          });
          if (!result.ok) {
            showRiderLoginToast(runtimeUni, {
              title: result.message,
              icon: "none",
            });
            return;
          }

          showRiderLoginToast(runtimeUni, {
            title: result.message,
            icon: "success",
          });
        } finally {
          this.sendingCode = false;
        }
      },

      async submit() {
        if (this.submitting) {
          return;
        }

        const phone = this.validatePhone();
        if (!phone) {
          return;
        }

        const payload = buildRiderLoginPayload({
          loginType: this.loginType,
          phone,
          code: this.code,
          password: this.password,
        });

        if (this.loginType === "code" && !payload.code) {
          showRiderLoginToast(runtimeUni, {
            title: "请输入验证码",
            icon: "none",
          });
          return;
        }

        if (this.loginType === "password" && !payload.password) {
          showRiderLoginToast(runtimeUni, {
            title: "请输入密码",
            icon: "none",
          });
          return;
        }

        this.submitting = true;
        try {
          const response = await riderLogin?.(payload);
          if (response?.success) {
            this.saveRiderSession(response, phone);
            this.connectSocketAfterLogin();
            showRiderLoginToast(runtimeUni, {
              title: "登录成功",
              icon: "success",
            });
            scheduleRiderLoginTimeout(setTimeoutFn, () => {
              if (runtimeUni && typeof runtimeUni.switchTab === "function") {
                runtimeUni.switchTab({ url: RIDER_LOGIN_SUCCESS_ROUTE });
              }
            }, RIDER_LOGIN_SUCCESS_DELAY);
            return;
          }

          showRiderLoginToast(runtimeUni, {
            title: this.formatLoginError(response),
            icon: "none",
          });
        } catch (error) {
          showRiderLoginToast(runtimeUni, {
            title: this.formatLoginError(error),
            icon: "none",
          });
        } finally {
          this.submitting = false;
        }
      },
    },
  };
}
