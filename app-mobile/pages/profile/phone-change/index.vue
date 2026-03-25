<template>
  <view class="page phone-change">
    <view class="card">
      <view class="title">验证原手机号</view>
      <view class="sub">为了保障账号安全，请先验证当前绑定手机号</view>

      <view class="field">
        <text class="label">当前手机号</text>
        <text class="value">{{ oldPhoneMasked }}</text>
      </view>

      <view class="field code">
        <input
          v-model="oldCode"
          class="input"
          type="number"
          maxlength="6"
          placeholder="请输入原手机号验证码"
        />
        <button class="code-btn" :disabled="oldCountdown > 0 || loading" @tap="sendOldCode">
          {{ oldCountdown > 0 ? oldCountdown + 's' : '获取验证码' }}
        </button>
      </view>

      <button class="primary-btn" :disabled="!oldCodeValid || loading" @tap="toStep2">下一步</button>
    </view>

    <view v-if="step === 2" class="card">
      <view class="title">绑定新手机号</view>
      <view class="sub">请输入新手机号并完成验证码校验</view>

      <view class="field">
        <input
          v-model="newPhone"
          class="input full"
          type="number"
          maxlength="11"
          placeholder="请输入新手机号"
        />
      </view>

      <view class="field code">
        <input
          v-model="newCode"
          class="input"
          type="number"
          maxlength="6"
          placeholder="请输入新手机号验证码"
        />
        <button class="code-btn" :disabled="newCountdown > 0 || !newPhoneValid || loading" @tap="sendNewCode">
          {{ newCountdown > 0 ? newCountdown + 's' : '获取验证码' }}
        </button>
      </view>

      <button class="primary-btn" :disabled="!newCodeValid || loading" @tap="submit">确认修改</button>
    </view>
  </view>
</template>

<script>
import { changeUserPhone, requestSMSCode, verifySMSCodeCheck } from '@/shared-ui/api.js'
import { saveTokenInfo } from '@/shared-ui/request-interceptor'

const OLD_SCENE = 'change_phone_verify'
const NEW_SCENE = 'change_phone_new'

