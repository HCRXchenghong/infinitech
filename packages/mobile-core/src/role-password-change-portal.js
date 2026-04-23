import {
  createPasswordResetCooldownController,
  normalizePasswordResetPhone,
  trimPasswordResetPortalValue,
  validatePasswordResetNextPasswordForm,
} from "./password-reset-portal.js";

export const ROLE_PASSWORD_CHANGE_VERIFY_TYPE_PASSWORD = "password";
export const ROLE_PASSWORD_CHANGE_VERIFY_TYPE_CODE = "code";
export const DEFAULT_ROLE_PASSWORD_CHANGE_CODE_LENGTH = 6;
export const DEFAULT_ROLE_PASSWORD_CHANGE_COUNTDOWN_SECONDS = 60;

function normalizeRolePasswordChangeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function trimRolePasswordChangeValue(value) {
  return trimPasswordResetPortalValue(value);
}

export function normalizeRolePasswordChangeVerifyType(value) {
  return trimRolePasswordChangeValue(value) === ROLE_PASSWORD_CHANGE_VERIFY_TYPE_CODE
    ? ROLE_PASSWORD_CHANGE_VERIFY_TYPE_CODE
    : ROLE_PASSWORD_CHANGE_VERIFY_TYPE_PASSWORD;
}

export function normalizeRolePasswordChangePhone(value) {
  return normalizePasswordResetPhone(value);
}

export function normalizeRolePasswordChangeCode(
  value,
  length = DEFAULT_ROLE_PASSWORD_CHANGE_CODE_LENGTH,
) {
  return trimRolePasswordChangeValue(value).slice(0, length);
}

export function normalizeRolePasswordChangePassword(value) {
  return trimRolePasswordChangeValue(value);
}

export function normalizeRolePasswordChangeErrorMessage(
  error,
  fallback = "操作失败，请稍后重试",
) {
  const source = normalizeRolePasswordChangeObject(error);
  const data = normalizeRolePasswordChangeObject(source.data);

  return (
    trimRolePasswordChangeValue(data.error) ||
    trimRolePasswordChangeValue(data.message) ||
    trimRolePasswordChangeValue(source.error) ||
    trimRolePasswordChangeValue(source.message) ||
    trimRolePasswordChangeValue(source.errMsg) ||
    trimRolePasswordChangeValue(fallback)
  );
}

export function getRolePasswordChangeResponseMessage(response, fallback = "") {
  const source = normalizeRolePasswordChangeObject(response);
  return (
    trimRolePasswordChangeValue(source.message) ||
    trimRolePasswordChangeValue(fallback)
  );
}

export function validateRolePasswordChangePhoneInput(phoneValue, options = {}) {
  const phone = normalizeRolePasswordChangePhone(phoneValue);
  if (phone) {
    return { phone, error: "" };
  }

  return {
    phone: "",
    error:
      trimRolePasswordChangeValue(options.invalidPhoneMessage) ||
      "请输入正确手机号",
  };
}

export function validateRolePasswordChangeCodeInput(codeValue, options = {}) {
  const codeLength = Number.isFinite(Number(options.codeLength))
    ? Number(options.codeLength)
    : DEFAULT_ROLE_PASSWORD_CHANGE_CODE_LENGTH;
  const code = normalizeRolePasswordChangeCode(codeValue, codeLength);

  if (code.length === codeLength) {
    return { code, error: "" };
  }

  return {
    code: "",
    error:
      trimRolePasswordChangeValue(options.invalidCodeMessage) ||
      "请输入6位验证码",
  };
}

export function validateRolePasswordChangeCurrentPasswordInput(
  passwordValue,
  options = {},
) {
  const password = normalizeRolePasswordChangePassword(passwordValue);
  if (password) {
    return { password, error: "" };
  }

  return {
    password: "",
    error:
      trimRolePasswordChangeValue(options.emptyCurrentPasswordMessage) ||
      "请输入原密码",
  };
}

export function validateRolePasswordChangeNextPasswordForm(
  nextPasswordValue,
  confirmPasswordValue,
  options = {},
) {
  const validation = validatePasswordResetNextPasswordForm(
    nextPasswordValue,
    confirmPasswordValue,
    {
      emptyPasswordMessage:
        trimRolePasswordChangeValue(options.emptyNextPasswordMessage) ||
        trimRolePasswordChangeValue(options.emptyPasswordMessage) ||
        "请输入新密码",
      shortPasswordMessage:
        trimRolePasswordChangeValue(options.shortPasswordMessage) ||
        "密码至少6位",
      mismatchPasswordMessage:
        trimRolePasswordChangeValue(options.mismatchPasswordMessage) ||
        "两次密码不一致",
      minLength: options.minLength,
    },
  );

  return {
    password: validation.password,
    error: validation.error,
  };
}

export function buildRolePasswordChangePayload({
  verifyType = ROLE_PASSWORD_CHANGE_VERIFY_TYPE_PASSWORD,
  oldPassword = "",
  phone = "",
  code = "",
  nextPassword = "",
} = {}) {
  return {
    verifyType: normalizeRolePasswordChangeVerifyType(verifyType),
    oldPassword: normalizeRolePasswordChangePassword(oldPassword),
    phone: normalizeRolePasswordChangePhone(phone),
    code: normalizeRolePasswordChangeCode(code),
    nextPassword: normalizeRolePasswordChangePassword(nextPassword),
  };
}

