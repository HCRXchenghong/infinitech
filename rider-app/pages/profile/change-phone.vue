<template>
  <view class="page">
    <view v-if="step === 1" class="step-content">
      <view class="step-header">
        <text class="step-title">验证原手机号</text>
        <text class="step-desc">请输入当前绑定手机号并完成验证码校验</text>
      </view>
      <view class="form">
        <input v-model="oldPhone" class="input" placeholder="原手机号" type="number" maxlength="11" />
        <view class="code-row">
          <input v-model="oldCode" class="input" placeholder="验证码" type="number" maxlength="6" />
          <text class="code-btn" :class="{ off: oldCodeCooldown > 0 || loading }" @tap="sendOldCode">
            {{ oldCodeCooldown > 0 ? oldCodeCooldown + 's' : '获取验证码' }}
          </text>
        </view>
        <button class="btn" :disabled="loading" @tap="verifyOldPhone">下一步</button>
      </view>
    </view>

    <view v-if="step === 2" class="step-content">
      <view class="step-header">
        <text class="step-title">绑定新手机号</text>
        <text class="step-desc">请输入新手机号并完成验证码校验</text>
      </view>
      <view class="form">
        <input v-model="newPhone" class="input" placeholder="新手机号" type="number" maxlength="11" />
        <view class="code-row">
          <input v-model="newCode" class="input" placeholder="验证码" type="number" maxlength="6" />
          <text class="code-btn" :class="{ off: newCodeCooldown > 0 || loading }" @tap="sendNewCode">
            {{ newCodeCooldown > 0 ? newCodeCooldown + 's' : '获取验证码' }}
          </text>
        </view>
        <button class="btn" :disabled="loading" @tap="submitChangePhone">确认换绑</button>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { changePhone, requestSMSCode, verifySMSCodeCheck } from '../../shared-ui/api'
import {
  clearRiderAuthSession,
  persistRiderAuthSession,
  readRiderAuthSession,
} from '../../shared-ui/auth-session.js'

const OLD_SCENE = 'change_phone_verify'
const NEW_SCENE = 'change_phone_new'

