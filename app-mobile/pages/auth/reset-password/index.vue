<template>
  <view class="page auth">
    <view class="header">
      <text class="title">找回密码</text>
      <text class="subtitle">{{ portalRuntime.subtitle }}</text>
    </view>

    <view class="form">
      <input v-model="phone" class="input" placeholder="手机号" type="number" maxlength="11" />
      <view class="code-row">
        <input v-model="code" class="input" placeholder="验证码" type="number" maxlength="6" />
        <text class="code-btn" :class="{ off: codeCooldown > 0 || loading }" @tap="sendCode">
          {{ loading ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
        </text>
      </view>
      <button class="btn" @tap="submit" :disabled="loading">
        {{ loading ? '校验中...' : '下一步' }}
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
import { requestSMSCode, verifySMSCodeCheck } from '@/shared-ui/api.js'
import {
  getCachedConsumerAuthRuntimeSettings,
  loadConsumerAuthRuntimeSettings
} from '@/shared-ui/auth-runtime.js'

export default {
  data() {
    return {
      phone: '',
      code: '',
      codeCooldown: 0,
      loading: false,
      timer: null,
      portalRuntime: getCachedConsumerAuthRuntimeSettings()
    }
  },
  onLoad() {
    void this.loadRuntimeSettings()
  },
  onUnload() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },
  methods: {
    async loadRuntimeSettings() {
      this.portalRuntime = await loadConsumerAuthRuntimeSettings()
    },
    goLogin() {
      uni.redirectTo({ url: '/pages/auth/login/index' })
    },
    validatePhone() {
      const phone = String(this.phone || '').trim()
      if (!/^1\d{10}$/.test(phone)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
        return ''
      }
      return phone
    },
    async sendCode() {
      if (this.codeCooldown > 0 || this.loading) {
        return
      }

      const phone = this.validatePhone()
      if (!phone) {
        return
      }

      this.loading = true
      try {
        const res = await requestSMSCode(phone, 'reset')
        if (res.success === false) {
          uni.showToast({ title: res.error || res.message || '发送验证码失败', icon: 'none', duration: 2000 })
          return
        }

        uni.showToast({ title: res.message || '验证码已发送', icon: 'success' })
        this.codeCooldown = 60
        if (this.timer) {
          clearInterval(this.timer)
          this.timer = null
        }
        this.timer = setInterval(() => {
          this.codeCooldown -= 1
          if (this.codeCooldown <= 0) {
            clearInterval(this.timer)
            this.timer = null
          }
        }, 1000)
      } catch (err) {
        const message = err.data?.error || err.error || err.message || '发送验证码失败'
        uni.showToast({ title: message, icon: 'none', duration: 2000 })
      } finally {
        this.loading = false
      }
    },
    async submit() {
      const phone = this.validatePhone()
      const code = String(this.code || '').trim()

      if (!phone) {
        return
      }
      if (!code) {
        uni.showToast({ title: '请输入验证码', icon: 'none' })
        return
      }

      this.loading = true
      try {
        const verifyRes = await verifySMSCodeCheck(phone, 'reset', code)
        if (!verifyRes.success) {
          throw new Error(verifyRes.error || '验证码错误')
        }

        uni.setStorageSync('reset_password_data', { phone, code })
        uni.redirectTo({
          url: `/pages/auth/set-password/index?phone=${encodeURIComponent(phone)}&code=${encodeURIComponent(code)}`
        })
      } catch (err) {
        uni.showToast({ title: err.error || err.message || '验证失败', icon: 'none' })
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

.code-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.code-row .input {
  flex: 1;
  margin-bottom: 0;
}

.code-btn {
  font-size: 13px;
  color: #009bf5;
  font-weight: 600;
  padding: 6px 12px;
  border: 1px solid #009bf5;
  border-radius: 6px;
  white-space: nowrap;
  transition: all 0.2s ease;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  margin-left: 12px;
}

.code-btn:active {
  opacity: 0.8;
}

.code-btn.off {
  color: #999;
  border-color: #ddd;
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
