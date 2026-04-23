export const DEFAULT_PASSWORD_RESET_STORAGE_KEY = "reset_password_data";

export function trimPasswordResetPortalValue(value) {
  return String(value || "").trim();
}

export function normalizePasswordResetPhone(value) {
  const phone = trimPasswordResetPortalValue(value);
  return /^1\d{10}$/.test(phone) ? phone : "";
}

export function decodePasswordResetPortalValue(value) {
  const raw = trimPasswordResetPortalValue(value);
  if (!raw) {
    return "";
  }

  try {
    return decodeURIComponent(raw);
  } catch (_error) {
    return raw;
  }
}

export function buildPasswordResetSetPasswordPageUrl(path, phone, code) {
  const basePath = trimPasswordResetPortalValue(path);
  const normalizedPhone = trimPasswordResetPortalValue(phone);
  const normalizedCode = trimPasswordResetPortalValue(code);
  const query = [];

  if (normalizedPhone) {
    query.push(`phone=${encodeURIComponent(normalizedPhone)}`);
  }
  if (normalizedCode) {
    query.push(`code=${encodeURIComponent(normalizedCode)}`);
  }

  if (!basePath || query.length === 0) {
    return basePath;
  }

  return `${basePath}?${query.join("&")}`;
}

export function resolvePasswordResetTicket(options = {}, cachedResetData = {}) {
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
      decodePasswordResetPortalValue(rawOptions.phone) ||
      trimPasswordResetPortalValue(rawCachedResetData.phone),
    code:
      decodePasswordResetPortalValue(rawOptions.code) ||
      trimPasswordResetPortalValue(rawCachedResetData.code),
  };
}

export function validatePasswordResetNextPasswordForm(
  passwordValue,
  confirmPasswordValue,
  options = {},
) {
  const password = trimPasswordResetPortalValue(passwordValue);
  const confirmPassword = trimPasswordResetPortalValue(confirmPasswordValue);
  const emptyPasswordMessage =
    trimPasswordResetPortalValue(options.emptyPasswordMessage) || "请输入新密码";
  const shortPasswordMessage =
    trimPasswordResetPortalValue(options.shortPasswordMessage) || "密码至少 6 位";
  const mismatchPasswordMessage =
    trimPasswordResetPortalValue(options.mismatchPasswordMessage) || "两次密码不一致";
  const minLength = Number.isFinite(Number(options.minLength))
    ? Number(options.minLength)
    : 6;

  if (!password) {
    return { password: "", error: emptyPasswordMessage };
  }
  if (password.length < minLength) {
    return { password: "", error: shortPasswordMessage };
  }
  if (password !== confirmPassword) {
    return { password: "", error: mismatchPasswordMessage };
  }

  return { password, error: "" };
}

export function pickPasswordResetErrorMessage(
  error,
  fallback,
  normalizeErrorMessage = null,
) {
  const normalizedFallback =
    trimPasswordResetPortalValue(fallback) || "request failed";

  if (typeof normalizeErrorMessage === "function") {
    const normalized = trimPasswordResetPortalValue(
      normalizeErrorMessage(error, normalizedFallback),
    );
    if (normalized) {
      return normalized;
    }
  }

  return (
    trimPasswordResetPortalValue(error?.error) ||
    trimPasswordResetPortalValue(error?.message) ||
    trimPasswordResetPortalValue(error?.data?.error) ||
    trimPasswordResetPortalValue(error?.data?.message) ||
    normalizedFallback
  );
}

export function createPasswordResetCooldownController(options = {}) {
  const setValue =
    typeof options.setValue === "function" ? options.setValue : () => {};
  const createInterval =
    typeof options.createInterval === "function"
      ? options.createInterval
      : setInterval;
  const clearIntervalFn =
    typeof options.clearIntervalFn === "function"
      ? options.clearIntervalFn
      : clearInterval;
  const defaultDuration = Number.isFinite(Number(options.duration))
    ? Number(options.duration)
    : 60;

  let timer = null;

  function clear() {
    if (timer) {
      clearIntervalFn(timer);
      timer = null;
    }
  }

  function start(duration = defaultDuration) {
    let remaining = Number.isFinite(Number(duration))
      ? Number(duration)
      : defaultDuration;
    if (remaining <= 0) {
      remaining = defaultDuration;
    }

    setValue(remaining);
    clear();
    timer = createInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        setValue(0);
        clear();
        return;
      }
      setValue(remaining);
    }, 1000);
  }

  return {
    clear,
    start,
    isRunning() {
      return timer !== null;
    },
  };
}

