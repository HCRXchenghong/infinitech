import {
  createPasswordResetCooldownController,
  trimPasswordResetPortalValue,
} from "./password-reset-portal.js";

export const ROLE_PHONE_CHANGE_OLD_SCENE = "change_phone_verify";
export const ROLE_PHONE_CHANGE_NEW_SCENE = "change_phone_new";
export const DEFAULT_ROLE_PHONE_CHANGE_COUNTDOWN_SECONDS = 60;

function normalizeRolePhoneChangeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function trimRolePhoneChangeValue(value) {
  return trimPasswordResetPortalValue(value);
}

export function normalizeRolePhoneChangePhone(value) {
  return trimRolePhoneChangeValue(value);
}

export function maskRolePhoneChangePhone(value, fallback = "--") {
  const phone = normalizeRolePhoneChangePhone(value);
  if (/^1\d{10}$/.test(phone)) {
    return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
  }
  return phone || fallback;
}

export function normalizeRolePhoneChangeCode(value, length = 6) {
  return trimRolePhoneChangeValue(value).slice(0, length);
}

export function isRolePhoneChangePhoneValid(value) {
  return /^1\d{10}$/.test(normalizeRolePhoneChangePhone(value));
}

export function isRolePhoneChangeCodeValid(value, length = 6) {
  return normalizeRolePhoneChangeCode(value, length).length === length;
}

export function isRolePhoneChangeNewPhoneValid(newPhone, oldPhone) {
  const normalizedNewPhone = normalizeRolePhoneChangePhone(newPhone);
  return (
    isRolePhoneChangePhoneValid(normalizedNewPhone) &&
    normalizedNewPhone !== normalizeRolePhoneChangePhone(oldPhone)
  );
}

export function resolveRolePhoneChangeProfilePhone(profile = {}) {
  return normalizeRolePhoneChangePhone(profile?.phone);
}

export function resolveRolePhoneChangeProfileId(profile = {}) {
  return trimRolePhoneChangeValue(profile?.id || profile?.userId || profile?.phone);
}

export function normalizeRolePhoneChangeErrorMessage(
  error,
  fallback = "操作失败，请稍后重试",
) {
  const source = normalizeRolePhoneChangeObject(error);
  const data = normalizeRolePhoneChangeObject(source.data);
  return (
    trimRolePhoneChangeValue(data.error) ||
    trimRolePhoneChangeValue(data.message) ||
    trimRolePhoneChangeValue(source.error) ||
    trimRolePhoneChangeValue(source.message) ||
    trimRolePhoneChangeValue(source.errMsg) ||
    trimRolePhoneChangeValue(fallback)
  );
}

export function getRolePhoneChangeResponseMessage(response, fallback) {
  const source = normalizeRolePhoneChangeObject(response);
  return trimRolePhoneChangeValue(source.message) || trimRolePhoneChangeValue(fallback);
}

export function buildRolePhoneChangePayload({
  oldPhone = "",
  oldCode = "",
  newPhone = "",
  newCode = "",
} = {}) {
  return {
    oldPhone: normalizeRolePhoneChangePhone(oldPhone),
    oldCode: normalizeRolePhoneChangeCode(oldCode),
    newPhone: normalizeRolePhoneChangePhone(newPhone),
    newCode: normalizeRolePhoneChangeCode(newCode),
  };
}

export function normalizeRolePhoneChangeProfile(
  profile = {},
  responseUser = {},
  newPhone = "",
) {
  const current = normalizeRolePhoneChangeObject(profile);
  const user = normalizeRolePhoneChangeObject(responseUser);
  const normalizedPhone =
    normalizeRolePhoneChangePhone(newPhone) ||
    normalizeRolePhoneChangePhone(user.phone) ||
    normalizeRolePhoneChangePhone(current.phone);

  const nextProfile = {
    ...current,
    ...user,
    phone: normalizedPhone,
  };

  if (nextProfile.id || nextProfile.userId) {
    nextProfile.userId = trimRolePhoneChangeValue(
      nextProfile.userId || nextProfile.id,
    );
  }

  return nextProfile;
}

export function getNextRolePhoneChangeCountdownValue(value) {
  const current = Number(value);
  if (!Number.isFinite(current) || current <= 1) {
    return 0;
  }
  return current - 1;
}

