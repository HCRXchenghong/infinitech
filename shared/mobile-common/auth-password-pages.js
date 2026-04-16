import {
  buildConsumerSetPasswordPageUrl,
  normalizeConsumerAuthPhone,
  resolveConsumerPasswordResetTicket,
  validateConsumerNewPasswordForm,
} from "../../packages/mobile-core/src/auth-portal.js";

function pickConsumerAuthErrorMessage(
  error,
  fallback,
  normalizeErrorMessage = (_error, message) => message,
) {
  return normalizeErrorMessage(error, fallback);
}

export function createResetPasswordPage({
  requestSMSCode = async () => ({}),
  verifySMSCodeCheck = async () => ({}),
  getCachedConsumerAuthRuntimeSettings = () => ({}),
  loadConsumerAuthRuntimeSettings = async () => ({}),
  normalizeErrorMessage = (_error, fallback) => fallback,
} = {}) {
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

export function createSetPasswordPage({
  request = async () => ({}),
  getCachedConsumerAuthRuntimeSettings = () => ({}),
  loadConsumerAuthRuntimeSettings = async () => ({}),
  normalizeErrorMessage = (_error, fallback) => fallback,
} = {}) {
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
              password: validation.password,
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
