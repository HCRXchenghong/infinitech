<template>
  <view class="page">
    <view class="tabs">
      <text class="tab-item" :class="{ active: verifyType === 'password' }" @tap="switchVerifyType('password')">
        原密码验证
      </text>
      <text class="tab-item" :class="{ active: verifyType === 'code' }" @tap="switchVerifyType('code')">
        验证码验证
      </text>
    </view>

    <view class="form">
      <view v-if="verifyType === 'password'">
        <input v-model="oldPassword" class="input" placeholder="原密码" password maxlength="20" />
      </view>

      <view v-if="verifyType === 'code'">
        <input v-model="phone" class="input" placeholder="手机号" type="number" maxlength="11" />
        <view class="code-row">
          <input v-model="code" class="input" placeholder="验证码" type="number" maxlength="6" />
          <text class="code-btn" :class="{ off: codeCooldown > 0 || sendingCode }" @tap="sendCode">
            {{ sendingCode ? '发送中...' : codeCooldown > 0 ? codeCooldown + 's' : '获取验证码' }}
          </text>
        </view>
      </view>

      <input v-model="nextPassword" class="input" placeholder="新密码（6-20位）" password maxlength="20" />
      <input v-model="confirmPassword" class="input" placeholder="确认新密码" password maxlength="20" />

      <button class="btn" :disabled="submitting" @tap="submitChangePassword">
        {{ submitting ? '提交中...' : '确认修改' }}
      </button>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { requestSMSCode, changePassword } from '../../shared-ui/api'
import { readRiderAuthIdentity } from '../../shared-ui/auth-session.js'
import {
  createRolePasswordChangeCountdownController,
  normalizeRolePasswordChangeVerifyType,
  requestRolePasswordChangeCode,
  submitRolePasswordChange,
} from '../../../packages/mobile-core/src/role-password-change-portal.js'

export default Vue.extend({
  data() {
    return {
      verifyType: 'password',
      oldPassword: '',
      phone: '',
      code: '',
      nextPassword: '',
      confirmPassword: '',
      codeCooldown: 0,
      codeCooldownController: null as any,
      sendingCode: false,
      submitting: false,
    }
  },
  onLoad() {
    const riderAuth = readRiderAuthIdentity({ uniApp: uni })
    if (riderAuth.riderPhone) {
      this.phone = String(riderAuth.riderPhone).trim()
    }
    this.codeCooldownController = this.createCountdownController()
  },
  onUnload() {
    this.clearCooldownController()
  },
  methods: {
    switchVerifyType(type: string) {
      this.verifyType = normalizeRolePasswordChangeVerifyType(type)
      if (this.verifyType === 'password') {
        this.code = ''
        return
      }
      this.oldPassword = ''
    },
    createCountdownController() {
      return createRolePasswordChangeCountdownController({
        setValue: (value: number) => {
          this.codeCooldown = value
        },
      })
    },
    clearCooldownController() {
      if (this.codeCooldownController?.clear) {
        this.codeCooldownController.clear()
        this.codeCooldownController = null
      }
    },
    async sendCode() {
      if (this.codeCooldown > 0 || this.sendingCode) return

      this.sendingCode = true
      try {
        const cooldownController =
          this.codeCooldownController || this.createCountdownController()
        this.codeCooldownController = cooldownController

        const result = await requestRolePasswordChangeCode({
          phoneValue: this.phone,
          scene: 'rider_change_password',
          requestSMSCode,
          cooldownController,
          extra: { targetType: 'rider' },
          invalidPhoneMessage: '请输入正确手机号',
          failureMessage: '发送失败',
        })
        if (!result.ok) {
          uni.showToast({ title: result.message, icon: 'none' })
          return
        }

        this.phone = result.phone
        uni.showToast({ title: result.message, icon: 'success' })
      } finally {
        this.sendingCode = false
      }
    },
    async submitChangePassword() {
      if (this.submitting) return

      this.submitting = true
      try {
        const result = await submitRolePasswordChange({
          verifyTypeValue: this.verifyType,
          oldPasswordValue: this.oldPassword,
          phoneValue: this.phone,
          codeValue: this.code,
          nextPasswordValue: this.nextPassword,
          confirmPasswordValue: this.confirmPassword,
          changePassword,
          emptyCurrentPasswordMessage: '请输入原密码',
          invalidPhoneMessage: '请输入正确手机号',
          invalidCodeMessage: '请输入6位验证码',
          shortPasswordMessage: '密码至少6位',
          mismatchPasswordMessage: '两次密码不一致',
          failureMessage: '修改失败',
          successMessage: '密码修改成功',
        })
        if (!result.ok) {
          uni.showToast({ title: result.message, icon: 'none' })
          return
        }

        if (result.payload?.phone) {
          this.phone = result.payload.phone
        }
        uni.showToast({ title: result.message, icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1500)
      } finally {
        this.submitting = false
      }
    }
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f3f4f6;
}

.tabs {
  display: flex;
  background: white;
  padding: 32rpx;
  gap: 32rpx;
}

.tab-item {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  font-size: 30rpx;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 16rpx;

  &.active {
    background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
    color: white;
    font-weight: 600;
  }
}

.form {
  padding: 32rpx;
}

.input {
  width: 100%;
  height: 96rpx;
  background: white;
  border-radius: 16rpx;
  padding: 0 32rpx;
  font-size: 32rpx;
  margin-bottom: 32rpx;
  box-sizing: border-box;
}

.code-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.code-row .input {
  flex: 1;
  margin-bottom: 0;
}

.code-btn {
  width: 200rpx;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
  color: white;
  font-size: 28rpx;
  border-radius: 16rpx;
  font-weight: 600;

  &.off {
    background: #d1d5db;
  }
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
  margin-top: 32rpx;
}
</style>
