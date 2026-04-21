import { extractAuthSessionResult } from "../../contracts/src/http.js";
import {
  buildAuthPortalPageUrl,
  buildConsumerWechatStartUrl,
  normalizeConsumerAuthExternalUrl,
  normalizeConsumerAuthMode,
  normalizeConsumerInviteCode,
  shouldRedirectRegisteredConsumerToLogin,
  trimAuthPortalValue,
} from "./auth-portal.js";
import { persistConsumerAuthSessionResult } from "./consumer-auth-session.js";

function resolveUniApp(uniApp) {
  return uniApp || globalThis.uni || {};
}

function resolveWindowObject(windowObject) {
  return windowObject || globalThis.window || null;
}

function resolvePlusRuntime(plusRuntime) {
  if (plusRuntime) {
    return plusRuntime;
  }

  return globalThis.plus && globalThis.plus.runtime
    ? globalThis.plus.runtime
    : null;
}

function resolveSetTimeoutImpl(setTimeoutImpl) {
  return setTimeoutImpl || globalThis.setTimeout;
}

function resolveSetIntervalImpl(setIntervalImpl) {
  return setIntervalImpl || globalThis.setInterval;
}

function resolveClearIntervalImpl(clearIntervalImpl) {
  return clearIntervalImpl || globalThis.clearInterval;
}

function pickAuthPortalErrorMessage(
  error,
  fallback,
  normalizeErrorMessage = (_error, message) => message,
) {
  return normalizeErrorMessage(error, fallback);
}

function clearConsumerAuthTimer(instance, clearIntervalImpl) {
  if (!instance.timer) {
    return;
  }

  clearIntervalImpl(instance.timer);
  instance.timer = null;
}

function startConsumerAuthCooldown(
  instance,
  setIntervalImpl,
  clearIntervalImpl,
  isDestroyedKey = "",
) {
  instance.codeCooldown = 60;
  clearConsumerAuthTimer(instance, clearIntervalImpl);
  instance.timer = setIntervalImpl(() => {
    if (isDestroyedKey && instance[isDestroyedKey]) {
      clearConsumerAuthTimer(instance, clearIntervalImpl);
      return;
    }

    if (instance.codeCooldown > 0) {
      instance.codeCooldown -= 1;
      return;
    }

    clearConsumerAuthTimer(instance, clearIntervalImpl);
  }, 1000);
}

function persistConsumerAuthSession(options = {}) {
  const {
    result = {},
    fallbackPhone = "",
    successTitle = "登录成功",
    saveTokenInfo = () => {},
    uniApp = {},
    setTimeoutImpl = globalThis.setTimeout,
    redirectDelay = 500,
  } = options;

  const persisted = persistConsumerAuthSessionResult({
    result,
    fallbackPhone,
    saveTokenInfo,
    uniApp,
  });
  if (!persisted.persisted) {
    return false;
  }

  uniApp.showToast?.({ title: successTitle, icon: "success" });
  setTimeoutImpl(() => {
    uniApp.switchTab?.({ url: "/pages/index/index" });
  }, redirectDelay);
  return true;
}

function openConsumerAuthExternalLink(options = {}) {
  const {
    url,
    uniApp = {},
    windowObject = null,
    plusRuntime = null,
  } = options;
  const target = normalizeConsumerAuthExternalUrl(url);

  if (!target) {
    uniApp.showToast?.({ title: "微信登录入口未配置", icon: "none" });
    return false;
  }

  if (windowObject && windowObject.location) {
    windowObject.location.href = target;
    return true;
  }

  if (plusRuntime && typeof plusRuntime.openURL === "function") {
    plusRuntime.openURL(target);
    return true;
  }

  if (typeof uniApp.setClipboardData === "function") {
    uniApp.setClipboardData({
      data: target,
      success: () => {
        uniApp.showToast?.({ title: "登录链接已复制", icon: "success" });
      },
    });
    return true;
  }

  return false;
}

