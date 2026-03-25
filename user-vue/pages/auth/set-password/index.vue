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
      <button class="btn" @tap="submit" :disabled="loading">
        {{ loading ? '设置中...' : '完成' }}
      </button>
    </view>

    <view class="footer">
      <view class="footer-row">
        <text class="txt">想起密码了？</text>
        <text class="link" @tap="goLogin">返回登录</text>
      </view>
      <text class="portal-footer">{{ portalRuntime.loginFooter }}</text>
    </view>
  </view>
</template>

<script>
import { request } from '@/shared-ui/api.js'
import {
  getCachedConsumerAuthRuntimeSettings,
  loadConsumerAuthRuntimeSettings
} from '@/shared-ui/auth-runtime.js'

export default {
  data() {
    return {
      phone: '',
      code: '',
      password: '',
      confirmPassword: '',
      loading: false,
      portalRuntime: getCachedConsumerAuthRuntimeSettings()
    }
  },
  onLoad(options = {}) {
    void this.loadRuntimeSettings()

    if (options.phone) {
      this.phone = decodeURIComponent(options.phone)
    }
    if (options.code) {
      this.code = decodeURIComponent(options.code)
    }

    if (!this.phone || !this.code) {
      const resetData = uni.getStorageSync('reset_password_data')
      if (resetData) {
        this.phone = resetData.phone || ''
        this.code = resetData.code || ''
      }
    }

    if (!this.phone || !this.code) {
      uni.showToast({ title: '请先完成验证码校验', icon: 'none' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  },
  methods: {
    async loadRuntimeSettings() {
      this.portalRuntime = await loadConsumerAuthRuntimeSettings()
    },
    goLogin() {
      uni.redirectTo({ url: '/pages/auth/login/index' })
    },
    async submit() {
      const password = String(this.password || '').trim()
      const confirmPassword = String(this.confirmPassword || '').trim()

      if (!password) {
        uni.showToast({ title: '请输入新密码', icon: 'none' })
        return
      }
      if (password.length < 6) {
        uni.showToast({ title: '密码至少 6 位', icon: 'none' })
        return
      }
      if (password !== confirmPassword) {
        uni.showToast({ title: '两次密码不一致', icon: 'none' })
        return
      }

      if (!this.phone || !this.code) {
        uni.showToast({ title: '校验信息已失效，请重新验证', icon: 'none' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/auth/reset-password/index' })
        }, 1500)
        return
      }

      this.loading = true
      try {
        const res = await request({
          url: '/api/set-new-password',
          method: 'POST',
          data: {
            phone: this.phone,
            code: this.code,
            password
          }
        })

        if (res.success) {
          uni.removeStorageSync('reset_password_data')
          uni.showToast({ title: '密码设置成功', icon: 'success' })
          setTimeout(() => {
            uni.redirectTo({ url: '/pages/auth/login/index' })
          }, 1500)
        }
      } catch (err) {
        uni.showToast({ title: err.error || err.message || '设置失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped lang="scss">
.page.auth {
  min-height: 100vh;
  background: #fff;
  padding: 0 24px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 140px);
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header {
  margin-bottom: 40px;
  animation: slideDown 0.4s ease-out;
}

.subtitle {
  display: block;
  margin-top: 8px;
  font-size: 13px;
  color: #6b7280;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #111;
}

.form {
  margin-bottom: 24px;
}

.input {
  width: 100%;
  height: 48px;
  border-bottom: 1px solid #eee;
  font-size: 16px;
  color: #111;
  margin-bottom: 16px;
  box-sizing: border-box;
  transition: border-color 0.3s ease;
  position: relative;
}

.input:focus {
  border-bottom-color: #009bf5;
}

.btn {
  width: 100%;
  height: 48px;
  background: #009bf5;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-top: 32px;
  border: none;
  transition: all 0.2s ease;

  &::after {
    border: none;
  }
}

.btn:active {
  opacity: 0.9;
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.6;
}

.footer {
  text-align: center;
}

.footer-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.txt {
  font-size: 14px;
  color: #999;
}

.link {
  font-size: 14px;
  color: #009bf5;
  font-weight: 600;
}

.portal-footer {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.5;
  color: #9ca3af;
}
</style>
