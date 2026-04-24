import {
  buildRolePasswordResetSetPasswordPageUrl,
  createRolePasswordResetCooldownController,
  requestRolePasswordResetCode,
  verifyRolePasswordResetCode,
} from "./role-password-reset-portal.js";

function resolveRiderResetPasswordUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function normalizeRiderResetPasswordPortalRuntime(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function showRiderResetPasswordToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

export const RIDER_RESET_PASSWORD_SCENE = "rider_reset";
export const RIDER_RESET_PASSWORD_LOGIN_ROUTE = "/pages/login/index";
export const RIDER_RESET_PASSWORD_SET_PASSWORD_ROUTE = "/pages/set-password/index";
export const DEFAULT_RIDER_RESET_PASSWORD_PORTAL_RUNTIME = Object.freeze({
  title: "忘记密码",
  subtitle: "通过验证码验证后重置密码",
});

function createDefaultRiderResetPasswordState(portalRuntime = DEFAULT_RIDER_RESET_PASSWORD_PORTAL_RUNTIME) {
  return {
    phone: "",
    code: "",
    codeCooldown: 0,
    sendingCode: false,
    submitting: false,
    cooldownController: null,
    portalRuntime: {
      ...DEFAULT_RIDER_RESET_PASSWORD_PORTAL_RUNTIME,
      ...normalizeRiderResetPasswordPortalRuntime(portalRuntime),
    },
  };
}

export const DEFAULT_RIDER_RESET_PASSWORD_STATE = Object.freeze(
  createDefaultRiderResetPasswordState(),
);

export function createRiderResetPasswordPageLogic(options = {}) {
  const {
    requestSMSCode,
    verifySMSCodeCheck,
    getCachedPortalRuntimeSettings,
    loadPortalRuntimeSettings,
    uniApp,
  } = options;
  const runtimeUni = resolveRiderResetPasswordUniRuntime(uniApp);

  return {
    data() {
      return createDefaultRiderResetPasswordState(
        typeof getCachedPortalRuntimeSettings === "function"
          ? getCachedPortalRuntimeSettings()
          : {},
      );
    },
    onLoad() {
      this.cooldownController = createRolePasswordResetCooldownController({
        setValue: (nextValue) => {
          this.codeCooldown = nextValue;
        },
      });
      void this.loadPortalRuntime();
    },
    onUnload() {
      if (this.cooldownController?.clear) {
        this.cooldownController.clear();
        this.cooldownController = null;
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
          ...normalizeRiderResetPasswordPortalRuntime(runtime),
        };
      },

      goLogin() {
        if (runtimeUni && typeof runtimeUni.redirectTo === "function") {
          runtimeUni.redirectTo({ url: RIDER_RESET_PASSWORD_LOGIN_ROUTE });
        }
      },

      async sendCode() {
        if (this.codeCooldown > 0 || this.sendingCode) {
          return;
        }

        this.sendingCode = true;
        try {
          const result = await requestRolePasswordResetCode({
            phoneValue: this.phone,
            scene: RIDER_RESET_PASSWORD_SCENE,
            requestSMSCode,
            cooldownController: this.cooldownController,
          });
          if (!result.ok) {
            showRiderResetPasswordToast(runtimeUni, {
              title: result.message,
              icon: "none",
            });
            return;
          }

          showRiderResetPasswordToast(runtimeUni, {
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

        this.submitting = true;
        try {
          const result = await verifyRolePasswordResetCode({
            phoneValue: this.phone,
            codeValue: this.code,
            scene: RIDER_RESET_PASSWORD_SCENE,
            storage: runtimeUni,
            verifySMSCodeCheck,
            buildSetPasswordUrl: (phone, code) =>
              buildRolePasswordResetSetPasswordPageUrl(
                RIDER_RESET_PASSWORD_SET_PASSWORD_ROUTE,
                phone,
                code,
              ),
          });
          if (!result.ok) {
            showRiderResetPasswordToast(runtimeUni, {
              title: result.message,
              icon: "none",
            });
            return;
          }

          if (runtimeUni && typeof runtimeUni.redirectTo === "function") {
            runtimeUni.redirectTo({ url: result.redirectUrl });
          }
        } finally {
          this.submitting = false;
        }
      },
    },
  };
}
