import test from "node:test";
import assert from "node:assert/strict";

import {
  createRiderAvatarUploadPageLogic,
  normalizeRiderAvatarUploadErrorMessage,
  resolveRiderAvatarUploadUrl,
  RIDER_AVATAR_UPLOAD_DEFAULT_AVATAR,
  RIDER_AVATAR_UPLOAD_LOADING_TEXT,
  RIDER_AVATAR_UPLOAD_NAVIGATE_BACK_DELAY,
  RIDER_AVATAR_UPLOAD_SUCCESS_TEXT,
} from "./rider-avatar-upload-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  if (typeof component.onLoad === "function") {
    instance.onLoad = component.onLoad.bind(instance);
  }

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("rider avatar upload helpers normalize avatar url and error message", () => {
  assert.equal(RIDER_AVATAR_UPLOAD_DEFAULT_AVATAR, "/static/images/logo.png");
  assert.equal(resolveRiderAvatarUploadUrl({ avatar: " https://cdn/avatar.png " }), "https://cdn/avatar.png");
  assert.equal(resolveRiderAvatarUploadUrl({ avatarUrl: "/uploads/avatar.png" }), "/uploads/avatar.png");
  assert.equal(normalizeRiderAvatarUploadErrorMessage({ message: " 上传失败了 " }), "上传失败了");
  assert.equal(normalizeRiderAvatarUploadErrorMessage({}, "默认错误"), "默认错误");
});

test("rider avatar upload page loads current avatar and chooses image sources", async () => {
  const sourceTypes = [];
  const uploadedPaths = [];
  const component = createRiderAvatarUploadPageLogic({
    readRiderAuthIdentity() {
      return {
        profile: {
          avatar: " https://cdn.example.com/current.png ",
        },
      };
    },
    uniApp: {
      chooseImage(payload) {
        sourceTypes.push(payload.sourceType);
        payload.success({
          tempFilePaths: ["/tmp/avatar.png"],
        });
      },
    },
  });
  const page = instantiatePage(component);
  page.uploadAvatar = async (filePath) => {
    uploadedPaths.push(filePath);
  };

  page.onLoad();
  page.chooseFromAlbum();
  page.takePhoto();

  assert.equal(page.avatarUrl, "https://cdn.example.com/current.png");
  assert.deepEqual(sourceTypes, [["album"], ["camera"]]);
  assert.deepEqual(uploadedPaths, ["/tmp/avatar.png", "/tmp/avatar.png"]);
});

test("rider avatar upload page uploads avatar, updates session and navigates back", async () => {
  const uploadCalls = [];
  const updatedAvatars = [];
  const persistedSessions = [];
  const loadingEvents = [];
  const toasts = [];
  const navigations = [];
  const timeoutDelays = [];
  const uniApp = {
    showLoading(payload) {
      loadingEvents.push({ type: "show", payload });
    },
    hideLoading() {
      loadingEvents.push({ type: "hide" });
    },
    showToast(payload) {
      toasts.push(payload);
    },
    navigateBack() {
      navigations.push("back");
    },
    getStorageSync() {
      return "";
    },
  };

  const component = createRiderAvatarUploadPageLogic({
    async uploadImage(filePath, options) {
      uploadCalls.push({ filePath, options });
      return {
        data: {
          asset_url: " https://cdn.example.com/avatar-next.png ",
        },
      };
    },
    async updateAvatar(avatarUrl) {
      updatedAvatars.push(avatarUrl);
    },
    readRiderAuthSession() {
      return {
        token: "token-1",
        refreshToken: "refresh-1",
        tokenExpiresAt: 123456,
        accountId: "rider-1",
        profile: {
          nickname: "骑手老张",
        },
      };
    },
    persistRiderAuthSession(payload) {
      persistedSessions.push(payload);
    },
    uniApp,
    setTimeoutFn(callback, delay) {
      timeoutDelays.push(delay);
      callback();
    },
  });
  const page = instantiatePage(component);

  await page.uploadAvatar("/tmp/avatar-next.png");

  assert.equal(page.avatarUrl, "https://cdn.example.com/avatar-next.png");
  assert.deepEqual(uploadCalls, [
    {
      filePath: "/tmp/avatar-next.png",
      options: {
        uploadDomain: "profile_image",
      },
    },
  ]);
  assert.deepEqual(updatedAvatars, ["https://cdn.example.com/avatar-next.png"]);
  assert.deepEqual(persistedSessions, [
    {
      uniApp,
      token: "token-1",
      refreshToken: "refresh-1",
      tokenExpiresAt: 123456,
      profile: {
        nickname: "骑手老张",
        avatar: "https://cdn.example.com/avatar-next.png",
      },
      extraStorageValues: {
        riderId: "rider-1",
        riderName: "骑手老张",
      },
    },
  ]);
  assert.deepEqual(loadingEvents, [
    {
      type: "show",
      payload: {
        title: RIDER_AVATAR_UPLOAD_LOADING_TEXT,
      },
    },
    {
      type: "hide",
    },
  ]);
  assert.deepEqual(toasts, [
    {
      title: RIDER_AVATAR_UPLOAD_SUCCESS_TEXT,
      icon: "success",
    },
  ]);
  assert.deepEqual(timeoutDelays, [RIDER_AVATAR_UPLOAD_NAVIGATE_BACK_DELAY]);
  assert.deepEqual(navigations, ["back"]);
});

