<template>
  <view class="page auth">
    <view class="header">
      <text class="title">{{ portalRuntime.title }}</text>
      <text class="subtitle">{{ portalRuntime.subtitle }}</text>
    </view>

    <view class="login-tabs">
      <text class="tab-item" :class="{ active: loginType === 'code' }" @tap="switchLoginType('code')">
        验证码登录
      </text>
      <text class="tab-item" :class="{ active: loginType === 'password' }" @tap="switchLoginType('password')">
        密码登录
      </text>
    </view>

    <view class="form">
      <input v-model="phone" class="input" placeholder="手机号" type="number" maxlength="11" />

      <view v-if="loginType === 'code'" class="code-row">
        <input v-model="code" class="input" placeholder="验证码" type="number" maxlength="6" />
        <text class="code-btn" :class="{ off: codeCooldown > 0 || sendingCode }" @tap="sendCode">
          {{ sendingCode ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
        </text>
      </view>

      <view v-else>
        <input v-model="password" class="input" placeholder="密码" :password="true" maxlength="20" />
        <view class="password-actions">
          <text class="forgot-password" @tap="goResetPassword">忘记密码？</text>
        </view>
      </view>

      <button class="btn" @tap="submit" :disabled="submitting">
        {{ submitting ? '登录中...' : '登录' }}
      </button>
    </view>

    <view class="footer">
      <text class="txt">{{ portalRuntime.loginFooter }}</text>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { requestSMSCode, riderLogin } from '../../shared-ui/api'
import { persistRiderAuthSession } from '../../shared-ui/auth-session.js'
import { persistRoleAuthSessionFromAuthResult } from '../../../packages/client-sdk/src/role-auth-response.js'
import {
  createRoleLoginCodeCooldownController,
  pickRoleLoginErrorMessage,
  requestRoleLoginCode,
  validateRoleLoginPhoneInput,
} from '../../../packages/mobile-core/src/role-login-portal.js'
import {
  getCachedRiderPortalRuntimeSettings,
  loadRiderPortalRuntimeSettings,
} from '../../shared-ui/portal-runtime'

export default Vue.extend({
  data() {
    return {
      loginType: 'code',
      phone: '',
      code: '',
      password: '',
      codeCooldown: 0,
      sendingCode: false,
      submitting: false,
      cooldownController: null as any,
      portalRuntime: getCachedRiderPortalRuntimeSettings(),
    }
  },
  onLoad() {
    this.cooldownController = this.createCooldownController()
    void this.loadPortalRuntime()
  },
  onUnload() {
    if (this.cooldownController) this.cooldownController.clear()
  },
  methods: {
    createCooldownController() {
      return createRoleLoginCodeCooldownController({
        setValue: (nextValue: number) => {
          this.codeCooldown = nextValue
        },
      })
    },

    async loadPortalRuntime() {
      this.portalRuntime = await loadRiderPortalRuntimeSettings()
    },

    saveRiderSession(payload: any, phone: string) {
      persistRoleAuthSessionFromAuthResult({
        uniApp: uni,
        persistRoleAuthSession: persistRiderAuthSession,
        response: payload,
        profileFallback: { phone, nickname: '骑手' },
        extraStorageValues({ responseUser, profile }) {
          return {
            riderId: responseUser.id != null ? String(responseUser.id) : null,
            riderName: responseUser.name || responseUser.nickname || profile.nickname || '骑手',
          }
        },
      })
    },

    connectSocketAfterLogin() {
      try {
        const app: any = getApp()
        const vm = app && app.$vm
        if (vm && typeof vm.tryConnectSocket === 'function') {
          vm.tryConnectSocket()
        }
      } catch (err) {
        console.error('[RiderLogin] 触发 Socket 连接失败:', err)
      }
    },

    switchLoginType(type: string) {
      this.loginType = type
      this.code = ''
      this.password = ''
    },

    goResetPassword() {
      uni.navigateTo({ url: '/pages/reset-password/index' })
    },

    validatePhone() {
      const result = validateRoleLoginPhoneInput(this.phone)
      if (!result.phone) {
        uni.showToast({ title: result.error, icon: 'none' })
        return ''
      }
      return result.phone
    },

    formatLoginError(error: any) {
      return pickRoleLoginErrorMessage(error, '登录失败', (rawError: any, fallback: string) => {
        const raw = String(
          rawError?.error || rawError?.message || rawError?.data?.error || rawError?.data?.message || '',
        ).toLowerCase()
        if (!raw) return ''
        if (raw.includes('rider not found') || raw.includes('骑手不存在')) {
          return '该手机号不是骑手账号，请使用骑手账号登录'
        }
        if (raw.includes('invalid password') || raw.includes('密码错误')) {
          return '登录密码错误，请重试'
        }
        if (raw.includes('invalid code') || raw.includes('验证码')) {
          return '验证码错误或已过期'
        }
        if (raw.includes('unauthorized') || raw.includes('401')) {
          return '账号或密码错误'
        }
        return ''
      })
    },

    async sendCode() {
      if (this.codeCooldown > 0 || this.sendingCode) return

      const cooldownController = this.cooldownController || this.createCooldownController()
      this.cooldownController = cooldownController
      this.sendingCode = true
      try {
        const result = await requestRoleLoginCode({
          phoneValue: this.phone,
          scene: 'rider_login',
          requestSMSCode,
          cooldownController,
          failureMessage: '发送验证码失败',
        })
        if (!result.ok) {
          uni.showToast({ title: result.message, icon: 'none' })
          return
        }

        uni.showToast({ title: result.message, icon: 'success' })
      } finally {
        this.sendingCode = false
      }
    },

    async submit() {
      if (this.submitting) return
      const phone = this.validatePhone()
      if (!phone) return

      const payload: { phone: string; code?: string; password?: string } = { phone }
      if (this.loginType === 'code') {
        const code = String(this.code || '').trim()
        if (!code) {
          uni.showToast({ title: '请输入验证码', icon: 'none' })
          return
        }
        payload.code = code
      } else {
        const password = String(this.password || '').trim()
        if (!password) {
          uni.showToast({ title: '请输入密码', icon: 'none' })
          return
        }
        payload.password = password
      }

      this.submitting = true
      try {
        const res: any = await riderLogin(payload)
        if (res.success) {
          this.saveRiderSession(res, phone)
          this.connectSocketAfterLogin()
          uni.showToast({ title: '登录成功', icon: 'success' })
          setTimeout(() => uni.switchTab({ url: '/pages/hall/index' }), 500)
        } else {
          uni.showToast({ title: this.formatLoginError(res), icon: 'none' })
        }
      } catch (err: any) {
        uni.showToast({ title: this.formatLoginError(err), icon: 'none' })
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
  margin-bottom: 64rpx;
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

.login-tabs {
  display: flex;
  justify-content: center;
  gap: 48rpx;
  margin-bottom: 48rpx;
}

.tab-item {
  position: relative;
  padding-bottom: 8rpx;
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.6);

  &.active {
    color: #ffffff;
    font-weight: bold;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 4rpx;
      border-radius: 999rpx;
      background: #ffffff;
    }
  }
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

.code-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;

  .input {
    flex: 1;
    margin-bottom: 0;
  }
}

.code-btn {
  width: 200rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #009bf5;
  color: #ffffff;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: bold;

  &.off {
    background: #d1d5db;
    color: #9ca3af;
  }
}

.password-actions {
  display: flex;
  justify-content: flex-end;
  margin: -16rpx 0 32rpx;
}

.forgot-password {
  font-size: 26rpx;
  color: #0284c7;
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
  color: rgba(255, 255, 255, 0.8);
}
</style>