export function createLoginPage(options = {}) {
  const loginApi =
    typeof options.loginApi === "function" ? options.loginApi : async () => ({});
  const requestSMSCode =
    typeof options.requestSMSCode === "function"
      ? options.requestSMSCode
      : async () => ({});
  const wechatBindLogin =
    typeof options.wechatBindLogin === "function"
      ? options.wechatBindLogin
      : async () => ({});
  const saveTokenInfo =
    typeof options.saveTokenInfo === "function"
      ? options.saveTokenInfo
      : () => {};
  const normalizeErrorMessage =
    typeof options.normalizeErrorMessage === "function"
      ? options.normalizeErrorMessage
      : (_error, fallback) => fallback;
  const getCachedConsumerAuthRuntimeSettings =
    typeof options.getCachedConsumerAuthRuntimeSettings === "function"
      ? options.getCachedConsumerAuthRuntimeSettings
      : () => ({});
  const loadConsumerAuthRuntimeSettings =
    typeof options.loadConsumerAuthRuntimeSettings === "function"
      ? options.loadConsumerAuthRuntimeSettings
      : async () => ({});
  const uniApp = resolveUniApp(options.uniApp);
  const windowObject = resolveWindowObject(options.windowObject);
  const plusRuntime = resolvePlusRuntime(options.plusRuntime);
  const setTimeoutImpl = resolveSetTimeoutImpl(options.setTimeoutImpl);
  const setIntervalImpl = resolveSetIntervalImpl(options.setIntervalImpl);
  const clearIntervalImpl = resolveClearIntervalImpl(options.clearIntervalImpl);

  return {
    data() {
      return {
        loginType: "code",
        phone: "",
        code: "",
        password: "",
        codeCooldown: 0,
        loading: false,
        timer: null,
        portalRuntime: getCachedConsumerAuthRuntimeSettings(),
        wechatBindToken: "",
        wechatNickname: "",
        wechatAvatarUrl: "",
      };
    },
    computed: {
      bindRequired() {
        return trimAuthPortalValue(this.wechatBindToken) !== "";
      },
      headerSubtitle() {
        return this.bindRequired
          ? "请先登录已有账号，再完成微信绑定"
          : this.portalRuntime.subtitle;
      },
      bindBannerDesc() {
        if (this.wechatNickname) {
          return `微信昵称：${this.wechatNickname}`;
        }
        return "登录后会自动绑定当前微信账号。";
      },
      wechatLoginAvailable() {
        return Boolean(
          this.portalRuntime.wechatLoginEnabled &&
            trimAuthPortalValue(this.portalRuntime.wechatLoginEntryUrl),
        );
      },
    },
    onLoad(query = {}) {
      this.applyQueryState(query);
      void this.loadRuntimeSettings();
    },
    onUnload() {
      this.clearTimer();
    },
    methods: {
      applyQueryState(query = {}) {
        const loginType = trimAuthPortalValue(query.loginType);
        if (loginType === "code" || loginType === "password") {
          this.loginType = loginType;
        }
        this.phone = trimAuthPortalValue(query.phone);
        this.wechatBindToken = trimAuthPortalValue(query.wechatBindToken);
        this.wechatNickname = trimAuthPortalValue(query.wechatNickname);
        this.wechatAvatarUrl = trimAuthPortalValue(query.wechatAvatarUrl);
      },
      async loadRuntimeSettings() {
        this.portalRuntime = await loadConsumerAuthRuntimeSettings();
      },
      clearTimer() {
        clearConsumerAuthTimer(this, clearIntervalImpl);
      },
      switchLoginType(type) {
        this.loginType = type;
        this.code = "";
        this.password = "";
      },
      buildBindParams(extra = {}) {
        return {
          phone: this.phone,
          wechatBindToken: this.wechatBindToken,
          wechatNickname: this.wechatNickname,
          wechatAvatarUrl: this.wechatAvatarUrl,
          ...extra,
        };
      },
      buildWechatStartUrl(mode) {
        return buildConsumerWechatStartUrl(
          this.portalRuntime.wechatLoginEntryUrl,
          mode,
        );
      },
      openExternalLink(url) {
        return openConsumerAuthExternalLink({
          url,
          uniApp,
          windowObject,
          plusRuntime,
        });
      },
      startWechatLogin(mode = "login") {
        const target = this.buildWechatStartUrl(mode);
        if (!target) {
          uniApp.showToast?.({ title: "微信登录入口未配置", icon: "none" });
          return;
        }
        void this.openExternalLink(target);
      },
      goRegister() {
        uniApp.redirectTo?.({
          url: buildAuthPortalPageUrl(
            "/pages/auth/register/index",
            this.buildBindParams(),
          ),
        });
      },
      goResetPassword() {
        uniApp.navigateTo?.({ url: "/pages/auth/reset-password/index" });
      },
      validatePhone() {
        const phone = trimAuthPortalValue(this.phone);
        if (!/^1\d{10}$/.test(phone)) {
          uniApp.showToast?.({ title: "请输入正确的手机号", icon: "none" });
          return "";
        }
        return phone;
      },
      startCodeCooldown() {
        startConsumerAuthCooldown(
          this,
          setIntervalImpl,
          clearIntervalImpl,
        );
      },
      showNeedRegisterModal() {
        uniApp.showModal?.({
          title: "提示",
          content: this.bindRequired
            ? "当前手机号还没有注册，请先注册账号，再自动绑定当前微信。"
            : "该手机号还没有注册，是否前往注册？",
          confirmText: "去注册",
          cancelText: "取消",
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.goRegister();
            }
          },
        });
      },
      persistLoginSuccess(result, fallbackPhone) {
        persistConsumerAuthSession({
          result,
          fallbackPhone,
          successTitle: this.bindRequired ? "绑定成功" : "登录成功",
          saveTokenInfo,
          uniApp,
          setTimeoutImpl,
          redirectDelay: 500,
        });
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
          const response = await requestSMSCode(phone, "login");
          if (response.success === false) {
            uniApp.showToast?.({
              title: response.error || response.message || "验证码发送失败",
              icon: "none",
            });
            return;
          }

          uniApp.showToast?.({
            title: response.message || "验证码已发送",
            icon: "success",
          });
          this.startCodeCooldown();
        } catch (error) {
          uniApp.showToast?.({
            title: pickAuthPortalErrorMessage(
              error,
              "验证码发送失败",
              normalizeErrorMessage,
            ),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
      async submit() {
        const phone = this.validatePhone();
        if (!phone) {
          return;
        }

        this.loading = true;
        try {
          let response = null;

          if (this.loginType === "code") {
            const code = trimAuthPortalValue(this.code);
            if (!code) {
              uniApp.showToast?.({ title: "请输入验证码", icon: "none" });
              return;
            }

            response = this.bindRequired
              ? await wechatBindLogin({
                  phone,
                  code,
                  bindToken: this.wechatBindToken,
                })
              : await loginApi({ phone, code });
          } else {
            const password = trimAuthPortalValue(this.password);
            if (!password) {
              uniApp.showToast?.({ title: "请输入密码", icon: "none" });
              return;
            }

            response = this.bindRequired
              ? await wechatBindLogin({
                  phone,
                  password,
                  bindToken: this.wechatBindToken,
                })
              : await loginApi({ phone, password });
          }

          const result = extractAuthSessionResult(response);
          if (result.authenticated) {
            this.persistLoginSuccess(result, phone);
            return;
          }

          if (result.needRegister) {
            this.showNeedRegisterModal();
            return;
          }

          uniApp.showToast?.({
            title: normalizeErrorMessage(result, "登录失败"),
            icon: "none",
          });
        } catch (error) {
          if (error.data && error.data.needRegister) {
            this.showNeedRegisterModal();
            return;
          }
          uniApp.showToast?.({
            title: normalizeErrorMessage(error, "登录失败"),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
    },
  };
}

export function createRegisterPage(options = {}) {
  const getBaseUrl =
    typeof options.getBaseUrl === "function" ? options.getBaseUrl : () => "";
  const loginApi =
    typeof options.loginApi === "function" ? options.loginApi : async () => ({});
  const registerApi =
    typeof options.registerApi === "function"
      ? options.registerApi
      : async () => ({});
  const requestSMSCode =
    typeof options.requestSMSCode === "function"
      ? options.requestSMSCode
      : async () => ({});
  const verifySMSCodeCheck =
    typeof options.verifySMSCodeCheck === "function"
      ? options.verifySMSCodeCheck
      : async () => ({});
  const saveTokenInfo =
    typeof options.saveTokenInfo === "function"
      ? options.saveTokenInfo
      : () => {};
  const getCachedConsumerAuthRuntimeSettings =
    typeof options.getCachedConsumerAuthRuntimeSettings === "function"
      ? options.getCachedConsumerAuthRuntimeSettings
      : () => ({});
  const loadConsumerAuthRuntimeSettings =
    typeof options.loadConsumerAuthRuntimeSettings === "function"
      ? options.loadConsumerAuthRuntimeSettings
      : async () => ({});
  const uniApp = resolveUniApp(options.uniApp);
  const windowObject = resolveWindowObject(options.windowObject);
  const plusRuntime = resolvePlusRuntime(options.plusRuntime);
  const setTimeoutImpl = resolveSetTimeoutImpl(options.setTimeoutImpl);
  const setIntervalImpl = resolveSetIntervalImpl(options.setIntervalImpl);
  const clearIntervalImpl = resolveClearIntervalImpl(options.clearIntervalImpl);

  return {
    data() {
      return {
        nickname: "",
        phone: "",
        inviteCode: "",
        code: "",
        password: "",
        confirmPassword: "",
        codeCooldown: 0,
        loading: false,
        timer: null,
        isDestroyed: false,
        needCaptcha: false,
        captchaSessionId: "",
        captchaCode: "",
        captchaImageUrl: "",
        portalRuntime: getCachedConsumerAuthRuntimeSettings(),
        wechatBindToken: "",
        wechatNickname: "",
        wechatAvatarUrl: "",
      };
    },
    computed: {
      bindRequired() {
        return trimAuthPortalValue(this.wechatBindToken) !== "";
      },
      headerSubtitle() {
        return this.bindRequired
          ? "注册后会自动绑定当前微信账号"
          : this.portalRuntime.subtitle;
      },
      bindBannerDesc() {
        if (this.wechatNickname) {
          return `微信昵称：${this.wechatNickname}`;
        }
        return "完成注册后会自动绑定当前微信账号。";
      },
      wechatLoginAvailable() {
        return Boolean(
          this.portalRuntime.wechatLoginEnabled &&
            trimAuthPortalValue(this.portalRuntime.wechatLoginEntryUrl),
        );
      },
    },
    onLoad(query = {}) {
      this.captchaSessionId = Date.now().toString();
      this.applyQueryState(query);
      void this.loadRuntimeSettings();
    },
    onUnload() {
      this.isDestroyed = true;
      this.clearTimer();
      this.loading = false;
    },
    onHide() {
      this.clearTimer();
    },
    methods: {
      applyQueryState(query = {}) {
        this.inviteCode = normalizeConsumerInviteCode(query.inviteCode);
        this.phone = trimAuthPortalValue(query.phone);
        this.wechatBindToken = trimAuthPortalValue(query.wechatBindToken);
        this.wechatNickname = trimAuthPortalValue(query.wechatNickname);
        this.wechatAvatarUrl = trimAuthPortalValue(query.wechatAvatarUrl);
        if (!trimAuthPortalValue(this.nickname) && this.wechatNickname) {
          this.nickname = this.wechatNickname;
        }
      },
      async loadRuntimeSettings() {
        this.portalRuntime = await loadConsumerAuthRuntimeSettings();
      },
      clearTimer() {
        clearConsumerAuthTimer(this, clearIntervalImpl);
      },
      buildQueryParams(extra = {}) {
        return {
          phone: this.phone,
          inviteCode: this.inviteCode,
          wechatBindToken: this.wechatBindToken,
          wechatNickname: this.wechatNickname,
          wechatAvatarUrl: this.wechatAvatarUrl,
          ...extra,
        };
      },
      buildWechatStartUrl(mode) {
        return buildConsumerWechatStartUrl(
          this.portalRuntime.wechatLoginEntryUrl,
          mode,
          { inviteCode: this.inviteCode },
        );
      },
      openExternalLink(url) {
        return openConsumerAuthExternalLink({
          url,
          uniApp,
          windowObject,
          plusRuntime,
        });
      },
      startWechatLogin(mode = "register") {
        const target = this.buildWechatStartUrl(mode);
        if (!target) {
          uniApp.showToast?.({ title: "微信登录入口未配置", icon: "none" });
          return;
        }
        void this.openExternalLink(target);
      },
      goLogin() {
        uniApp.redirectTo?.({
          url: buildAuthPortalPageUrl(
            "/pages/auth/login/index",
            this.buildQueryParams(),
          ),
        });
      },
      async loadCaptcha() {
        if (!this.captchaSessionId) {
          this.captchaSessionId = Date.now().toString();
        }
        this.captchaImageUrl = `${getBaseUrl()}/api/captcha?sessionId=${this.captchaSessionId}&t=${Date.now()}`;
      },
      refreshCaptcha() {
        this.captchaSessionId = Date.now().toString();
        this.captchaCode = "";
        void this.loadCaptcha();
      },
      validatePhone() {
        const phone = trimAuthPortalValue(this.phone);
        if (!/^1\d{10}$/.test(phone)) {
          uniApp.showToast?.({ title: "请输入正确的手机号", icon: "none" });
          return "";
        }
        return phone;
      },
      startCodeCooldown() {
        startConsumerAuthCooldown(
          this,
          setIntervalImpl,
          clearIntervalImpl,
          "isDestroyed",
        );
      },
      maybeRedirectToLogin(message) {
        const content = trimAuthPortalValue(message);
        if (!shouldRedirectRegisteredConsumerToLogin(content)) {
          return false;
        }
        uniApp.showModal?.({
          title: "提示",
          content,
          showCancel: false,
          confirmText: "去登录",
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.goLogin();
            }
          },
        });
        return true;
      },
      async sendCode() {
        if (this.isDestroyed || this.codeCooldown > 0 || this.loading) {
          return;
        }

        const phone = this.validatePhone();
        if (!phone) {
          return;
        }

        if (this.needCaptcha && trimAuthPortalValue(this.captchaCode).length !== 4) {
          uniApp.showToast?.({ title: "请输入图形验证码", icon: "none" });
          return;
        }

        this.loading = true;
        try {
          const response = await requestSMSCode(phone, "register", {
            captcha: this.needCaptcha
              ? trimAuthPortalValue(this.captchaCode)
              : undefined,
            sessionId: this.captchaSessionId,
          });

          if (this.isDestroyed) {
            return;
          }

          if (response.needCaptcha) {
            this.needCaptcha = true;
            this.captchaSessionId = response.sessionId || Date.now().toString();
            this.captchaCode = "";
            await this.loadCaptcha();
            uniApp.showToast?.({ title: "请输入图形验证码", icon: "none" });
            return;
          }

          if (!response.success) {
            if (this.maybeRedirectToLogin(response.message || response.error)) {
              return;
            }
            uniApp.showToast?.({
              title: response.message || response.error || "验证码发送失败",
              icon: "none",
            });
            return;
          }

          this.needCaptcha = false;
          this.captchaCode = "";
          this.captchaImageUrl = "";

          if (response.code) {
            uniApp.showModal?.({
              title: "开发调试验证码",
              content: `手机号：${phone}\n验证码：${response.code}`,
              showCancel: false,
              confirmText: "知道了",
            });
          }

          uniApp.showToast?.({
            title: response.message || "验证码已发送",
            icon: "success",
          });
          this.startCodeCooldown();
        } catch (error) {
          if (this.isDestroyed) {
            return;
          }

          const message =
            (error.data && (error.data.message || error.data.error)) ||
            error.error ||
            error.message ||
            "验证码发送失败";

          if (this.maybeRedirectToLogin(message)) {
            return;
          }

          if (error.data && error.data.needCaptcha) {
            this.needCaptcha = true;
            this.captchaSessionId = error.data.sessionId || Date.now().toString();
            this.captchaCode = "";
            await this.loadCaptcha();
            uniApp.showToast?.({
              title: message || "请输入图形验证码",
              icon: "none",
            });
            return;
          }

          uniApp.showToast?.({ title: message, icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      persistLoginSuccess(result, fallbackPhone) {
        persistConsumerAuthSession({
          result,
          fallbackPhone,
          successTitle: this.bindRequired ? "注册并绑定成功" : "注册成功",
          saveTokenInfo,
          uniApp,
          setTimeoutImpl,
          redirectDelay: 500,
        });
      },
      async submit() {
        const nickname = trimAuthPortalValue(this.nickname);
        const phone = this.validatePhone();
        const password = trimAuthPortalValue(this.password);
        const confirmPassword = trimAuthPortalValue(this.confirmPassword);
        const code = trimAuthPortalValue(this.code);

        if (!nickname) {
          uniApp.showToast?.({ title: "请输入昵称", icon: "none" });
          return;
        }
        if (!phone) {
          return;
        }
        if (!password) {
          uniApp.showToast?.({ title: "请输入密码", icon: "none" });
          return;
        }
        if (password.length < 6) {
          uniApp.showToast?.({ title: "密码至少 6 位", icon: "none" });
          return;
        }
        if (password !== confirmPassword) {
          uniApp.showToast?.({
            title: "两次输入的密码不一致",
            icon: "none",
          });
          return;
        }
        if (!code) {
          uniApp.showToast?.({ title: "请输入验证码", icon: "none" });
          return;
        }

        this.loading = true;
        try {
          const verifyResponse = await verifySMSCodeCheck(phone, "register", code);
          if (!verifyResponse.success) {
            throw new Error(
              verifyResponse.error ||
                verifyResponse.message ||
                "验证码校验失败",
            );
          }

          const registerResult = extractAuthSessionResult(await registerApi({
            phone,
            name: nickname,
            password,
            inviteCode: normalizeConsumerInviteCode(this.inviteCode),
            wechatBindToken: this.wechatBindToken || undefined,
          }));

          if (!registerResult.success) {
            if (this.maybeRedirectToLogin(registerResult.error || registerResult.message)) {
              return;
            }
            uniApp.showToast?.({
              title: registerResult.error || registerResult.message || "注册失败",
              icon: "none",
            });
            return;
          }

          if (registerResult.authenticated) {
            this.persistLoginSuccess(registerResult, phone);
            return;
          }

          try {
            const loginResponse = extractAuthSessionResult(
              await loginApi({ phone, password }),
            );
            if (loginResponse.authenticated) {
              this.persistLoginSuccess(loginResponse, phone);
              return;
            }
          } catch (_error) {
            // 自动登录失败时回退到登录入口
          }

          uniApp.showToast?.({
            title: this.bindRequired
              ? "注册成功，请重新登录完成绑定"
              : "注册成功",
            icon: "success",
          });
          setTimeoutImpl(() => {
            uniApp.redirectTo?.({
              url: buildAuthPortalPageUrl("/pages/auth/login/index", this.buildQueryParams({ phone })),
            });
          }, 800);
        } catch (error) {
          const message =
            (error.data && (error.data.error || error.data.message)) ||
            error.error ||
            error.message ||
            "注册失败";
          if (this.maybeRedirectToLogin(message)) {
            return;
          }
          uniApp.showToast?.({ title: message, icon: "none" });
        } finally {
          this.loading = false;
        }
      },
    },
  };
}

export function createWechatCallbackPage(options = {}) {
  const consumeWechatSession =
    typeof options.consumeWechatSession === "function"
      ? options.consumeWechatSession
      : async () => ({});
  const normalizeErrorMessage =
    typeof options.normalizeErrorMessage === "function"
      ? options.normalizeErrorMessage
      : (_error, fallback) => fallback;
  const saveTokenInfo =
    typeof options.saveTokenInfo === "function"
      ? options.saveTokenInfo
      : () => {};
  const uniApp = resolveUniApp(options.uniApp);
  const setTimeoutImpl = resolveSetTimeoutImpl(options.setTimeoutImpl);

  return {
    data() {
      return {
        loading: true,
        failed: false,
        title: "正在处理微信登录",
        detail: "请稍候...",
        mode: "login",
        inviteCode: "",
      };
    },
    onLoad(query = {}) {
      this.mode = normalizeConsumerAuthMode(query.mode);
      this.inviteCode = normalizeConsumerInviteCode(query.inviteCode);
      void this.handleSession(query);
    },
    methods: {
      async handleSession(query = {}) {
        const sessionToken = trimAuthPortalValue(query.wechatSession);
        if (!sessionToken) {
          this.failWith("缺少微信登录会话，请重试");
          return;
        }

        try {
          const result = extractAuthSessionResult(
            await consumeWechatSession(sessionToken),
          );
          if (result.type === "login" && result.authenticated) {
            this.finishLogin(result);
            return;
          }

          if (result.type === "bind_required" && result.bindToken) {
            this.redirectToBind(result);
            return;
          }

          throw new Error(
            normalizeErrorMessage(result, "微信登录处理失败"),
          );
        } catch (error) {
          this.failWith(
            normalizeErrorMessage(error, "微信登录失败，请稍后重试"),
          );
        }
      },
      finishLogin(result) {
        persistConsumerAuthSession({
          result,
          successTitle: "登录成功",
          saveTokenInfo,
          uniApp,
          setTimeoutImpl,
          redirectDelay: 400,
        });

        this.loading = false;
        this.failed = false;
        this.title = "微信登录成功";
        this.detail = "正在进入首页...";
      },
      redirectToBind(result) {
        const targetPath =
          this.mode === "register"
            ? "/pages/auth/register/index"
            : "/pages/auth/login/index";
        const targetUrl = buildAuthPortalPageUrl(targetPath, {
          inviteCode: this.inviteCode,
          wechatBindToken: result.bindToken,
          wechatNickname: result.nickname,
          wechatAvatarUrl: result.avatarUrl,
        });

        this.loading = false;
        this.failed = false;
        this.title = "需要绑定手机号";
        this.detail = result.message || "请继续完成手机号绑定。";

        setTimeoutImpl(() => {
          uniApp.redirectTo?.({ url: targetUrl });
        }, 250);
      },
      failWith(message) {
        this.loading = false;
        this.failed = true;
        this.title = "微信登录失败";
        this.detail = trimAuthPortalValue(message) || "请稍后重试";
        uniApp.showToast?.({ title: this.detail, icon: "none" });
      },
      goNext() {
        const path =
          this.mode === "register"
            ? "/pages/auth/register/index"
            : "/pages/auth/login/index";
        uniApp.redirectTo?.({
          url: buildAuthPortalPageUrl(path, {
            inviteCode: this.inviteCode,
          }),
        });
      },
    },
  };
}
