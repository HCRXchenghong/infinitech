import { persistRoleAuthSessionFromAuthResult } from "../../client-sdk/src/role-auth-response.js";
import {
  buildRolePhoneChangePayload,
  createRolePhoneChangeCountdownController,
  normalizeRolePhoneChangeErrorMessage,
  requestRolePhoneChangeCode,
  validateRolePhoneChangeNewPhoneInput,
  verifyRolePhoneChangeCode,
} from "./role-phone-change-portal.js";

function trimRiderChangePhoneText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeRiderChangePhoneObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function resolveRiderChangePhoneUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function showRiderChangePhoneToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function scheduleRiderChangePhoneTimeout(setTimeoutFn, callback, delay) {
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

function createDefaultRiderChangePhoneState() {
  return {
    step: 1,
    oldPhone: "",
    oldCode: "",
    newPhone: "",
    newCode: "",
    oldCodeCooldown: 0,
    newCodeCooldown: 0,
    oldCooldownController: null,
    newCooldownController: null,
    sendingOldCode: false,
    verifyingOldPhone: false,
    sendingNewCode: false,
    submitting: false,
  };
}

export const RIDER_CHANGE_PHONE_OLD_SCENE = "change_phone_verify";
export const RIDER_CHANGE_PHONE_NEW_SCENE = "change_phone_new";
export const RIDER_CHANGE_PHONE_BACK_DELAY = 800;
export const DEFAULT_RIDER_CHANGE_PHONE_STATE = Object.freeze(
  createDefaultRiderChangePhoneState(),
);
export const RIDER_CHANGE_PHONE_LOGOUT_EXTRA_STORAGE_KEYS = [
  "socket_token",
  "socket_token_account_key",
  "rider_push_registration",
];

export function buildRiderChangePhoneNextProfile(
  currentSession = {},
  responseUser = {},
  newPhone = "",
) {
  const session = normalizeRiderChangePhoneObject(currentSession);
  const profile = normalizeRiderChangePhoneObject(session.profile);
  const user = normalizeRiderChangePhoneObject(responseUser);
  const normalizedPhone =
    trimRiderChangePhoneText(newPhone)
    || trimRiderChangePhoneText(user.phone)
    || trimRiderChangePhoneText(profile.phone);

  return {
    ...profile,
    ...user,
    phone: normalizedPhone,
  };
}

export function createRiderChangePhonePageLogic(options = {}) {
  const {
    changePhone,
    requestSMSCode,
    verifySMSCodeCheck,
    readRiderAuthIdentity,
    readRiderAuthSession,
    persistRiderAuthSession,
    clearRiderAuthSession,
    persistRoleAuthSessionFromAuthResultImpl = persistRoleAuthSessionFromAuthResult,
    logoutExtraStorageKeys = RIDER_CHANGE_PHONE_LOGOUT_EXTRA_STORAGE_KEYS,
    uniApp,
    setTimeoutFn,
  } = options;
  const runtimeUni = resolveRiderChangePhoneUniRuntime(uniApp);

  return {
    data() {
      return createDefaultRiderChangePhoneState();
    },
    onLoad() {
      const riderAuth =
        typeof readRiderAuthIdentity === "function"
          ? readRiderAuthIdentity({ uniApp: runtimeUni })
          : {};
      if (riderAuth && riderAuth.riderPhone) {
        this.oldPhone = trimRiderChangePhoneText(riderAuth.riderPhone);
      }
      this.oldCooldownController = this.createCountdownController("old");
      this.newCooldownController = this.createCountdownController("new");
    },
    onUnload() {
      this.clearTimer("old");
      this.clearTimer("new");
    },
    methods: {
      createCountdownController(which) {
        return createRolePhoneChangeCountdownController({
          setValue: (value) => {
            if (which === "old") {
              this.oldCodeCooldown = value;
              return;
            }
            this.newCodeCooldown = value;
          },
        });
      },

      clearTimer(which) {
        if (which === "old" && this.oldCooldownController?.clear) {
          this.oldCooldownController.clear();
          this.oldCooldownController = null;
        }
        if (which === "new" && this.newCooldownController?.clear) {
          this.newCooldownController.clear();
          this.newCooldownController = null;
        }
      },

      startCountdown(which) {
        if (which === "old") {
          if (!this.oldCooldownController) {
            this.oldCooldownController = this.createCountdownController("old");
          }
          this.oldCooldownController.start();
          return;
        }

        if (!this.newCooldownController) {
          this.newCooldownController = this.createCountdownController("new");
        }
        this.newCooldownController.start();
      },

      resolveErrorMessage(error, fallback = "操作失败，请稍后重试") {
        return normalizeRolePhoneChangeErrorMessage(error, fallback);
      },

      async sendOldCode() {
        if (this.oldCodeCooldown > 0 || this.sendingOldCode) {
          return;
        }

        this.sendingOldCode = true;
        try {
          const result = await requestRolePhoneChangeCode({
            step: "old",
            phoneValue: this.oldPhone,
            scene: RIDER_CHANGE_PHONE_OLD_SCENE,
            requestSMSCode,
            extra: { targetType: "rider" },
            cooldownController: {
              start: () => this.startCountdown("old"),
            },
            invalidPhoneMessage: "请输入正确手机号",
            failureMessage: "发送失败",
          });

          if (!result.ok) {
            showRiderChangePhoneToast(runtimeUni, {
              title: result.message,
              icon: "none",
            });
            return;
          }

          showRiderChangePhoneToast(runtimeUni, {
            title: result.message,
            icon: "success",
          });
        } finally {
          this.sendingOldCode = false;
        }
      },

      async verifyOldPhone() {
        if (this.verifyingOldPhone) {
          return;
        }

        this.verifyingOldPhone = true;
        try {
          const result = await verifyRolePhoneChangeCode({
            phoneValue: this.oldPhone,
            codeValue: this.oldCode,
            scene: RIDER_CHANGE_PHONE_OLD_SCENE,
            verifySMSCodeCheck,
            invalidPhoneMessage: "请输入正确手机号",
            invalidCodeMessage: "请输入6位验证码",
            failureMessage: "原手机号验证失败",
            successMessage: "验证通过",
          });

          if (!result.ok) {
            showRiderChangePhoneToast(runtimeUni, {
              title: result.message,
              icon: "none",
            });
            return;
          }

          this.step = 2;
          showRiderChangePhoneToast(runtimeUni, {
            title: result.message,
            icon: "success",
          });
        } finally {
          this.verifyingOldPhone = false;
        }
      },

      async sendNewCode() {
        if (this.newCodeCooldown > 0 || this.sendingNewCode) {
          return;
        }

        this.sendingNewCode = true;
        try {
          const result = await requestRolePhoneChangeCode({
            step: "new",
            phoneValue: this.newPhone,
            oldPhoneValue: this.oldPhone,
            scene: RIDER_CHANGE_PHONE_NEW_SCENE,
            requestSMSCode,
            extra: { targetType: "rider" },
            cooldownController: {
              start: () => this.startCountdown("new"),
            },
            invalidPhoneMessage: "请输入正确手机号",
            samePhoneMessage: "新手机号不能与原手机号相同",
            failureMessage: "发送失败",
          });

          if (!result.ok) {
            showRiderChangePhoneToast(runtimeUni, {
              title: result.message,
              icon: "none",
            });
            return;
          }

          showRiderChangePhoneToast(runtimeUni, {
            title: result.message,
            icon: "success",
          });
        } finally {
          this.sendingNewCode = false;
        }
      },

      async submitChangePhone() {
        if (this.submitting) {
          return;
        }

        const phoneValidation = validateRolePhoneChangeNewPhoneInput(
          this.newPhone,
          this.oldPhone,
          {
            invalidPhoneMessage: "请输入正确手机号",
            samePhoneMessage: "新手机号不能与原手机号相同",
          },
        );
        if (!phoneValidation.phone) {
          showRiderChangePhoneToast(runtimeUni, {
            title: phoneValidation.error,
            icon: "none",
          });
          return;
        }

        const payload = buildRolePhoneChangePayload({
          oldPhone: this.oldPhone,
          oldCode: this.oldCode,
          newPhone: this.newPhone,
          newCode: this.newCode,
        });
        if (payload.newCode.length !== 6) {
          showRiderChangePhoneToast(runtimeUni, {
            title: "请输入6位验证码",
            icon: "none",
          });
          return;
        }

        this.submitting = true;
        try {
          const response = await changePhone?.(payload);
          if (!response) {
            throw new Error("登录状态已失效，请重新登录");
          }

          if (response.success === false) {
            throw response;
          }

          const currentSession =
            typeof readRiderAuthSession === "function"
              ? normalizeRiderChangePhoneObject(
                  readRiderAuthSession({ uniApp: runtimeUni }),
                )
              : {};
          const nextProfile = buildRiderChangePhoneNextProfile(
            currentSession,
            response.user,
            payload.newPhone,
          );

          if (response.token) {
            persistRoleAuthSessionFromAuthResultImpl({
              uniApp: runtimeUni,
              persistRoleAuthSession: persistRiderAuthSession,
              response,
              currentSession,
              profile: nextProfile,
              extraStorageValues({
                responseUser,
                profile,
                currentSession: previousSession,
                pickFirstText,
              }) {
                return {
                  riderId:
                    responseUser.id != null
                      ? String(responseUser.id)
                      : trimRiderChangePhoneText(previousSession.accountId) || null,
                  riderName: pickFirstText(
                    [
                      responseUser.name,
                      responseUser.nickname,
                      previousSession.profile?.name,
                      previousSession.profile?.nickname,
                      profile.name,
                      profile.nickname,
                    ],
                    "骑手",
                  ),
                };
              },
            });
          } else if (typeof clearRiderAuthSession === "function") {
            clearRiderAuthSession({
              uniApp: runtimeUni,
              extraStorageKeys: [...logoutExtraStorageKeys],
            });
          }

          showRiderChangePhoneToast(runtimeUni, {
            title: response.message || "手机号修改成功",
            icon: "success",
          });

          if (!response.token) {
            scheduleRiderChangePhoneTimeout(setTimeoutFn, () => {
              if (runtimeUni && typeof runtimeUni.reLaunch === "function") {
                runtimeUni.reLaunch({ url: "/pages/login/index" });
              }
            }, RIDER_CHANGE_PHONE_BACK_DELAY);
            return;
          }

          scheduleRiderChangePhoneTimeout(setTimeoutFn, () => {
            if (runtimeUni && typeof runtimeUni.navigateBack === "function") {
              runtimeUni.navigateBack();
            }
          }, RIDER_CHANGE_PHONE_BACK_DELAY);
        } catch (error) {
          showRiderChangePhoneToast(runtimeUni, {
            title: this.resolveErrorMessage(error, "修改失败"),
            icon: "none",
          });
        } finally {
          this.submitting = false;
        }
      },
    },
  };
}