export default Vue.extend({
  data() {
    return {
      step: 1,
      oldPhone: '',
      oldCode: '',
      newPhone: '',
      newCode: '',
      oldCodeCooldown: 0,
      newCodeCooldown: 0,
      oldTimer: null as ReturnType<typeof setInterval> | null,
      newTimer: null as ReturnType<typeof setInterval> | null,
      loading: false
    }
  },
  onLoad() {
    const riderAuth = readRiderAuthIdentity({ uniApp: uni })
    if (riderAuth.riderPhone) {
      this.oldPhone = String(riderAuth.riderPhone).trim()
    }
  },
  onUnload() {
    this.clearTimer('old')
    this.clearTimer('new')
  },
  methods: {
    clearTimer(which: 'old' | 'new') {
      if (which === 'old' && this.oldTimer) {
        clearInterval(this.oldTimer)
        this.oldTimer = null
      }
      if (which === 'new' && this.newTimer) {
        clearInterval(this.newTimer)
        this.newTimer = null
      }
    },
    startCountdown(which: 'old' | 'new') {
      if (which === 'old') {
        this.oldCodeCooldown = 60
        this.clearTimer('old')
        this.oldTimer = setInterval(() => {
          if (this.oldCodeCooldown <= 1) {
            this.oldCodeCooldown = 0
            this.clearTimer('old')
            return
          }
          this.oldCodeCooldown -= 1
        }, 1000)
        return
      }

      this.newCodeCooldown = 60
      this.clearTimer('new')
      this.newTimer = setInterval(() => {
        if (this.newCodeCooldown <= 1) {
          this.newCodeCooldown = 0
          this.clearTimer('new')
          return
        }
        this.newCodeCooldown -= 1
      }, 1000)
    },
    resolveErrorMessage(err: any, fallback = '操作失败，请稍后重试') {
      return err?.data?.error || err?.data?.message || err?.error || err?.message || fallback
    },
    async sendOldCode() {
      if (this.oldCodeCooldown > 0 || this.loading) return
      if (!/^1\d{10}$/.test(String(this.oldPhone || '').trim())) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' })
        return
      }

      this.loading = true
      try {
        const res: any = await requestSMSCode(String(this.oldPhone || '').trim(), OLD_SCENE, { targetType: 'rider' })
        uni.showToast({ title: res.message || '验证码已发送', icon: 'success' })
        this.startCountdown('old')
      } catch (err: any) {
        uni.showToast({ title: this.resolveErrorMessage(err, '发送失败'), icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async verifyOldPhone() {
      const code = String(this.oldCode || '').trim()
      if (code.length !== 6) {
        uni.showToast({ title: '请输入6位验证码', icon: 'none' })
        return
      }

      this.loading = true
      try {
        const res: any = await verifySMSCodeCheck(String(this.oldPhone || '').trim(), OLD_SCENE, code)
        if (res.success === false) {
          throw res
        }
        this.step = 2
        uni.showToast({ title: res.message || '验证通过', icon: 'success' })
      } catch (err: any) {
        uni.showToast({ title: this.resolveErrorMessage(err, '原手机号验证失败'), icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async sendNewCode() {
      if (this.newCodeCooldown > 0 || this.loading) return
      const nextPhone = String(this.newPhone || '').trim()
      if (!/^1\d{10}$/.test(nextPhone)) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' })
        return
      }
      if (nextPhone === String(this.oldPhone || '').trim()) {
        uni.showToast({ title: '新手机号不能与原手机号相同', icon: 'none' })
        return
      }

      this.loading = true
      try {
        const res: any = await requestSMSCode(nextPhone, NEW_SCENE, { targetType: 'rider' })
        uni.showToast({ title: res.message || '验证码已发送', icon: 'success' })
        this.startCountdown('new')
      } catch (err: any) {
        uni.showToast({ title: this.resolveErrorMessage(err, '发送失败'), icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async submitChangePhone() {
      const newCode = String(this.newCode || '').trim()
      if (newCode.length !== 6) {
        uni.showToast({ title: '请输入6位验证码', icon: 'none' })
        return
      }

      this.loading = true
      try {
        const res: any = await changePhone({
          oldPhone: String(this.oldPhone || '').trim(),
          oldCode: String(this.oldCode || '').trim(),
          newPhone: String(this.newPhone || '').trim(),
          newCode
        })

        if (res.success === false) {
          throw res
        }

        const currentSession = readRiderAuthSession({ uniApp: uni })
        const nextProfile = Object.assign({}, currentSession.profile, res.user || {}, {
          phone: String(this.newPhone || '').trim()
        })

        if (res.token) {
          persistRiderAuthSession({
            uniApp: uni,
            token: res.token,
            refreshToken: currentSession.refreshToken || null,
            tokenExpiresAt: currentSession.tokenExpiresAt || null,
            profile: nextProfile,
            extraStorageValues: {
              riderId: res.user?.id != null
                ? String(res.user.id)
                : currentSession.accountId || null,
              riderName:
                res.user?.name
                || res.user?.nickname
                || currentSession.profile?.name
                || currentSession.profile?.nickname
                || '骑手',
            },
          })
        } else {
          clearRiderAuthSession({
            uniApp: uni,
            extraStorageKeys: [
              'socket_token',
              'socket_token_account_key',
              'rider_push_registration',
            ],
          })
        }

        uni.showToast({ title: res.message || '手机号修改成功', icon: 'success' })

        if (!res.token) {
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/login/index' })
          }, 800)
          return
        }

        setTimeout(() => uni.navigateBack(), 800)
      } catch (err: any) {
        uni.showToast({ title: this.resolveErrorMessage(err, '修改失败'), icon: 'none' })
      } finally {
        this.loading = false
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

.step-content {
  padding: 48rpx 32rpx;
}

.step-header {
  text-align: center;
  margin-bottom: 64rpx;
}

.step-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #1f2937;
  display: block;
  margin-bottom: 16rpx;
}

.step-desc {
  font-size: 28rpx;
  color: #6b7280;
  display: block;
}

.form {
  background: white;
  border-radius: 24rpx;
  padding: 48rpx 32rpx;
}

.input {
  width: 100%;
  height: 96rpx;
  background: #f3f4f6;
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
  margin-top: 16rpx;

  &[disabled] {
    opacity: 0.6;
  }
}
</style>