test("rider avatar upload page skips session persistence when token missing", async () => {
  let persistCallCount = 0;
  const toasts = [];
  const component = createRiderAvatarUploadPageLogic({
    async uploadImage() {
      return {
        data: {
          asset_url: "https://cdn.example.com/avatar-public.png",
        },
      };
    },
    async updateAvatar() {},
    readRiderAuthSession() {
      return {
        token: "",
      };
    },
    persistRiderAuthSession() {
      persistCallCount += 1;
    },
    uniApp: {
      showLoading() {},
      hideLoading() {},
      showToast(payload) {
        toasts.push(payload);
      },
      navigateBack() {},
    },
    setTimeoutFn(callback) {
      callback();
    },
  });
  const page = instantiatePage(component);

  await page.uploadAvatar("/tmp/avatar-public.png");

  assert.equal(page.avatarUrl, "https://cdn.example.com/avatar-public.png");
  assert.equal(persistCallCount, 0);
  assert.deepEqual(toasts, [
    {
      title: RIDER_AVATAR_UPLOAD_SUCCESS_TEXT,
      icon: "success",
    },
  ]);
});

test("rider avatar upload page surfaces empty upload url and update failures", async () => {
  const toasts = [];
  const loadingEvents = [];

  const emptyUrlComponent = createRiderAvatarUploadPageLogic({
    async uploadImage() {
      return {
        data: {},
      };
    },
    uniApp: {
      showLoading() {
        loadingEvents.push("show-empty");
      },
      hideLoading() {
        loadingEvents.push("hide-empty");
      },
      showToast(payload) {
        toasts.push(payload);
      },
    },
  });
  const emptyUrlPage = instantiatePage(emptyUrlComponent);
  await emptyUrlPage.uploadAvatar("/tmp/empty.png");

  const updateFailComponent = createRiderAvatarUploadPageLogic({
    async uploadImage() {
      return {
        data: {
          asset_url: "https://cdn.example.com/avatar-error.png",
        },
      };
    },
    async updateAvatar() {
      throw new Error("头像保存失败");
    },
    uniApp: {
      showLoading() {
        loadingEvents.push("show-update");
      },
      hideLoading() {
        loadingEvents.push("hide-update");
      },
      showToast(payload) {
        toasts.push(payload);
      },
    },
  });
  const updateFailPage = instantiatePage(updateFailComponent);
  await updateFailPage.uploadAvatar("/tmp/update.png");

  assert.deepEqual(loadingEvents, [
    "show-empty",
    "hide-empty",
    "show-update",
    "hide-update",
  ]);
  assert.deepEqual(toasts, [
    {
      title: "上传返回地址为空",
      icon: "none",
    },
    {
      title: "头像保存失败",
      icon: "none",
    },
  ]);
});
