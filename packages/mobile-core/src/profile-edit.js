import { resolveUploadAssetUrl } from "../../contracts/src/http.js";
import { UPLOAD_DOMAINS } from "../../contracts/src/upload.js";
import {
  mergeConsumerStoredProfilePatch,
  readConsumerStoredProfile,
} from "./consumer-profile-storage.js";
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
  return trimProfileEditText(resolveUploadAssetUrl(payload));
}

export function normalizeConsumerProfileEditErrorMessage(
  error,
  fallback = "保存失败",
) {
  return trimProfileEditText(error?.error || error?.message || fallback) || fallback;
}

export function createProfileEditPage({
  fetchUser = async () => ({}),
  updateUserProfile = async () => ({}),
  uploadCommonImage = async () => ({}),
} = {}) {
  return {
    data() {
      return {
        profileId: "",
        nickname: "",
        avatarUrl: "",
        headerBg: "",
        showBgPicker: false,
        saving: false,
        presetBg: createDefaultProfileEditPresetBackgrounds(),
      };
    },
    computed: {
      avatarText() {
        return buildConsumerProfileAvatarText(this.nickname);
      },
    },
    onLoad() {
      void this.loadProfile();
    },
    methods: {
      applyProfile(profile = {}) {
        const next = normalizeConsumerProfileEditViewModel(profile, this);
        this.nickname = next.nickname;
        this.avatarUrl = next.avatarUrl;
        this.headerBg = next.headerBg;
      },
      syncLocalProfile(nextProfile = {}) {
        return mergeConsumerStoredProfilePatch({
          patch: nextProfile,
          uniApp: uni,
        });
      },
      async loadProfile() {
        const localProfile = readConsumerStoredProfile({ uniApp: uni });
        const userId = resolveConsumerProfileUserId(localProfile);
        this.profileId = userId;
        this.applyProfile(localProfile);

        if (!userId) {
          return;
        }

        try {
          const remoteProfile = extractConsumerProfilePayload(await fetchUser(userId));
          this.syncLocalProfile(remoteProfile);
          this.applyProfile(remoteProfile);
        } catch (error) {
          console.error("加载用户资料失败:", error);
        }
      },
      openBgPicker() {
        this.showBgPicker = true;
      },
      closeBgPicker() {
        this.showBgPicker = false;
      },
      choosePreset(bg) {
        this.headerBg = bg;
        this.closeBgPicker();
      },
      async uploadImage(filePath, loadingText) {
        uni.showLoading({ title: loadingText, mask: true });
        try {
          const response = await uploadCommonImage(filePath, {
            uploadDomain: UPLOAD_DOMAINS.PROFILE_IMAGE,
          });
          return extractConsumerUploadedImageUrl(response);
        } finally {
          uni.hideLoading();
        }
      },
      chooseAndUploadImage({
        loadingText,
        failureTitle,
        onUploaded,
      }) {
        uni.chooseImage({
          count: 1,
          success: async (res) => {
            const path = res.tempFilePaths && res.tempFilePaths[0];
            if (!path) return;
            try {
              const uploadedUrl = await this.uploadImage(path, loadingText);
              if (!uploadedUrl) {
                throw new Error("empty upload url");
              }
              onUploaded(uploadedUrl);
            } catch (_error) {
              uni.showToast({ title: failureTitle, icon: "none" });
            }
          },
        });
      },
      chooseHeaderBgFromAlbum() {
        this.chooseAndUploadImage({
          loadingText: "上传背景中",
          failureTitle: "背景上传失败",
          onUploaded: (uploadedUrl) => {
            this.headerBg = uploadedUrl;
            this.closeBgPicker();
          },
        });
      },
      chooseAvatar() {
        this.chooseAndUploadImage({
          loadingText: "上传头像中",
          failureTitle: "头像上传失败",
          onUploaded: (uploadedUrl) => {
            this.avatarUrl = uploadedUrl;
          },
        });
      },
      async save() {
        if (this.saving) return;
        if (!this.profileId) {
          uni.showToast({ title: "缺少用户身份", icon: "none" });
          return;
        }

        const payload = buildConsumerProfileUpdatePayload({
          nickname: this.nickname,
          avatarUrl: this.avatarUrl,
          headerBg: this.headerBg,
        });
        if (!payload.nickname) {
          uni.showToast({ title: "请输入昵称", icon: "none" });
          return;
        }

        this.saving = true;
        try {
          const response = await updateUserProfile(this.profileId, payload);
          const remoteProfile = extractConsumerProfilePayload(response);
          const nextProfile = normalizeConsumerProfileEditViewModel(
            remoteProfile,
            payload,
          );
          this.syncLocalProfile(nextProfile);
          this.applyProfile(nextProfile);
          uni.showToast({ title: "保存成功", icon: "success" });
          setTimeout(() => uni.navigateBack(), 500);
        } catch (error) {
          uni.showToast({
            title: normalizeConsumerProfileEditErrorMessage(error),
            icon: "none",
          });
        } finally {
          this.saving = false;
        }
      },
    },
  };
}

export {
  DEFAULT_CONSUMER_PROFILE_NAME,
  extractConsumerProfilePayload,
  resolveConsumerProfileUserId,
};
