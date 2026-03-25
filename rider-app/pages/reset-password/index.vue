<template>
  <view class="page auth">
    <view class="header">
      <text class="title">忘记密码</text>
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
        {{ loading ? '验证中...' : '下一步' }}
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
import { requestSMSCode, verifySMSCodeCheck } from '../../shared-ui/api'
import {
  getCachedRiderPortalRuntimeSettings,
  loadRiderPortalRuntimeSettings,
} from '../../shared-ui/portal-runtime'

export default Vue.extend({
  data() {
    return {
      phone: '',
      code: '',
      codeCooldown: 0,
      loading: false,
      timer: null as any,
      portalRuntime: getCachedRiderPortalRuntimeSettings(),
    }
  },
  onLoad() {
    void this.loadPortalRuntime()
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },
  methods: {
    async loadPortalRuntime() {
      this.portalRuntime = await loadRiderPortalRuntimeSettings()
    },

    goLogin() {
      uni.redirectTo({ url: '/pages/login/index' })
    },

    validatePhone() {
      const phone = String(this.phone || '').trim()
      if (!/^1\d{10}$/.test(phone)) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' })
        return ''
      }
      return phone
    },

    async sendCode() {
      if (this.codeCooldown > 0 || this.loading) return
      const phone = this.validatePhone()
      if (!phone) return

      this.loading = true
      try {
        const res: any = await requestSMSCode(phone, 'rider_reset')
        if (res.success !== false) {
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
        } else {
          uni.showToast({ title: res.error || res.message || '发送验证码失败', icon: 'none' })
        }
      } catch (err: any) {
        uni.showToast({
          title: err.data?.error || err.error || err.message || '发送验证码失败',
          icon: 'none',
        })
      } finally {
        this.loading = false
      }
    },

    async submit() {
      const phone = this.validatePhone()
      const code = String(this.code || '').trim()

      if (!phone) return
      if (!code) {
        uni.showToast({ title: '请输入验证码', icon: 'none' })
        return
      }

      this.loading = true
      try {
        const verifyRes: any = await verifySMSCodeCheck(phone, 'rider_reset', code)
        if (!verifyRes.success) {
          throw new Error(verifyRes.error || '验证码错误')
        }

        uni.setStorageSync('reset_password_data', { phone, code })
        uni.redirectTo({
          url: `/pages/set-password/index?phone=${encodeURIComponent(phone)}&code=${encodeURIComponent(code)}`,
        })
      } catch (err: any) {
        uni.showToast({ title: err.error || err.message || '验证失败', icon: 'none' })
      } finally {
        this.loading = false
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
