<template>
  <view class="container">
    <view class="avatar-preview">
      <image :src="avatarUrl || '/static/images/logo.png'" mode="aspectFill" class="avatar-img" />
    </view>
    <view class="actions">
      <button class="btn" @click="chooseFromAlbum">从相册选择</button>
      <button class="btn" @click="takePhoto">拍照</button>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { updateAvatar } from '../../shared-ui/api'
import config from '../../shared-ui/config'

export default Vue.extend({
  data() {
    return {
      avatarUrl: ''
    }
  },
  onLoad() {
    const profile = uni.getStorageSync('riderProfile')
    if (profile && profile.avatar) {
      this.avatarUrl = profile.avatar
    }
  },
  methods: {
    chooseFromAlbum() {
      uni.chooseImage({
        count: 1,
        sourceType: ['album'],
        success: (res: any) => {
          this.uploadAvatar(res.tempFilePaths[0])
        }
      })
    },
    takePhoto() {
      uni.chooseImage({
        count: 1,
        sourceType: ['camera'],
        success: (res: any) => {
          this.uploadAvatar(res.tempFilePaths[0])
        }
      })
    },
    async uploadAvatar(filePath: string) {
      uni.showLoading({ title: '上传中...' })

      try {
        const riderId = uni.getStorageSync('riderId')

        // 先上传图片到服务器
        const uploadRes: any = await new Promise((resolve, reject) => {
          uni.uploadFile({
            url: `${config.API_BASE_URL}/api/upload-image`,
            filePath,
            name: 'image',
            success: (res: any) => {
              const data = JSON.parse(res.data)
              if (data.imageUrl) {
                resolve(data)
              } else {
                reject(new Error(data.error || '上传失败'))
              }
            },
            fail: reject
          })
        })

        const imageUrl = uploadRes.imageUrl.startsWith('http') ? uploadRes.imageUrl : config.API_BASE_URL + uploadRes.imageUrl

        // 更新头像URL到数据库
        await updateAvatar(imageUrl)

        this.avatarUrl = imageUrl

        // 更新本地存储
        const profile = uni.getStorageSync('riderProfile') || {}
        profile.avatar = imageUrl
        uni.setStorageSync('riderProfile', profile)

        uni.hideLoading()
        uni.showToast({ title: '头像更新成功', icon: 'success' })

        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      } catch (err: any) {
        uni.hideLoading()
        uni.showToast({ title: err.message || '上传失败', icon: 'none' })
      }
    }
  }
})
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
