import { resolveUploadAssetUrl } from "../../contracts/src/http.js";
import { UPLOAD_DOMAINS } from "../../contracts/src/upload.js";

function trimRiderAvatarText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeRiderAvatarObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function resolveRiderAvatarUploadUni(uniApp) {
  return uniApp || globalThis.uni || null;
}

function showRiderAvatarUploadLoading(uniApp, title) {
  if (uniApp && typeof uniApp.showLoading === "function") {
    uniApp.showLoading({ title });
  }
}

function hideRiderAvatarUploadLoading(uniApp) {
  if (uniApp && typeof uniApp.hideLoading === "function") {
    uniApp.hideLoading();
  }
}

function showRiderAvatarUploadToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function scheduleRiderAvatarUploadTimeout(setTimeoutFn, callback, delay) {
  if (typeof setTimeoutFn === "function") {
    setTimeoutFn(callback, delay);
    return;
  }

  if (typeof globalThis.setTimeout === "function") {
    globalThis.setTimeout(callback, delay);
    return;
  }

  callback();
}

function readRiderAvatarStorageValue(uniApp, key) {
  if (!uniApp || typeof uniApp.getStorageSync !== "function") {
    return "";
  }

  try {
    return uniApp.getStorageSync(key);
  } catch (_error) {
    return "";
  }
}

export const RIDER_AVATAR_UPLOAD_DEFAULT_AVATAR = "/static/images/logo.png";
export const RIDER_AVATAR_UPLOAD_LOADING_TEXT = "上传中...";
export const RIDER_AVATAR_UPLOAD_SUCCESS_TEXT = "头像更新成功";
export const RIDER_AVATAR_UPLOAD_NAVIGATE_BACK_DELAY = 1500;

export function resolveRiderAvatarUploadUrl(profile = {}) {
  const normalizedProfile = normalizeRiderAvatarObject(profile);
  return trimRiderAvatarText(
    normalizedProfile.avatar ||
      normalizedProfile.avatarUrl ||
      normalizedProfile.avatar_url,
  );
}

export function normalizeRiderAvatarUploadErrorMessage(
  error,
  fallback = "上传失败",
) {
  return trimRiderAvatarText(error?.message || error?.error || fallback) || fallback;
}

export function createRiderAvatarUploadPageLogic(options = {}) {
  const {
    uploadImage,
    updateAvatar,
    readRiderAuthIdentity,
    readRiderAuthSession,
    persistRiderAuthSession,
    uploadDomain = UPLOAD_DOMAINS.PROFILE_IMAGE,
    uniApp,
    setTimeoutFn,
  } = options;
  const runtimeUni = resolveRiderAvatarUploadUni(uniApp);

  return {
    data() {
      return {
        avatarUrl: "",
      };
    },
    onLoad() {
      this.loadCurrentAvatar();
    },
    methods: {
      loadCurrentAvatar() {
        const riderAuth =
          typeof readRiderAuthIdentity === "function"
            ? readRiderAuthIdentity({ uniApp: runtimeUni })
            : {};
        this.avatarUrl = resolveRiderAvatarUploadUrl(riderAuth?.profile);
      },

      chooseFromAlbum() {
        this.chooseImage(["album"]);
      },

      takePhoto() {
        this.chooseImage(["camera"]);
      },

      chooseImage(sourceType) {
        if (!runtimeUni || typeof runtimeUni.chooseImage !== "function") {
          return;
        }

        runtimeUni.chooseImage({
          count: 1,
          sourceType,
          success: (result) => {
            const filePath = trimRiderAvatarText(result?.tempFilePaths?.[0]);
            if (filePath) {
              void this.uploadAvatar(filePath);
            }
          },
        });
      },

      async uploadAvatar(filePath) {
        const resolvedFilePath = trimRiderAvatarText(filePath);
        if (!resolvedFilePath) {
          return;
        }

        showRiderAvatarUploadLoading(runtimeUni, RIDER_AVATAR_UPLOAD_LOADING_TEXT);

        try {
          const uploadResult =
            typeof uploadImage === "function"
              ? await uploadImage(resolvedFilePath, {
                  uploadDomain,
                })
              : null;
          const imageUrl = trimRiderAvatarText(resolveUploadAssetUrl(uploadResult));
          if (!imageUrl) {
            throw new Error("上传返回地址为空");
          }

          if (typeof updateAvatar === "function") {
            await updateAvatar(imageUrl);
          }

          this.avatarUrl = imageUrl;

          const riderSession =
            typeof readRiderAuthSession === "function"
              ? readRiderAuthSession({ uniApp: runtimeUni })
              : {};
          const normalizedSession = normalizeRiderAvatarObject(riderSession);
          const token = trimRiderAvatarText(normalizedSession.token);

          if (token && typeof persistRiderAuthSession === "function") {
            const profile = normalizeRiderAvatarObject(normalizedSession.profile);
            persistRiderAuthSession({
              uniApp: runtimeUni,
              token,
              refreshToken: normalizedSession.refreshToken || null,
              tokenExpiresAt: normalizedSession.tokenExpiresAt || null,
              profile: {
                ...profile,
                avatar: imageUrl,
              },
              extraStorageValues: {
                riderId: normalizedSession.accountId || null,
                riderName:
                  trimRiderAvatarText(
                    profile.name ||
                      profile.nickname ||
                      readRiderAvatarStorageValue(runtimeUni, "riderName"),
                  ) || "骑手",
              },
            });
          }

          hideRiderAvatarUploadLoading(runtimeUni);
          showRiderAvatarUploadToast(runtimeUni, {
            title: RIDER_AVATAR_UPLOAD_SUCCESS_TEXT,
            icon: "success",
          });

          scheduleRiderAvatarUploadTimeout(
            setTimeoutFn,
            () => {
              if (runtimeUni && typeof runtimeUni.navigateBack === "function") {
                runtimeUni.navigateBack();
              }
            },
            RIDER_AVATAR_UPLOAD_NAVIGATE_BACK_DELAY,
          );
        } catch (error) {
          hideRiderAvatarUploadLoading(runtimeUni);
          showRiderAvatarUploadToast(runtimeUni, {
            title: normalizeRiderAvatarUploadErrorMessage(error),
            icon: "none",
          });
        }
      },
    },
  };
}
