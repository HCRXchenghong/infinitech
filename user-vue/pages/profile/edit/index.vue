<template>
  <view class="page profile-edit">
    <view class="card">
      <view class="row between" @tap="openBgPicker">
        <text class="label">背景</text>
        <view class="row">
          <text class="bg-tip">{{ headerBg ? '已设置' : '默认蓝色' }}</text>
          <text class="arrow">></text>
        </view>
      </view>

      <view class="row between" @tap="chooseAvatar">
        <text class="label">头像</text>
        <view class="row">
          <image
            v-if="avatarUrl"
            :src="avatarUrl"
            mode="aspectFill"
            class="avatar-image"
          />
          <view v-else class="avatar-text">{{ avatarText }}</view>
          <text class="arrow">></text>
        </view>
      </view>

      <view class="row between">
        <text class="label">昵称</text>
        <input v-model.trim="nickname" class="input" placeholder="请输入昵称" maxlength="20" />
      </view>
    </view>

    <button class="save-btn" :loading="saving" @tap="save">保存</button>

    <view v-if="showBgPicker" class="mask" @tap="closeBgPicker">
      <view class="modal" @tap.stop>
        <view class="modal-title">选择背景</view>
        <view class="preset-grid">
          <view
            v-for="item in presetBg"
            :key="item.label"
            class="preset-item"
            @tap="choosePreset(item.value)"
          >
            <view
              v-if="item.value.startsWith('linear-gradient')"
              class="preset-gradient"
              :style="{ background: item.value }"
            />
            <image
              v-else
              class="preset-img"
              :src="item.value"
              mode="aspectFill"
            />
            <text class="preset-label">{{ item.label }}</text>
          </view>
        </view>
        <view class="modal-actions">
          <view class="btn btn-secondary" @tap="chooseHeaderBgFromAlbum">相册选择</view>
          <view class="btn btn-primary" @tap="closeBgPicker">取消</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchUser, updateUserProfile, uploadCommonImage } from '@/shared-ui/api.js'

