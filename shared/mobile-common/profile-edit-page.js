import {
  buildConsumerProfileAvatarText,
  buildConsumerProfileUpdatePayload,
  createDefaultProfileEditPresetBackgrounds,
  extractConsumerProfilePayload,
  extractConsumerUploadedImageUrl,
  normalizeConsumerProfileEditErrorMessage,
  normalizeConsumerProfileEditViewModel,
  resolveConsumerProfileUserId,
} from "../../packages/mobile-core/src/profile-edit.js";
import { UPLOAD_DOMAINS } from "../../packages/contracts/src/upload.js";

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
        const current = uni.getStorageSync("userProfile") || {};
        uni.setStorageSync("userProfile", {
          ...current,
          ...nextProfile,
        });
      },
      async loadProfile() {
        const localProfile = uni.getStorageSync("userProfile") || {};
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
