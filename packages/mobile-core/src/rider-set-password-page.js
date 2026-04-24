import {
  resolveRolePasswordResetTicket,
  submitRolePasswordResetNextPassword,
} from "./role-password-reset-portal.js";

function resolveRiderSetPasswordUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function normalizeRiderSetPasswordPortalRuntime(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function showRiderSetPasswordToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function scheduleRiderSetPasswordTimeout(setTimeoutFn, callback, delay) {
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

export const RIDER_SET_PASSWORD_LOGIN_ROUTE = "/pages/login/index";
export const RIDER_SET_PASSWORD_RESET_ROUTE = "/pages/reset-password/index";
export const RIDER_SET_PASSWORD_SUBMIT_DELAY = 1500;
export const RIDER_SET_PASSWORD_MISSING_TICKET_DELAY = 1500;
export const DEFAULT_RIDER_SET_PASSWORD_PORTAL_RUNTIME = Object.freeze({
  title: "设置新密码",
  subtitle: "完成新密码设置后返回登录",
});

function createDefaultRiderSetPasswordState(portalRuntime = DEFAULT_RIDER_SET_PASSWORD_PORTAL_RUNTIME) {
  return {
    phone: "",
    code: "",
    password: "",
    confirmPassword: "",
    submitting: false,
    portalRuntime: {
      ...DEFAULT_RIDER_SET_PASSWORD_PORTAL_RUNTIME,
      ...normalizeRiderSetPasswordPortalRuntime(portalRuntime),
    },
  };
}

export const DEFAULT_RIDER_SET_PASSWORD_STATE = Object.freeze(
  createDefaultRiderSetPasswordState(),
);

export function createRiderSetPasswordPageLogic(options = {}) {
  const {
    getCachedPortalRuntimeSettings,
    loadPortalRuntimeSettings,
    submitSetNewPassword,
    uniApp,
    setTimeoutFn,
  } = options;
  const runtimeUni = resolveRiderSetPasswordUniRuntime(uniApp);

  return {
    data() {
      return createDefaultRiderSetPasswordState(
        typeof getCachedPortalRuntimeSettings === "function"
          ? getCachedPortalRuntimeSettings()
          : {},
      );
    },
    onLoad(pageOptions) {
      void this.loadPortalRuntime();

      const cachedResetData =
        runtimeUni && typeof runtimeUni.getStorageSync === "function"
          ? runtimeUni.getStorageSync("reset_password_data")
          : {};
      const resetTicket = resolveRolePasswordResetTicket(pageOptions, cachedResetData);
      this.phone = resetTicket.phone;
      this.code = resetTicket.code;

      if (!this.phone || !this.code) {
        showRiderSetPasswordToast(runtimeUni, {
          title: "请先完成验证码校验",
          icon: "none",
        });
        scheduleRiderSetPasswordTimeout(setTimeoutFn, () => {
          if (runtimeUni && typeof runtimeUni.navigateBack === "function") {
            runtimeUni.navigateBack();
          }
        }, RIDER_SET_PASSWORD_MISSING_TICKET_DELAY);
      }
    },
    methods: {
      async loadPortalRuntime() {
        if (typeof loadPortalRuntimeSettings !== "function") {
          return;
        }
        const runtime = await loadPortalRuntimeSettings();
        this.portalRuntime = {
          ...this.portalRuntime,
          ...normalizeRiderSetPasswordPortalRuntime(runtime),
        };
      },

      goLogin() {
        if (runtimeUni && typeof runtimeUni.redirectTo === "function") {
          runtimeUni.redirectTo({ url: RIDER_SET_PASSWORD_LOGIN_ROUTE });
        }
      },

      async submit() {
        if (this.submitting) {
          return;
        }

        if (!this.phone || !this.code) {
          showRiderSetPasswordToast(runtimeUni, {
            title: "校验信息已失效，请重新验证",
            icon: "none",
          });
          scheduleRiderSetPasswordTimeout(setTimeoutFn, () => {
            if (runtimeUni && typeof runtimeUni.redirectTo === "function") {
              runtimeUni.redirectTo({ url: RIDER_SET_PASSWORD_RESET_ROUTE });
            }
          }, RIDER_SET_PASSWORD_MISSING_TICKET_DELAY);
          return;
        }

        this.submitting = true;
        try {
          const result = await submitRolePasswordResetNextPassword({
            phoneValue: this.phone,
            codeValue: this.code,
            passwordValue: this.password,
            confirmPasswordValue: this.confirmPassword,
            storage: runtimeUni,
            loginUrl: RIDER_SET_PASSWORD_LOGIN_ROUTE,
            resetPasswordUrl: RIDER_SET_PASSWORD_RESET_ROUTE,
            successMessage: "密码设置成功",
            submitSetNewPassword,
          });
          if (!result.ok) {
            showRiderSetPasswordToast(runtimeUni, {
              title: result.message,
              icon: "none",
            });
            if (result.reason === "missing_ticket" && result.redirectUrl) {
              scheduleRiderSetPasswordTimeout(setTimeoutFn, () => {
                if (runtimeUni && typeof runtimeUni.redirectTo === "function") {
                  runtimeUni.redirectTo({ url: result.redirectUrl });
                }
              }, RIDER_SET_PASSWORD_MISSING_TICKET_DELAY);
            }
            return;
          }

          showRiderSetPasswordToast(runtimeUni, {
            title: result.message,
            icon: "success",
          });
          scheduleRiderSetPasswordTimeout(setTimeoutFn, () => {
            if (runtimeUni && typeof runtimeUni.redirectTo === "function") {
              runtimeUni.redirectTo({
                url: result.redirectUrl || RIDER_SET_PASSWORD_LOGIN_ROUTE,
              });
            }
          }, RIDER_SET_PASSWORD_SUBMIT_DELAY);
        } finally {
          this.submitting = false;
        }
      },
    },
  };
}