export default {
  data() {
    return {
      profileId: '',
      nickname: '',
      avatarUrl: '',
      headerBg: '',
      showBgPicker: false,
      saving: false,
      presetBg: [
        { label: '渐变蓝', value: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' },
        { label: '暖橙', value: 'linear-gradient(135deg,#f97316,#fb923c)' },
        { label: '夜景', value: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800' },
        { label: '城市', value: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800' }
      ]
    }
  },
  computed: {
    avatarText() {
      const value = String(this.nickname || '').trim()
      return value ? value.charAt(0).toUpperCase() : 'U'
    }
  },
  onLoad() {
    this.loadProfile()
  },
  methods: {
    resolveUserId() {
      const profile = uni.getStorageSync('userProfile') || {}
      return String(profile.id || profile.userId || '').trim()
    },
    normalizeUserPayload(payload) {
      if (payload && payload.user && typeof payload.user === 'object') {
        return payload.user
      }
      return payload && typeof payload === 'object' ? payload : {}
    },
    syncLocalProfile(nextProfile = {}) {
      const current = uni.getStorageSync('userProfile') || {}
      uni.setStorageSync('userProfile', {
        ...current,
        ...nextProfile
      })
    },
    async loadProfile() {
      const userId = this.resolveUserId()
      this.profileId = userId
      const localProfile = uni.getStorageSync('userProfile') || {}

      this.nickname = localProfile.nickname || localProfile.name || '悦享e食用户'
      this.avatarUrl = localProfile.avatarUrl || ''
      this.headerBg = localProfile.headerBg || ''

      if (!userId) {
        return
      }

      try {
        const remote = this.normalizeUserPayload(await fetchUser(userId))
        this.syncLocalProfile(remote)
        this.nickname = remote.nickname || remote.name || this.nickname
        this.avatarUrl = remote.avatarUrl || ''
        this.headerBg = remote.headerBg || ''
      } catch (error) {
        console.error('加载用户资料失败:', error)
      }
    },
    openBgPicker() {
      this.showBgPicker = true
    },
    closeBgPicker() {
      this.showBgPicker = false
    },
    choosePreset(bg) {
      this.headerBg = bg
      this.closeBgPicker()
    },
    async uploadImage(filePath, loadingText) {
      uni.showLoading({ title: loadingText, mask: true })
      try {
        const res = await uploadCommonImage(filePath)
        return String((res && res.url) || '')
      } finally {
        uni.hideLoading()
      }
    },
    chooseHeaderBgFromAlbum() {
      uni.chooseImage({
        count: 1,
        success: async (res) => {
          const path = (res.tempFilePaths && res.tempFilePaths[0]) || ''
          if (!path) return
          try {
            const uploadedUrl = await this.uploadImage(path, '上传背景中')
            if (!uploadedUrl) {
              throw new Error('empty upload url')
            }
            this.headerBg = uploadedUrl
            this.closeBgPicker()
          } catch (error) {
            uni.showToast({ title: '背景上传失败', icon: 'none' })
          }
        }
      })
    },
    chooseAvatar() {
      uni.chooseImage({
        count: 1,
        success: async (res) => {
          const path = (res.tempFilePaths && res.tempFilePaths[0]) || ''
          if (!path) return
          try {
            const uploadedUrl = await this.uploadImage(path, '上传头像中')
            if (!uploadedUrl) {
              throw new Error('empty upload url')
            }
            this.avatarUrl = uploadedUrl
          } catch (error) {
            uni.showToast({ title: '头像上传失败', icon: 'none' })
          }
        }
      })
    },
    async save() {
      if (this.saving) return
      if (!this.profileId) {
        uni.showToast({ title: '缺少用户身份', icon: 'none' })
        return
      }
      if (!this.nickname) {
        uni.showToast({ title: '请输入昵称', icon: 'none' })
        return
      }

      this.saving = true
      try {
        const res = await updateUserProfile(this.profileId, {
          nickname: this.nickname,
          avatarUrl: this.avatarUrl,
          headerBg: this.headerBg
        })
        const nextProfile = this.normalizeUserPayload(res)
        this.syncLocalProfile(nextProfile)
        uni.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 500)
      } catch (error) {
        uni.showToast({ title: error.error || '保存失败', icon: 'none' })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped lang="scss">
.profile-edit {
  min-height: 100vh;
  background: #f4f4f4;
  padding: 12px;
  position: relative;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 8px 12px;
}

.row {
  display: flex;
  align-items: center;
}

.between {
  justify-content: space-between;
  padding: 12px 0;
}

.label {
  font-size: 14px;
  color: #111827;
  font-weight: 600;
}

.avatar-image,
.avatar-text {
  width: 36px;
  height: 36px;
  border-radius: 999px;
}

.avatar-image {
  display: block;
}

.avatar-text {
  background: #fff;
  color: #009bf5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  border: 1px solid #e5e7eb;
}

.arrow {
  margin-left: 8px;
  color: #9ca3af;
}

.bg-tip {
  font-size: 13px;
  color: #6b7280;
}

.input {
  width: 60%;
  text-align: right;
  font-size: 14px;
  color: #374151;
}

.save-btn {
  margin-top: 14px;
  width: 100%;
  padding: 10px 0;
  border-radius: 999px;
  background: #009bf5;
  color: #fff;
  font-size: 15px;
}

.mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
}

.modal {
  width: 86%;
  background: #fff;
  border-radius: 14px;
  padding: 14px;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 12px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.preset-item {
  height: 72px;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.preset-gradient,
.preset-img {
  width: 100%;
  height: 100%;
}

.preset-label {
  position: absolute;
  left: 8px;
  bottom: 8px;
  font-size: 12px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.modal-actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 10px;
  font-size: 14px;
}

.btn-secondary {
  background: #f3f4f6;
  color: #111827;
}

.btn-primary {
  background: #009bf5;
  color: #fff;
}
</style>
