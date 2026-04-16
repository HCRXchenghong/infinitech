function trimPhoneChangeText(value) {
  return String(value || "").trim();
}

function normalizePhoneChangeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export const CONSUMER_PHONE_CHANGE_OLD_SCENE = "change_phone_verify";
export const CONSUMER_PHONE_CHANGE_NEW_SCENE = "change_phone_new";
export const DEFAULT_CONSUMER_PHONE_CHANGE_COUNTDOWN_SECONDS = 60;

export function normalizeConsumerPhoneChangePhone(value) {
  return trimPhoneChangeText(value);
}

export function maskConsumerPhoneChangePhone(value, fallback = "--") {
  const phone = normalizeConsumerPhoneChangePhone(value);
  if (/^1\d{10}$/.test(phone)) {
    return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
  }
  return phone || fallback;
}

export function normalizeConsumerPhoneChangeCode(value, length = 6) {
  return trimPhoneChangeText(value).slice(0, length);
}

export function isConsumerPhoneChangePhoneValid(value) {
  return /^1\d{10}$/.test(normalizeConsumerPhoneChangePhone(value));
}

export function isConsumerPhoneChangeCodeValid(value, length = 6) {
  return normalizeConsumerPhoneChangeCode(value, length).length === length;
}

export function isConsumerPhoneChangeNewPhoneValid(newPhone, oldPhone) {
  const normalizedNewPhone = normalizeConsumerPhoneChangePhone(newPhone);
  return (
    isConsumerPhoneChangePhoneValid(normalizedNewPhone) &&
    normalizedNewPhone !== normalizeConsumerPhoneChangePhone(oldPhone)
  );
}

export function resolveConsumerPhoneChangeOldPhone(profile = {}) {
  return normalizeConsumerPhoneChangePhone(profile?.phone);
}

export function resolveConsumerPhoneChangeUserId(profile = {}) {
  return trimPhoneChangeText(profile?.id || profile?.userId || profile?.phone);
}

export function normalizeConsumerPhoneChangeErrorMessage(
  error,
  fallback = "操作失败，请稍后重试",
) {
  const source = normalizePhoneChangeObject(error);
  const data = normalizePhoneChangeObject(source.data);
  return (
    trimPhoneChangeText(data.error) ||
    trimPhoneChangeText(data.message) ||
    trimPhoneChangeText(source.error) ||
    trimPhoneChangeText(source.message) ||
    trimPhoneChangeText(source.errMsg) ||
    fallback
  );
}

export function getConsumerPhoneChangeResponseMessage(response, fallback) {
  const source = normalizePhoneChangeObject(response);
  return trimPhoneChangeText(source.message) || fallback;
}

export function buildConsumerPhoneChangePayload({
  oldPhone = "",
  oldCode = "",
  newPhone = "",
  newCode = "",
} = {}) {
  return {
    oldPhone: normalizeConsumerPhoneChangePhone(oldPhone),
    oldCode: normalizeConsumerPhoneChangeCode(oldCode),
    newPhone: normalizeConsumerPhoneChangePhone(newPhone),
    newCode: normalizeConsumerPhoneChangeCode(newCode),
  };
}

export function normalizeConsumerPhoneChangeProfile(
  profile = {},
  responseUser = {},
  newPhone = "",
) {
  const current = normalizePhoneChangeObject(profile);
  const user = normalizePhoneChangeObject(responseUser);
  const normalizedPhone =
    normalizeConsumerPhoneChangePhone(newPhone) ||
    normalizeConsumerPhoneChangePhone(user.phone) ||
    normalizeConsumerPhoneChangePhone(current.phone);

  const nextProfile = {
    ...current,
    ...user,
    phone: normalizedPhone,
  };

  if (nextProfile.id || nextProfile.userId) {
    nextProfile.userId = trimPhoneChangeText(
      nextProfile.userId || nextProfile.id,
    );
  }

  return nextProfile;
}

export function getNextConsumerPhoneChangeCountdownValue(value) {
  const current = Number(value);
  if (!Number.isFinite(current) || current <= 1) {
    return 0;
  }
  return current - 1;
}