export function createRolePhoneChangeCountdownController(options = {}) {
  return createPasswordResetCooldownController({
    duration: DEFAULT_ROLE_PHONE_CHANGE_COUNTDOWN_SECONDS,
    ...options,
  });
}

export function validateRolePhoneChangeCurrentPhoneInput(phoneValue, options = {}) {
  const phone = normalizeRolePhoneChangePhone(phoneValue);
  if (isRolePhoneChangePhoneValid(phone)) {
    return { phone, error: "" };
  }

  return {
    phone: "",
    error:
      trimRolePhoneChangeValue(options.invalidPhoneMessage) || "请输入正确手机号",
  };
}

export function validateRolePhoneChangeNewPhoneInput(
  newPhoneValue,
  oldPhoneValue,
  options = {},
) {
  const oldPhone = normalizeRolePhoneChangePhone(oldPhoneValue);
  const newPhone = normalizeRolePhoneChangePhone(newPhoneValue);

  if (!isRolePhoneChangePhoneValid(newPhone)) {
    return {
      phone: "",
      error:
        trimRolePhoneChangeValue(options.invalidPhoneMessage) ||
        "请输入正确手机号",
    };
  }

  if (newPhone === oldPhone) {
    return {
      phone: "",
      error:
        trimRolePhoneChangeValue(options.samePhoneMessage) ||
        "新手机号不能与原手机号相同",
    };
  }

  return { phone: newPhone, error: "" };
}

export async function requestRolePhoneChangeCode(options = {}) {
  const step = options.step === "new" ? "new" : "old";
  const validation =
    step === "new"
      ? validateRolePhoneChangeNewPhoneInput(
          options.phoneValue,
          options.oldPhoneValue,
          options,
        )
      : validateRolePhoneChangeCurrentPhoneInput(options.phoneValue, options);

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
          trimRolePhoneChangeValue(response?.error) ||
          trimRolePhoneChangeValue(response?.message) ||
          trimRolePhoneChangeValue(options.failureMessage) ||
          "发送验证码失败",
      };
    }

    options.cooldownController?.start?.();

    return {
      ok: true,
      phone: validation.phone,
      response,
      message:
        getRolePhoneChangeResponseMessage(
          response,
          trimRolePhoneChangeValue(options.successMessage) || "验证码已发送",
        ) || "验证码已发送",
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      phone: validation.phone,
      error,
      message: normalizeRolePhoneChangeErrorMessage(
        error,
        trimRolePhoneChangeValue(options.failureMessage) || "发送验证码失败",
      ),
    };
  }
}

export async function verifyRolePhoneChangeCode(options = {}) {
  const validation = validateRolePhoneChangeCurrentPhoneInput(
    options.phoneValue,
    options,
  );
  if (!validation.phone) {
    return {
      ok: false,
      reason: "invalid_phone",
      phone: "",
      code: "",
      message: validation.error,
    };
  }

  const codeLength = Number.isFinite(Number(options.codeLength))
    ? Number(options.codeLength)
    : 6;
  const code = normalizeRolePhoneChangeCode(options.codeValue, codeLength);
  if (code.length !== codeLength) {
    return {
      ok: false,
      reason: "invalid_code",
      phone: validation.phone,
      code: "",
      message:
        trimRolePhoneChangeValue(options.invalidCodeMessage) ||
        `请输入${codeLength}位验证码`,
    };
  }

  try {
    const response = await options.verifySMSCodeCheck?.(
      validation.phone,
      options.scene,
      code,
    );
    if (response?.success === false) {
      return {
        ok: false,
        reason: "verify_failed",
        phone: validation.phone,
        code,
        response,
        message:
          trimRolePhoneChangeValue(response?.error) ||
          trimRolePhoneChangeValue(response?.message) ||
          trimRolePhoneChangeValue(options.failureMessage) ||
          "验证码错误",
      };
    }

    return {
      ok: true,
      phone: validation.phone,
      code,
      response,
      message:
        getRolePhoneChangeResponseMessage(
          response,
          trimRolePhoneChangeValue(options.successMessage) || "验证通过",
        ) || "验证通过",
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      phone: validation.phone,
      code,
      error,
      message: normalizeRolePhoneChangeErrorMessage(
        error,
        trimRolePhoneChangeValue(options.failureMessage) || "验证码错误",
      ),
    };
  }
}