export function validateRolePasswordChangeSubmitInput(options = {}) {
  const verifyType = normalizeRolePasswordChangeVerifyType(options.verifyTypeValue);
  const nextPasswordValidation = validateRolePasswordChangeNextPasswordForm(
    options.nextPasswordValue,
    options.confirmPasswordValue,
    options,
  );
  if (nextPasswordValidation.error) {
    return {
      ok: false,
      reason: "invalid_password",
      verifyType,
      payload: null,
      message: nextPasswordValidation.error,
    };
  }

  if (verifyType === ROLE_PASSWORD_CHANGE_VERIFY_TYPE_PASSWORD) {
    const currentPasswordValidation =
      validateRolePasswordChangeCurrentPasswordInput(
        options.oldPasswordValue,
        options,
      );
    if (currentPasswordValidation.error) {
      return {
        ok: false,
        reason: "invalid_current_password",
        verifyType,
        payload: null,
        message: currentPasswordValidation.error,
      };
    }

    return {
      ok: true,
      reason: "",
      verifyType,
      payload: buildRolePasswordChangePayload({
        verifyType,
        oldPassword: currentPasswordValidation.password,
        nextPassword: nextPasswordValidation.password,
      }),
      message: "",
    };
  }

  const phoneValidation = validateRolePasswordChangePhoneInput(
    options.phoneValue,
    options,
  );
  if (phoneValidation.error) {
    return {
      ok: false,
      reason: "invalid_phone",
      verifyType,
      payload: null,
      message: phoneValidation.error,
    };
  }

  const codeValidation = validateRolePasswordChangeCodeInput(
    options.codeValue,
    options,
  );
  if (codeValidation.error) {
    return {
      ok: false,
      reason: "invalid_code",
      verifyType,
      payload: null,
      message: codeValidation.error,
    };
  }

  return {
    ok: true,
    reason: "",
    verifyType,
    payload: buildRolePasswordChangePayload({
      verifyType,
      phone: phoneValidation.phone,
      code: codeValidation.code,
      nextPassword: nextPasswordValidation.password,
    }),
    message: "",
  };
}

export function createRolePasswordChangeCountdownController(options = {}) {
  return createPasswordResetCooldownController({
    duration: DEFAULT_ROLE_PASSWORD_CHANGE_COUNTDOWN_SECONDS,
    ...options,
  });
}

export async function requestRolePasswordChangeCode(options = {}) {
  const validation = validateRolePasswordChangePhoneInput(
    options.phoneValue,
    options,
  );
  if (!validation.phone) {
    return {
      ok: false,
      reason: "invalid_phone",
      phone: "",
      message: validation.error,
    };
  }

  try {
    const response = await options.requestSMSCode?.(
      validation.phone,
      options.scene,
      options.extra || {},
    );
    if (response?.success === false) {
      return {
        ok: false,
        reason: "request_failed",
        phone: validation.phone,
        response,
        message:
          trimRolePasswordChangeValue(response?.error) ||
          trimRolePasswordChangeValue(response?.message) ||
          trimRolePasswordChangeValue(options.failureMessage) ||
          "发送验证码失败",
      };
    }

    options.cooldownController?.start?.();

    return {
      ok: true,
      phone: validation.phone,
      response,
      message:
        getRolePasswordChangeResponseMessage(
          response,
          trimRolePasswordChangeValue(options.successMessage) || "验证码已发送",
        ) || "验证码已发送",
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      phone: validation.phone,
      error,
      message: normalizeRolePasswordChangeErrorMessage(
        error,
        trimRolePasswordChangeValue(options.failureMessage) || "发送验证码失败",
      ),
    };
  }
}

export async function submitRolePasswordChange(options = {}) {
  const validation = validateRolePasswordChangeSubmitInput(options);
  if (!validation.ok || !validation.payload) {
    return validation;
  }

  try {
    const response = await options.changePassword?.(validation.payload);
    if (response?.success === false) {
      return {
        ok: false,
        reason: "submit_failed",
        verifyType: validation.verifyType,
        payload: validation.payload,
        response,
        message:
          trimRolePasswordChangeValue(response?.error) ||
          trimRolePasswordChangeValue(response?.message) ||
          trimRolePasswordChangeValue(options.failureMessage) ||
          "修改失败",
      };
    }

    return {
      ok: true,
      reason: "",
      verifyType: validation.verifyType,
      payload: validation.payload,
      response,
      message:
        getRolePasswordChangeResponseMessage(
          response,
          trimRolePasswordChangeValue(options.successMessage) || "密码修改成功",
        ) || "密码修改成功",
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      verifyType: validation.verifyType,
      payload: validation.payload,
      error,
      message: normalizeRolePasswordChangeErrorMessage(
        error,
        trimRolePasswordChangeValue(options.failureMessage) || "修改失败",
      ),
    };
  }
}
