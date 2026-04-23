import {
  DEFAULT_PASSWORD_RESET_STORAGE_KEY,
  buildPasswordResetSetPasswordPageUrl,
  createPasswordResetCooldownController,
  requestPasswordResetCode,
  resolvePasswordResetTicket,
  submitPasswordResetNextPassword,
  trimPasswordResetPortalValue,
  verifyPasswordResetCode,
} from "./password-reset-portal.js";

export const DEFAULT_ROLE_PASSWORD_RESET_STORAGE_KEY =
  DEFAULT_PASSWORD_RESET_STORAGE_KEY;

export function trimRolePasswordResetValue(value) {
  return trimPasswordResetPortalValue(value);
}

export function buildRolePasswordResetSetPasswordPageUrl(path, phone, code) {
  return buildPasswordResetSetPasswordPageUrl(path, phone, code);
}

export function resolveRolePasswordResetTicket(options = {}, cachedResetData = {}) {
  return resolvePasswordResetTicket(options, cachedResetData);
}

export function createRolePasswordResetCooldownController(options = {}) {
  return createPasswordResetCooldownController(options);
}

function callRolePasswordResetRequestSMSCode(options, phone, scene) {
  const requestSMSCode =
    typeof options.requestSMSCode === "function"
      ? options.requestSMSCode
      : async () => ({});
  return requestSMSCode(phone, scene || options.scene, options.extra || {});
}

function callRolePasswordResetVerifySMSCodeCheck(options, payload) {
  const verifySMSCodeCheck =
    typeof options.verifySMSCodeCheck === "function"
      ? options.verifySMSCodeCheck
      : async () => ({});

  if (verifySMSCodeCheck.length >= 3) {
    return verifySMSCodeCheck(
      payload.phone,
      payload.scene || options.scene,
      payload.code,
    );
  }

  return verifySMSCodeCheck(payload);
}

export async function requestRolePasswordResetCode(options = {}) {
  return requestPasswordResetCode({
    ...options,
    invalidPhoneMessage:
      trimRolePasswordResetValue(options.invalidPhoneMessage) ||
      "请输入正确手机号",
    successMessage:
      trimRolePasswordResetValue(options.successMessage) || "验证码已发送",
    failureMessage:
      trimRolePasswordResetValue(options.failureMessage) || "验证码发送失败",
    requestSMSCode: (phone, scene) =>
      callRolePasswordResetRequestSMSCode(options, phone, scene),
  });
}

export async function verifyRolePasswordResetCode(options = {}) {
  return verifyPasswordResetCode({
    ...options,
    invalidPhoneMessage:
      trimRolePasswordResetValue(options.invalidPhoneMessage) ||
      "请输入正确手机号",
    emptyCodeMessage:
      trimRolePasswordResetValue(options.emptyCodeMessage) || "请输入验证码",
    failureMessage:
      trimRolePasswordResetValue(options.failureMessage) || "验证码错误",
    storageKey:
      trimRolePasswordResetValue(options.storageKey) ||
      DEFAULT_ROLE_PASSWORD_RESET_STORAGE_KEY,
    verifySMSCodeCheck: (payload) =>
      callRolePasswordResetVerifySMSCodeCheck(options, payload),
  });
}

export async function submitRolePasswordResetNextPassword(options = {}) {
  return submitPasswordResetNextPassword({
    ...options,
    storageKey:
      trimRolePasswordResetValue(options.storageKey) ||
      DEFAULT_ROLE_PASSWORD_RESET_STORAGE_KEY,
    missingTicketMessage:
      trimRolePasswordResetValue(options.missingTicketMessage) ||
      "校验信息已失效，请重新验证",
    successMessage:
      trimRolePasswordResetValue(options.successMessage) || "密码设置成功",
    failureMessage:
      trimRolePasswordResetValue(options.failureMessage) || "设置失败",
  });
}