export default {
  data() {
    return {
      step: 1,
      oldPhone: '',
      oldCode: '',
      oldCountdown: 0,
      oldTimer: null,
      newPhone: '',
      newCode: '',
      newCountdown: 0,
      newTimer: null,
      loading: false
    }
  },
  computed: {
    oldPhoneMasked() {
      if (!/^1\d{10}$/.test(this.oldPhone)) return this.oldPhone || '--'
      return this.oldPhone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
    },
    oldCodeValid() {
      return String(this.oldCode || '').trim().length === 6
    },
    newPhoneValid() {
      return /^1\d{10}$/.test(String(this.newPhone || '').trim()) && String(this.newPhone || '').trim() !== String(this.oldPhone || '').trim()
    },
    newCodeValid() {
      return this.newPhoneValid && String(this.newCode || '').trim().length === 6
    }
  },
  onLoad() {
    const profile = uni.getStorageSync('userProfile') || {}
    this.oldPhone = String(profile.phone || '').trim()
  },
  onUnload() {
    this.clearTimer('old')
    this.clearTimer('new')
  },
  methods: {
    clearTimer(which) {
      if (which === 'old' && this.oldTimer) {
        clearInterval(this.oldTimer)
        this.oldTimer = null
      }
      if (which === 'new' && this.newTimer) {
        clearInterval(this.newTimer)
        this.newTimer = null
      }
    },
    startCountdown(which) {
      if (which === 'old') {
        this.oldCountdown = 60
        this.clearTimer('old')
        this.oldTimer = setInterval(() => {
          if (this.oldCountdown <= 1) {
            this.oldCountdown = 0
            this.clearTimer('old')
            return
          }
          this.oldCountdown -= 1
        }, 1000)
        return
      }

      this.newCountdown = 60
      this.clearTimer('new')
      this.newTimer = setInterval(() => {
        if (this.newCountdown <= 1) {
          this.newCountdown = 0
          this.clearTimer('new')
          return
        }
        this.newCountdown -= 1
      }, 1000)
    },
    resolveUserId() {
      const profile = uni.getStorageSync('userProfile') || {}
      return String(profile.id || profile.userId || profile.phone || '').trim()
    },
    resolveErrorMessage(err, fallback = '操作失败，请稍后重试') {
      return err?.data?.error || err?.data?.message || err?.error || err?.message || fallback
    },
    async sendOldCode() {
      if (this.oldCountdown > 0 || this.loading) return
      if (!/^1\d{10}$/.test(this.oldPhone)) {
        uni.showToast({ title: '当前手机号无效，请重新登录', icon: 'none' })
        return
      }

      this.loading = true
      try {
        const res = await requestSMSCode(this.oldPhone, OLD_SCENE, { targetType: 'user' })
        uni.showToast({ title: res.message || '验证码已发送', icon: 'success' })
        this.startCountdown('old')
      } catch (err) {
        uni.showToast({ title: this.resolveErrorMessage(err, '发送验证码失败'), icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async toStep2() {
      if (!this.oldCodeValid || this.loading) return

      this.loading = true
      try {
        const res = await verifySMSCodeCheck(this.oldPhone, OLD_SCENE, String(this.oldCode || '').trim())
        if (res.success === false) {
          throw res
        }
        this.step = 2
        uni.showToast({ title: res.message || '验证通过', icon: 'success' })
      } catch (err) {
        uni.showToast({ title: this.resolveErrorMessage(err, '原手机号验证失败'), icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async sendNewCode() {
      if (this.newCountdown > 0 || this.loading) return
      if (!this.newPhoneValid) {
        uni.showToast({ title: '请输入未注册的新手机号', icon: 'none' })
        return
      }

      this.loading = true
      try {
        const res = await requestSMSCode(String(this.newPhone || '').trim(), NEW_SCENE, { targetType: 'user' })
        uni.showToast({ title: res.message || '验证码已发送', icon: 'success' })
        this.startCountdown('new')
      } catch (err) {
        uni.showToast({ title: this.resolveErrorMessage(err, '发送验证码失败'), icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async submit() {
      if (!this.newCodeValid || this.loading) return

      const userId = this.resolveUserId()
      if (!userId) {
        uni.showToast({ title: '登录状态已失效，请重新登录', icon: 'none' })
        return
      }

      this.loading = true
      try {
        const res = await changeUserPhone(userId, {
          oldPhone: String(this.oldPhone || '').trim(),
          oldCode: String(this.oldCode || '').trim(),
          newPhone: String(this.newPhone || '').trim(),
          newCode: String(this.newCode || '').trim()
        })

        if (res.success === false) {
          throw res
        }

        if (res.token && res.refreshToken) {
          saveTokenInfo(res.token, res.refreshToken, res.expiresIn || 7200)
        }

        const profile = uni.getStorageSync('userProfile') || {}
        const nextProfile = Object.assign({}, profile, res.user || {}, {
          phone: String(this.newPhone || '').trim()
        })
        if (nextProfile.id || nextProfile.userId) {
          nextProfile.userId = nextProfile.userId || nextProfile.id
        }
        uni.setStorageSync('userProfile', nextProfile)

        uni.showToast({ title: res.message || '修改成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 500)
      } catch (err) {
        uni.showToast({ title: this.resolveErrorMessage(err, '修改失败'), icon: 'none' })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped lang="scss">
.phone-change {
  min-height: 100vh;
  background: #f4f4f4;
  padding: 12px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 12px;
  margin-bottom: 12px;
}

.title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.sub {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

.field {
  margin-top: 12px;
}

.label {
  font-size: 12px;
  color: #6b7280;
}

.value {
  display: block;
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.code {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input {
  flex: 1;
  background: #f9fafb;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  color: #374151;
}

.input.full {
  width: 100%;
}

.code-btn {
  width: 110px;
  padding: 10px 0;
  border-radius: 10px;
  background: #eff6ff;
  color: #009bf5;
  font-size: 12px;
}

.code-btn[disabled] {
  opacity: 0.6;
}

.primary-btn {
  margin-top: 14px;
  width: 100%;
  padding: 11px 0;
  border-radius: 999px;
  background: #009bf5;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.primary-btn[disabled] {
  opacity: 0.6;
}
</style>
