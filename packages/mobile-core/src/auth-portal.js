const SAFE_CONSUMER_AUTH_PROTOCOLS = new Set(["http:", "https:"]);

export const DEFAULT_CONSUMER_AUTH_NICKNAME = "悦享e食用户";

export function trimAuthPortalValue(value) {
  return String(value || "").trim();
}

export function normalizeConsumerAuthMode(value) {
  return trimAuthPortalValue(value) === "register" ? "register" : "login";
}

export function normalizeConsumerInviteCode(value) {
  return trimAuthPortalValue(value).toUpperCase();
}

export function normalizeConsumerAuthPhone(value) {
  const phone = trimAuthPortalValue(value);
  return /^1\d{10}$/.test(phone) ? phone : "";
}

function decodeConsumerAuthQueryValue(value) {
  const raw = trimAuthPortalValue(value);
  if (!raw) {
    return "";
  }

  try {
    return decodeURIComponent(raw);
  } catch (_error) {
    return raw;
  }
}

function buildAuthPortalQuery(params = {}) {
  return Object.keys(params)
    .filter((key) => trimAuthPortalValue(params[key]) !== "")
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(
          trimAuthPortalValue(params[key]),
        )}`,
    )
    .join("&");
}

export function buildAuthPortalPageUrl(path, params = {}) {
  const query = buildAuthPortalQuery(params);
  return query ? `${path}?${query}` : path;
}

export function buildConsumerSetPasswordPageUrl(phone, code) {
  return buildAuthPortalPageUrl("/pages/auth/set-password/index", {
    phone,
    code,
  });
}

export function normalizeConsumerAuthExternalUrl(url) {
  const raw = trimAuthPortalValue(url);
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    if (!SAFE_CONSUMER_AUTH_PROTOCOLS.has(parsed.protocol)) {
      return "";
    }
    return parsed.toString();
  } catch (_error) {
    return "";
  }
}

function deriveWebRootFromEntryUrl(entryUrl) {
  const value = normalizeConsumerAuthExternalUrl(entryUrl);
  if (!value) {
    return "";
  }

  const apiIndex = value.indexOf("/api/");
  if (apiIndex > 0) {
    return value.slice(0, apiIndex);
  }

  const authIndex = value.indexOf("/auth/wechat/start");
  if (authIndex > 0) {
    return value.slice(0, authIndex);
  }

  const match = value.match(/^(https?:\/\/[^/]+)/i);
  return match ? match[1] : "";
}

export function buildConsumerWechatReturnUrl(entryUrl, mode, params = {}) {
  const root = deriveWebRootFromEntryUrl(entryUrl);
  if (!root) {
    return "";
  }

  const queryParams = {
    mode: normalizeConsumerAuthMode(mode),
    ...params,
  };
  if (Object.prototype.hasOwnProperty.call(queryParams, "inviteCode")) {
    queryParams.inviteCode = normalizeConsumerInviteCode(queryParams.inviteCode);
  }

  return buildAuthPortalPageUrl(`${root}/#/pages/auth/wechat-callback/index`, queryParams);
}

export function buildConsumerWechatStartUrl(entryUrl, mode, params = {}) {
  const normalizedEntryUrl = normalizeConsumerAuthExternalUrl(entryUrl);
  const normalizedMode = normalizeConsumerAuthMode(mode);
  const returnUrl = buildConsumerWechatReturnUrl(
    normalizedEntryUrl,
    normalizedMode,
    params,
  );

  if (!normalizedEntryUrl || !returnUrl) {
    return "";
  }

  const connector = normalizedEntryUrl.includes("?") ? "&" : "?";
  return `${normalizedEntryUrl}${connector}mode=${encodeURIComponent(
    normalizedMode,
  )}&returnUrl=${encodeURIComponent(returnUrl)}`;
}

export function buildConsumerAuthUserProfile(user, fallbackPhone = "") {
  const source =
    user && typeof user === "object" && !Array.isArray(user) ? { ...user } : {};
  const nickname =
    trimAuthPortalValue(source.nickname) || DEFAULT_CONSUMER_AUTH_NICKNAME;
  const phone =
    trimAuthPortalValue(source.phone) || trimAuthPortalValue(fallbackPhone);
  const next = { ...source, nickname };

  if (phone) {
    next.phone = phone;
  } else {
    delete next.phone;
  }

  return next;
}

export function shouldRedirectRegisteredConsumerToLogin(message) {
  return /已注册|已存在|already registered|already exists/i.test(
    trimAuthPortalValue(message),
  );
}

export function resolveConsumerPasswordResetTicket(
  options = {},
  cachedResetData = {},
) {
  const rawOptions =
    options && typeof options === "object" && !Array.isArray(options)
      ? options
      : {};
  const rawCachedResetData =
    cachedResetData &&
    typeof cachedResetData === "object" &&
    !Array.isArray(cachedResetData)
      ? cachedResetData
      : {};

  return {
    phone:
      decodeConsumerAuthQueryValue(rawOptions.phone) ||
      trimAuthPortalValue(rawCachedResetData.phone),
    code:
      decodeConsumerAuthQueryValue(rawOptions.code) ||
      trimAuthPortalValue(rawCachedResetData.code),
  };
}

export function validateConsumerNewPasswordForm(
  passwordValue,
  confirmPasswordValue,
) {
  const password = trimAuthPortalValue(passwordValue);
  const confirmPassword = trimAuthPortalValue(confirmPasswordValue);

  if (!password) {
    return { password: "", error: "请输入新密码" };
  }
  if (password.length < 6) {
    return { password: "", error: "密码至少 6 位" };
  }
  if (password !== confirmPassword) {
    return { password: "", error: "两次密码不一致" };
  }

  return { password, error: "" };
}

