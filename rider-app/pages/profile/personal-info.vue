<template>
  <view class="container">
    <view class="section">
      <view class="section-title">基本信息</view>
      <view class="info-card">
        <view class="info-item" @click="editNickname">
          <text class="label">昵称</text>
          <view class="value-row">
            <text class="value">{{ profile.nickname || '未设置' }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">实名认证</view>
      <view class="info-card">
        <view class="info-item" @click="editRealName">
          <text class="label">真实姓名</text>
          <view class="value-row">
            <text class="value">{{ profile.real_name || '未认证' }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
        <view class="divider"></view>
        <view class="info-item" @click="editIDCard">
          <text class="label">身份证号</text>
          <view class="value-row">
            <text class="value">{{ maskIDCard(profile.id_card_number) }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <button v-if="!profile.is_verified && canSubmit" class="btn-submit" @click="submitVerification">
      提交认证
    </button>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { getRiderProfile, updateRiderProfile } from '../../shared-ui/api'

export default Vue.extend({
  data() {
    return {
      profile: {} as any
    }
  },
  computed: {
    canSubmit(): boolean {
      return !!(this.profile.real_name && this.profile.id_card_number)
    }
  },
  onLoad() {
    this.loadProfile()
  },
  methods: {
    async loadProfile() {
      try {
        const res: any = await getRiderProfile()
        if (res && res.data) {
          this.profile = res.data
        }
      } catch (err) {
        console.error('加载资料失败:', err)
      }
    },
    editNickname() {
      uni.showModal({
        title: '修改昵称',
        editable: true,
        placeholderText: this.profile.nickname || '',
        success: async (res: any) => {
          if (res.confirm && res.content) {
            await this.updateProfile({ nickname: res.content })
          }
        }
      })
    },
    editRealName() {
      uni.showModal({
        title: '真实姓名',
        editable: true,
        placeholderText: this.profile.real_name || '',
        success: async (res: any) => {
          if (res.confirm && res.content) {
            await this.updateProfile({ real_name: res.content })
          }
        }
      })
    },
    editIDCard() {
      uni.showModal({
        title: '身份证号',
        editable: true,
        placeholderText: this.profile.id_card_number || '',
        success: async (res: any) => {
          if (res.confirm && res.content) {
            if (!/^\d{17}[\dXx]$/.test(res.content)) {
              uni.showToast({ title: '身份证号格式错误', icon: 'none' })
              return
            }
            await this.updateProfile({ id_card_number: res.content })
          }
        }
      })
    },
    async updateProfile(data: any) {
      try {
        await updateRiderProfile(data)
        uni.showToast({ title: '更新成功', icon: 'success' })
        this.loadProfile()
      } catch (err: any) {
        uni.showToast({ title: err.error || '更新失败', icon: 'none' })
      }
    },
    async submitVerification() {
      try {
        await updateRiderProfile({ is_verified: true })
        uni.showToast({ title: '提交成功', icon: 'success' })
        this.loadProfile()
      } catch (err: any) {
        uni.showToast({ title: err.error || '提交失败', icon: 'none' })
      }
    },
    maskIDCard(idCard: string) {
      if (!idCard) return '未认证'
      if (idCard.length < 14) return idCard
      return idCard.substring(0, 6) + '********' + idCard.substring(14)
    }
  }
})
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 32rpx;
}

.section {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 28rpx;
  color: #6b7280;
  padding: 0 8rpx 16rpx;
  font-weight: 500;
}

.info-card {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 36rpx 32rpx;
  min-height: 96rpx;
}

.label {
  font-size: 32rpx;
  color: #1f2937;
  font-weight: 500;
}

.value-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.value {
  font-size: 30rpx;
  color: #6b7280;
}

.arrow {
  font-size: 36rpx;
  color: #d1d5db;
  font-weight: 300;
}

.divider {
  height: 1rpx;
  background: #f3f4f6;
  margin: 0 32rpx;
}

.btn-submit {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
  color: white;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
  margin-top: 32rpx;
}
</style>
