import {
  createPasswordResetCooldownController,
  normalizePasswordResetPhone,
  pickPasswordResetErrorMessage,
  requestPasswordResetCode,
  trimPasswordResetPortalValue,
} from "./password-reset-portal.js";

export function trimRoleLoginPortalValue(value) {
  return trimPasswordResetPortalValue(value);
}

export function normalizeRoleLoginPhone(value) {
  return normalizePasswordResetPhone(value);
}

export function validateRoleLoginPhoneInput(phoneValue, options = {}) {
  const phone = normalizeRoleLoginPhone(phoneValue);
  if (phone) {
    return { phone, error: "" };
  }

  return {
    phone: "",
    error:
      trimRoleLoginPortalValue(options.invalidPhoneMessage) || "请输入正确手机号",
  };
}

export function createRoleLoginCodeCooldownController(options = {}) {
  return createPasswordResetCooldownController(options);
}

export function pickRoleLoginErrorMessage(
  error,
  fallback,
  normalizeErrorMessage = null,
) {
  return pickPasswordResetErrorMessage(error, fallback, normalizeErrorMessage);
}

export async function requestRoleLoginCode(options = {}) {
  return requestPasswordResetCode({
    ...options,
    invalidPhoneMessage:
      trimRoleLoginPortalValue(options.invalidPhoneMessage) || "请输入正确手机号",
    successMessage:
      trimRoleLoginPortalValue(options.successMessage) || "验证码已发送",
    failureMessage:
      trimRoleLoginPortalValue(options.failureMessage) || "验证码发送失败",
  });
}
