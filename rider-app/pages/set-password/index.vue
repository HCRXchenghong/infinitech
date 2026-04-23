<template>
  <view class="page auth">
    <view class="header">
      <text class="title">设置新密码</text>
      <text class="subtitle">{{ portalRuntime.subtitle }}</text>
    </view>

    <view class="form">
      <input
        v-model="password"
        class="input"
        placeholder="新密码（至少 6 位）"
        :password="true"
        maxlength="20"
      />
      <input
        v-model="confirmPassword"
        class="input"
        placeholder="确认密码"
        :password="true"
        maxlength="20"
      />
      <button class="btn" @tap="submit" :disabled="submitting">
        {{ submitting ? '设置中...' : '完成' }}
      </button>
    </view>

    <view class="footer">
      <text class="txt">想起密码了？</text>
      <text class="link" @tap="goLogin">返回登录</text>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { request } from '../../shared-ui/api'
import {
  getCachedRiderPortalRuntimeSettings,
  loadRiderPortalRuntimeSettings,
} from '../../shared-ui/portal-runtime'
import {
  resolveRolePasswordResetTicket,
  submitRolePasswordResetNextPassword,
} from '../../../packages/mobile-core/src/role-password-reset-portal.js'

export default Vue.extend({
  data() {
    return {
      phone: '',
      code: '',
      password: '',
      confirmPassword: '',
      submitting: false,
      portalRuntime: getCachedRiderPortalRuntimeSettings(),
    }
  },
  onLoad(options: any) {
    void this.loadPortalRuntime()

    const resetTicket = resolveRolePasswordResetTicket(
      options,
      uni.getStorageSync('reset_password_data'),
    )
    this.phone = resetTicket.phone
    this.code = resetTicket.code

    if (!this.phone || !this.code) {
      uni.showToast({ title: '请先完成验证码校验', icon: 'none' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  },
  methods: {
    async loadPortalRuntime() {
      this.portalRuntime = await loadRiderPortalRuntimeSettings()
    },

    goLogin() {
      uni.redirectTo({ url: '/pages/login/index' })
    },

    async submit() {
      if (this.submitting) return

      this.submitting = true
      try {
        const result = await submitRolePasswordResetNextPassword({
          phoneValue: this.phone,
          codeValue: this.code,
          passwordValue: this.password,
          confirmPasswordValue: this.confirmPassword,
          storage: uni,
          loginUrl: '/pages/login/index',
          resetPasswordUrl: '/pages/reset-password/index',
          submitSetNewPassword: (payload) =>
            request({
              url: '/api/auth/rider/set-new-password',
              method: 'POST',
              data: payload,
            }),
        })
        if (!result.ok) {
          uni.showToast({ title: result.message, icon: 'none' })
          if (result.reason === 'missing_ticket' && result.redirectUrl) {
            setTimeout(() => {
              uni.redirectTo({ url: result.redirectUrl })
            }, 1500)
          }
          return
        }

        uni.showToast({ title: result.message, icon: 'success' })
        setTimeout(() => {
          uni.redirectTo({ url: result.redirectUrl || '/pages/login/index' })
        }, 1500)
      } finally {
        this.submitting = false
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.page.auth {
  min-height: 100vh;
  background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
  padding: 0 64rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.header {
  text-align: center;
  margin-bottom: 96rpx;
}

.title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 64rpx;
  font-weight: bold;
  color: #ffffff;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.form {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 64rpx 48rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
}

.input {
  width: 100%;
  height: 96rpx;
  margin-bottom: 32rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
  background: #f3f4f6;
  border-radius: 16rpx;
  font-size: 32rpx;
}

.btn {
  width: 100%;
  height: 96rpx;
  border: none;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
  color: #ffffff;
  font-size: 36rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 24rpx rgba(0, 155, 245, 0.3);
}

.footer {
  margin-top: 64rpx;
  text-align: center;
}

.txt {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.link {
  margin-left: 8rpx;
  font-size: 24rpx;
  color: #ffffff;
  font-weight: bold;
}
</style>