function pickConsumerAuthErrorMessage(
  error,
  fallback,
  normalizeErrorMessage = (_error, message) => message,
) {
  return normalizeErrorMessage(error, fallback);
}

export function createResetPasswordPage(options = {}) {
  const {
    requestSMSCode = async () => ({}),
    verifySMSCodeCheck = async () => ({}),
    getCachedConsumerAuthRuntimeSettings = () => ({}),
    loadConsumerAuthRuntimeSettings = async () => ({}),
    normalizeErrorMessage = (_error, fallback) => fallback,
  } = options;

  return {
    data() {
      return {
        phone: "",
        code: "",
        codeCooldown: 0,
        loading: false,
        timer: null,
        portalRuntime: getCachedConsumerAuthRuntimeSettings(),
      };
    },
    onLoad() {
      void this.loadRuntimeSettings();
    },
    onUnload() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    methods: {
      async loadRuntimeSettings() {
        this.portalRuntime = await loadConsumerAuthRuntimeSettings();
      },
      goLogin() {
        uni.redirectTo({ url: "/pages/auth/login/index" });
      },
      validatePhone() {
        const phone = normalizeConsumerAuthPhone(this.phone);
        if (!phone) {
          uni.showToast({ title: "请输入正确的手机号", icon: "none" });
          return "";
        }
        return phone;
      },
      async sendCode() {
        if (this.codeCooldown > 0 || this.loading) {
          return;
        }

        const phone = this.validatePhone();
        if (!phone) {
          return;
        }

        this.loading = true;
        try {
          const response = await requestSMSCode(phone, "reset");
          if (response.success === false) {
            uni.showToast({
              title: response.error || response.message || "发送验证码失败",
              icon: "none",
              duration: 2000,
            });
            return;
          }

          uni.showToast({
            title: response.message || "验证码已发送",
            icon: "success",
          });
          this.codeCooldown = 60;
          if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
          }
          this.timer = setInterval(() => {
            this.codeCooldown -= 1;
            if (this.codeCooldown <= 0) {
              clearInterval(this.timer);
              this.timer = null;
            }
          }, 1000);
        } catch (error) {
          uni.showToast({
            title: pickConsumerAuthErrorMessage(
              error,
              "发送验证码失败",
              normalizeErrorMessage,
            ),
            icon: "none",
            duration: 2000,
          });
        } finally {
          this.loading = false;
        }
      },
      async submit() {
        const phone = this.validatePhone();
        const code = String(this.code || "").trim();

        if (!phone) {
          return;
        }
        if (!code) {
          uni.showToast({ title: "请输入验证码", icon: "none" });
          return;
        }

        this.loading = true;
        try {
          const verifyResponse = await verifySMSCodeCheck(phone, "reset", code);
          if (!verifyResponse.success) {
            throw new Error(verifyResponse.error || "验证码错误");
          }

          uni.setStorageSync("reset_password_data", { phone, code });
          uni.redirectTo({
            url: buildConsumerSetPasswordPageUrl(phone, code),
          });
        } catch (error) {
          uni.showToast({
            title: pickConsumerAuthErrorMessage(
              error,
              "验证失败",
              normalizeErrorMessage,
            ),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
    },
  };
}

export function createSetPasswordPage(options = {}) {
  const {
    request = async () => ({}),
    getCachedConsumerAuthRuntimeSettings = () => ({}),
    loadConsumerAuthRuntimeSettings = async () => ({}),
    normalizeErrorMessage = (_error, fallback) => fallback,
  } = options;

  return {
    data() {
      return {
        phone: "",
        code: "",
        password: "",
        confirmPassword: "",
        loading: false,
        portalRuntime: getCachedConsumerAuthRuntimeSettings(),
      };
    },
    onLoad(options = {}) {
      void this.loadRuntimeSettings();

      const resetTicket = resolveConsumerPasswordResetTicket(
        options,
        uni.getStorageSync("reset_password_data"),
      );
      this.phone = resetTicket.phone;
      this.code = resetTicket.code;

      if (!this.phone || !this.code) {
        uni.showToast({ title: "请先完成验证码校验", icon: "none" });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }
    },
    methods: {
      async loadRuntimeSettings() {
        this.portalRuntime = await loadConsumerAuthRuntimeSettings();
      },
      goLogin() {
        uni.redirectTo({ url: "/pages/auth/login/index" });
      },
      async submit() {
        const validation = validateConsumerNewPasswordForm(
          this.password,
          this.confirmPassword,
        );

        if (validation.error) {
          uni.showToast({ title: validation.error, icon: "none" });
          return;
        }

        if (!this.phone || !this.code) {
          uni.showToast({ title: "校验信息已失效，请重新验证", icon: "none" });
          setTimeout(() => {
            uni.redirectTo({ url: "/pages/auth/reset-password/index" });
          }, 1500);
          return;
        }

        this.loading = true;
        try {
          const response = await request({
            url: "/api/set-new-password",
            method: "POST",
            data: {
              phone: this.phone,
              code: this.code,
              nextPassword: validation.password,
            },
          });

          if (response.success) {
            uni.removeStorageSync("reset_password_data");
            uni.showToast({ title: "密码设置成功", icon: "success" });
            setTimeout(() => {
              uni.redirectTo({ url: "/pages/auth/login/index" });
            }, 1500);
          }
        } catch (error) {
          uni.showToast({
            title: pickConsumerAuthErrorMessage(
              error,
              "设置失败",
              normalizeErrorMessage,
            ),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
    },
  };
}
