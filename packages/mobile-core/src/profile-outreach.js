import { extractEnvelopeData } from "../../contracts/src/http.js";

function trimProfileOutreachText(value) {
  return String(value || "").trim();
}

function normalizeProfileOutreachObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export const DEFAULT_CONSUMER_PROFILE_COOPERATION_TYPE_OPTIONS = [
  { label: "用户反馈", value: "feedback" },
  { label: "商务合作", value: "cooperation" },
];

export const DEFAULT_CONSUMER_PROFILE_COOPERATION_CONTENT_MAX_LENGTH = 500;
export const DEFAULT_CONSUMER_PROFILE_COOPERATION_SUBJECT = "未填写主题";
export const DEFAULT_CONSUMER_PROFILE_COOPERATION_REQUIRED_MESSAGE =
  "请填写联系人、电话和内容";

export const DEFAULT_CONSUMER_INVITER_NAME = "悦享e食用户";
export const DEFAULT_CONSUMER_INVITE_CODE_ERROR_MESSAGE =
  "暂时无法获取邀请码，请稍后再试。";
export const DEFAULT_CONSUMER_INVITE_CODE_PLACEHOLDER = "暂未获取";
export const DEFAULT_CONSUMER_INVITE_MESSAGE_FALLBACK =
  "邀请码尚未获取成功，请稍后刷新页面后重试。";
export const DEFAULT_CONSUMER_INVITE_SHARE_TITLE = "邀请你加入悦享e食";
export const CONSUMER_INVITE_CODE_STORAGE_KEY = "inviteCode";
export const CONSUMER_PROFILE_STORAGE_KEY = "userProfile";
export const CONSUMER_INVITE_REGISTER_PAGE_URL =
  "/pages/auth/register/index";

export function createDefaultConsumerCooperationTypeOptions() {
  return DEFAULT_CONSUMER_PROFILE_COOPERATION_TYPE_OPTIONS.map((item) => ({ ...item }));
}

export function createDefaultConsumerCooperationForm() {
  return {
    subject: "",
    name: "",
    phone: "",
    content: "",
  };
}

export function normalizeConsumerCooperationTypeIndex(value) {
  const parsed = Number(value);
  if (
    Number.isInteger(parsed) &&
    parsed >= 0 &&
    parsed < DEFAULT_CONSUMER_PROFILE_COOPERATION_TYPE_OPTIONS.length
  ) {
    return parsed;
  }
  return 0;
}

export function normalizeConsumerCooperationForm(
  form = {},
  maxLength = DEFAULT_CONSUMER_PROFILE_COOPERATION_CONTENT_MAX_LENGTH,
) {
  const source = normalizeProfileOutreachObject(form);
  return {
    subject: trimProfileOutreachText(source.subject),
    name: trimProfileOutreachText(source.name),
    phone: trimProfileOutreachText(source.phone),
    content: trimProfileOutreachText(source.content).slice(0, maxLength),
  };
}

export function validateConsumerCooperationForm(form = {}) {
  const normalized = normalizeConsumerCooperationForm(form);
  if (!normalized.name || !normalized.phone || !normalized.content) {
    return {
      valid: false,
      message: DEFAULT_CONSUMER_PROFILE_COOPERATION_REQUIRED_MESSAGE,
    };
  }
  return { valid: true, message: "" };
}

export function buildConsumerCooperationPayload(form = {}, typeIndex = 0) {
  const normalizedForm = normalizeConsumerCooperationForm(form);
  const normalizedTypeIndex = normalizeConsumerCooperationTypeIndex(typeIndex);
  const cooperationType =
    DEFAULT_CONSUMER_PROFILE_COOPERATION_TYPE_OPTIONS[normalizedTypeIndex]
      ?.value || DEFAULT_CONSUMER_PROFILE_COOPERATION_TYPE_OPTIONS[0].value;

  return {
    company:
      normalizedForm.subject || DEFAULT_CONSUMER_PROFILE_COOPERATION_SUBJECT,
    contact_name: normalizedForm.name,
    contact_phone: normalizedForm.phone,
    cooperation_type: cooperationType,
    city: "",
    description: normalizedForm.content,
  };
}

export function resolveConsumerInviteProfile(profile = {}) {
  const source = normalizeProfileOutreachObject(profile);
  return {
    userId: trimProfileOutreachText(source.id || source.userId || source.phone),
    phone: trimProfileOutreachText(source.phone),
    name:
      trimProfileOutreachText(source.nickname || source.name) ||
      DEFAULT_CONSUMER_INVITER_NAME,
  };
}

export function extractConsumerInviteLandingUrl(payload) {
  const data = extractEnvelopeData(payload);
  const source =
    data && typeof data === "object" && !Array.isArray(data) ? data : payload;
  return trimProfileOutreachText(
    source?.invite_landing_url || source?.inviteLandingURL,
  );
}

export function extractConsumerInviteCode(payload) {
  const data = extractEnvelopeData(payload);
  const source =
    data && typeof data === "object" && !Array.isArray(data) ? data : payload;
  return trimProfileOutreachText(
    source?.code || source?.invite_code || source?.inviteCode,
  );
}

export function hasConsumerInviteCode(value) {
  return trimProfileOutreachText(value).length > 0;
}

export function resolveConsumerInviteCodeDisplay(
  inviteCode,
  fallback = DEFAULT_CONSUMER_INVITE_CODE_PLACEHOLDER,
) {
  const normalizedCode = trimProfileOutreachText(inviteCode);
  return normalizedCode || fallback;
}

export function buildConsumerInviteLink(inviteLandingURL, inviteCode) {
  const landingURL = trimProfileOutreachText(inviteLandingURL);
  const normalizedCode = trimProfileOutreachText(inviteCode);
  if (!landingURL || !normalizedCode) {
    return "";
  }
  const connector = landingURL.includes("?") ? "&" : "?";
  return `${landingURL}${connector}inviteCode=${encodeURIComponent(normalizedCode)}`;
}

export function buildConsumerInviteMessage({
  inviteCode,
  inviteLink = "",
  inviterName = DEFAULT_CONSUMER_INVITER_NAME,
} = {}) {
  const normalizedCode = trimProfileOutreachText(inviteCode);
  if (!normalizedCode) {
    return DEFAULT_CONSUMER_INVITE_MESSAGE_FALLBACK;
  }

  const normalizedInviterName =
    trimProfileOutreachText(inviterName) || DEFAULT_CONSUMER_INVITER_NAME;
  const normalizedInviteLink = trimProfileOutreachText(inviteLink);
  if (normalizedInviteLink) {
    return `${normalizedInviterName}邀请你体验悦享e食，邀请码：${normalizedCode}。注册时填写邀请码即可绑定邀请关系，注册链接：${normalizedInviteLink}`;
  }

  return `${normalizedInviterName}邀请你体验悦享e食，邀请码：${normalizedCode}。打开应用后，在注册页填写邀请码即可完成绑定。`;
}

export function buildConsumerInviteSharePath(inviteCode) {
  const normalizedCode = trimProfileOutreachText(inviteCode);
  if (!normalizedCode) {
    return CONSUMER_INVITE_REGISTER_PAGE_URL;
  }
  return `${CONSUMER_INVITE_REGISTER_PAGE_URL}?inviteCode=${encodeURIComponent(normalizedCode)}`;
}

export function buildConsumerInviteShareRecordPayload(
  profile = {},
  inviteCode = "",
) {
  const normalizedProfile = resolveConsumerInviteProfile(profile);
  return {
    userId: normalizedProfile.userId,
    phone: normalizedProfile.phone,
    code: trimProfileOutreachText(inviteCode),
  };
}