export async function requestPasswordResetCode(options = {}) {
  const phone = normalizePasswordResetPhone(options.phoneValue);
  if (!phone) {
    return {
      ok: false,
      reason: "invalid_phone",
      phone: "",
      message:
        trimPasswordResetPortalValue(options.invalidPhoneMessage) ||
        "请输入正确手机号",
    };
  }

  try {
    const response = await options.requestSMSCode?.(phone, options.scene);
    if (response?.success === false) {
      return {
        ok: false,
        reason: "request_failed",
        phone,
        response,
        message:
          trimPasswordResetPortalValue(response?.error) ||
          trimPasswordResetPortalValue(response?.message) ||
          trimPasswordResetPortalValue(options.failureMessage) ||
          "验证码发送失败",
      };
    }

    if (options.cooldownController?.start) {
      options.cooldownController.start();
    }

    return {
      ok: true,
      phone,
      response,
      message:
        trimPasswordResetPortalValue(response?.message) ||
        trimPasswordResetPortalValue(options.successMessage) ||
        "验证码已发送",
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      phone,
      error,
      message: pickPasswordResetErrorMessage(
        error,
        options.failureMessage || "验证码发送失败",
        options.normalizeErrorMessage,
      ),
    };
  }
}

export async function verifyPasswordResetCode(options = {}) {
  const phone = normalizePasswordResetPhone(options.phoneValue);
  if (!phone) {
    return {
      ok: false,
      reason: "invalid_phone",
      phone: "",
      code: "",
      message:
        trimPasswordResetPortalValue(options.invalidPhoneMessage) ||
        "请输入正确手机号",
    };
  }

  const code = trimPasswordResetPortalValue(options.codeValue);
  if (!code) {
    return {
      ok: false,
      reason: "empty_code",
      phone,
      code: "",
      message:
        trimPasswordResetPortalValue(options.emptyCodeMessage) || "请输入验证码",
    };
  }

  try {
    const response = await options.verifySMSCodeCheck?.({
      phone,
      code,
      scene: options.scene,
    });
    if (response?.success === false) {
      return {
        ok: false,
        reason: "verify_failed",
        phone,
        code,
        response,
        message:
          trimPasswordResetPortalValue(response?.error) ||
          trimPasswordResetPortalValue(response?.message) ||
          trimPasswordResetPortalValue(options.failureMessage) ||
          "验证码错误",
      };
    }

    const storageKey =
      trimPasswordResetPortalValue(options.storageKey) ||
      DEFAULT_PASSWORD_RESET_STORAGE_KEY;
    if (options.storage?.setStorageSync) {
      options.storage.setStorageSync(storageKey, { phone, code });
    }

    return {
      ok: true,
      phone,
      code,
      response,
      redirectUrl:
        options.buildSetPasswordUrl?.(phone, code) ||
        buildPasswordResetSetPasswordPageUrl("", phone, code),
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      phone,
      code,
      error,
      message: pickPasswordResetErrorMessage(
        error,
        options.failureMessage || "验证码错误",
        options.normalizeErrorMessage,
      ),
    };
  }
}

export async function submitPasswordResetNextPassword(options = {}) {
  const validation = validatePasswordResetNextPasswordForm(
    options.passwordValue,
    options.confirmPasswordValue,
    options.passwordValidation,
  );
  if (validation.error) {
    return {
      ok: false,
      reason: "invalid_password",
      phone: "",
      code: "",
      message: validation.error,
    };
  }

  const phone = trimPasswordResetPortalValue(options.phoneValue);
  const code = trimPasswordResetPortalValue(options.codeValue);
  if (!phone || !code) {
    return {
      ok: false,
      reason: "missing_ticket",
      phone,
      code,
      redirectUrl: trimPasswordResetPortalValue(options.resetPasswordUrl),
      message:
        trimPasswordResetPortalValue(options.missingTicketMessage) ||
        "校验信息已失效，请重新验证",
    };
  }

  try {
    const response = await options.submitSetNewPassword?.({
      phone,
      code,
      nextPassword: validation.password,
    });
    if (response?.success === false) {
      return {
        ok: false,
        reason: "submit_failed",
        phone,
        code,
        response,
        message:
          trimPasswordResetPortalValue(response?.error) ||
          trimPasswordResetPortalValue(response?.message) ||
          trimPasswordResetPortalValue(options.failureMessage) ||
          "设置失败",
      };
    }

    const storageKey =
      trimPasswordResetPortalValue(options.storageKey) ||
      DEFAULT_PASSWORD_RESET_STORAGE_KEY;
    if (options.storage?.removeStorageSync) {
      options.storage.removeStorageSync(storageKey);
    }

    return {
      ok: true,
      phone,
      code,
      response,
      nextPassword: validation.password,
      message:
        trimPasswordResetPortalValue(response?.message) ||
        trimPasswordResetPortalValue(options.successMessage) ||
        "密码设置成功",
      redirectUrl: trimPasswordResetPortalValue(options.loginUrl),
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      phone,
      code,
      error,
      message: pickPasswordResetErrorMessage(
        error,
        options.failureMessage || "设置失败",
        options.normalizeErrorMessage,
      ),
    };
  }
}
