<template>
  <view class="container">
    <view class="avatar-preview">
      <image
        :src="avatarUrl || '/static/images/logo.png'"
        mode="aspectFill"
        class="avatar-img"
      />
    </view>
    <view class="actions">
      <button class="btn" @click="chooseFromAlbum">从相册选择</button>
      <button class="btn" @click="takePhoto">拍照</button>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from "vue";
import { UPLOAD_DOMAINS } from "../../../packages/contracts/src/upload.js";
import { updateAvatar, uploadImage } from "../../shared-ui/api";
import {
  persistRiderAuthSession,
  readRiderAuthIdentity,
  readRiderAuthSession,
} from "../../shared-ui/auth-session.js";

export default Vue.extend({
  data() {
    return {
      avatarUrl: "",
    };
  },
  onLoad() {
    const riderAuth = readRiderAuthIdentity({ uniApp: uni });
    if (riderAuth.profile?.avatar) {
      this.avatarUrl = riderAuth.profile.avatar;
    }
  },
  methods: {
    chooseFromAlbum() {
      uni.chooseImage({
        count: 1,
        sourceType: ["album"],
        success: (res: any) => {
          this.uploadAvatar(res.tempFilePaths[0]);
        },
      });
    },
    takePhoto() {
      uni.chooseImage({
        count: 1,
        sourceType: ["camera"],
        success: (res: any) => {
          this.uploadAvatar(res.tempFilePaths[0]);
        },
      });
    },
    async uploadAvatar(filePath: string) {
      uni.showLoading({ title: "上传中..." });

      try {
        const uploadRes: any = await uploadImage(filePath, {
          uploadDomain: UPLOAD_DOMAINS.PROFILE_IMAGE,
        });
        const imageUrl = String(uploadRes?.url || "").trim();
        if (!imageUrl) {
          throw new Error("上传返回地址为空");
        }

        // 更新头像URL到数据库
        await updateAvatar(imageUrl);

        this.avatarUrl = imageUrl;

        const riderSession = readRiderAuthSession({ uniApp: uni });
        if (riderSession.token) {
          persistRiderAuthSession({
            uniApp: uni,
            token: riderSession.token,
            refreshToken: riderSession.refreshToken || null,
            tokenExpiresAt: riderSession.tokenExpiresAt || null,
            profile: {
              ...(riderSession.profile || {}),
              avatar: imageUrl,
            },
            extraStorageValues: {
              riderId: riderSession.accountId || null,
              riderName:
                riderSession.profile?.name
                || riderSession.profile?.nickname
                || uni.getStorageSync("riderName")
                || "骑手",
            },
          });
        }

        uni.hideLoading();
        uni.showToast({ title: "头像更新成功", icon: "success" });

        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (err: any) {
        uni.hideLoading();
        uni.showToast({ title: err.message || "上传失败", icon: "none" });
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 80rpx 32rpx 48rpx;
}

.avatar-preview {
  width: 280rpx;
  height: 280rpx;
  margin: 0 auto 64rpx;
  border-radius: 50%;
  overflow: hidden;
  background: #e5e7eb;
  box-shadow: 0 8rpx 32rpx rgba(0, 155, 245, 0.15);
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
  color: white;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
}
</style>
