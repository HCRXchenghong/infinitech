import { extractUploadAsset } from "../../contracts/src/http.js";
import {
  DEFAULT_CONSUMER_PROFILE_NAME,
  extractConsumerProfilePayload,
  resolveConsumerProfileUserId,
} from "./profile-home.js";

function trimProfileEditText(value) {
  return String(value || "").trim();
}

export const DEFAULT_PROFILE_EDIT_PRESET_BACKGROUNDS = [
  {
    label: "渐变蓝",
    value: "linear-gradient(135deg,#38bdf8,#0ea5e9)",
  },
  {
    label: "暖橙",
    value: "linear-gradient(135deg,#f97316,#fb923c)",
  },
  {
    label: "夜景",
    value: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800",
  },
  {
    label: "城市",
    value: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800",
  },
];

export function createDefaultProfileEditPresetBackgrounds() {
  return DEFAULT_PROFILE_EDIT_PRESET_BACKGROUNDS.map((item) => ({ ...item }));
}

export function buildConsumerProfileAvatarText(nickname, fallback = "U") {
  const value = trimProfileEditText(nickname);
  return value ? value.charAt(0).toUpperCase() : fallback;
}

export function normalizeConsumerProfileEditViewModel(profile = {}, fallback = {}) {
  const source =
    profile && typeof profile === "object" && !Array.isArray(profile)
      ? profile
      : {};
  const current =
    fallback && typeof fallback === "object" && !Array.isArray(fallback)
      ? fallback
      : {};

  return {
    nickname:
      trimProfileEditText(source.nickname || source.name) ||
      trimProfileEditText(current.nickname) ||
      DEFAULT_CONSUMER_PROFILE_NAME,
    avatarUrl:
      trimProfileEditText(source.avatarUrl) ||
      trimProfileEditText(current.avatarUrl),
    headerBg:
      trimProfileEditText(source.headerBg) ||
      trimProfileEditText(current.headerBg),
  };
}

export function buildConsumerProfileUpdatePayload(input = {}) {
  const source =
    input && typeof input === "object" && !Array.isArray(input) ? input : {};
  return {
    nickname: trimProfileEditText(source.nickname),
    avatarUrl: trimProfileEditText(source.avatarUrl),
    headerBg: trimProfileEditText(source.headerBg),
  };
}

export function extractConsumerUploadedImageUrl(payload) {
  const asset = extractUploadAsset(payload);
  return trimProfileEditText(
    asset?.asset_url || asset?.url || payload?.url || payload?.data?.url,
  );
}

export function normalizeConsumerProfileEditErrorMessage(
  error,
  fallback = "保存失败",
) {
  return trimProfileEditText(error?.error || error?.message || fallback) || fallback;
}

export {
  DEFAULT_CONSUMER_PROFILE_NAME,
  extractConsumerProfilePayload,
  resolveConsumerProfileUserId,
};
