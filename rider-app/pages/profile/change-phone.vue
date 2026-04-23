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
          <text class="code-btn" :class="{ off: oldCodeCooldown > 0 || sendingOldCode }" @tap="sendOldCode">
            {{ sendingOldCode ? '发送中...' : oldCodeCooldown > 0 ? oldCodeCooldown + 's' : '获取验证码' }}
          </text>
        </view>
        <button class="btn" :disabled="verifyingOldPhone" @tap="verifyOldPhone">
          {{ verifyingOldPhone ? '校验中...' : '下一步' }}
        </button>
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
          <text class="code-btn" :class="{ off: newCodeCooldown > 0 || sendingNewCode }" @tap="sendNewCode">
            {{ sendingNewCode ? '发送中...' : newCodeCooldown > 0 ? newCodeCooldown + 's' : '获取验证码' }}
          </text>
        </view>
        <button class="btn" :disabled="submitting" @tap="submitChangePhone">
          {{ submitting ? '提交中...' : '确认换绑' }}
        </button>
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
  readRiderAuthIdentity,
  readRiderAuthSession,
} from '../../shared-ui/auth-session.js'
import { persistRoleAuthSessionFromAuthResult } from '../../../packages/client-sdk/src/role-auth-response.js'
import {
  buildRolePhoneChangePayload,
  createRolePhoneChangeCountdownController,
  normalizeRolePhoneChangeErrorMessage,
  requestRolePhoneChangeCode,
  validateRolePhoneChangeNewPhoneInput,
  verifyRolePhoneChangeCode,
} from '../../../packages/mobile-core/src/role-phone-change-portal.js'

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
      oldCooldownController: null as any,
      newCooldownController: null as any,
      sendingOldCode: false,
      verifyingOldPhone: false,
      sendingNewCode: false,
      submitting: false,
    }
  },
  onLoad() {
    const riderAuth = readRiderAuthIdentity({ uniApp: uni })
    if (riderAuth.riderPhone) {
      this.oldPhone = String(riderAuth.riderPhone).trim()
    }
    this.oldCooldownController = this.createCountdownController('old')
    this.newCooldownController = this.createCountdownController('new')
  },
  onUnload() {
    this.clearTimer('old')
    this.clearTimer('new')
  },
  methods: {
    createCountdownController(which: 'old' | 'new') {
      return createRolePhoneChangeCountdownController({
        setValue: (value: number) => {
          if (which === 'old') {
            this.oldCodeCooldown = value
            return
          }
          this.newCodeCooldown = value
        },
      })
    },
    clearTimer(which: 'old' | 'new') {
      if (which === 'old' && this.oldCooldownController?.clear) {
        this.oldCooldownController.clear()
        this.oldCooldownController = null
      }
      if (which === 'new' && this.newCooldownController?.clear) {
        this.newCooldownController.clear()
        this.newCooldownController = null
      }
    },
    startCountdown(which: 'old' | 'new') {
      if (which === 'old') {
        if (!this.oldCooldownController) {
          this.oldCooldownController = this.createCountdownController('old')
        }
        this.oldCooldownController.start()
        return
      }

      if (!this.newCooldownController) {
        this.newCooldownController = this.createCountdownController('new')
      }
      this.newCooldownController.start()
    },
    resolveErrorMessage(err: any, fallback = '操作失败，请稍后重试') {
      return normalizeRolePhoneChangeErrorMessage(err, fallback)
    },
    async sendOldCode() {
      if (this.oldCodeCooldown > 0 || this.sendingOldCode) return

      this.sendingOldCode = true
      try {
        const result = await requestRolePhoneChangeCode({
          step: 'old',
          phoneValue: this.oldPhone,
          scene: OLD_SCENE,
          requestSMSCode,
          extra: { targetType: 'rider' },
          cooldownController: {
            start: () => this.startCountdown('old'),
          },
          invalidPhoneMessage: '请输入正确手机号',
          failureMessage: '发送失败',
        })
        if (!result.ok) {
          uni.showToast({ title: result.message, icon: 'none' })
          return
        }

        uni.showToast({ title: result.message, icon: 'success' })
      } finally {
        this.sendingOldCode = false
      }
    },
    async verifyOldPhone() {
      if (this.verifyingOldPhone) return

      this.verifyingOldPhone = true
      try {
        const result = await verifyRolePhoneChangeCode({
          phoneValue: this.oldPhone,
          codeValue: this.oldCode,
          scene: OLD_SCENE,
          verifySMSCodeCheck,
          invalidPhoneMessage: '请输入正确手机号',
          invalidCodeMessage: '请输入6位验证码',
          failureMessage: '原手机号验证失败',
          successMessage: '验证通过',
        })
        if (!result.ok) {
          uni.showToast({ title: result.message, icon: 'none' })
          return
        }

        this.step = 2
        uni.showToast({ title: result.message, icon: 'success' })
      } finally {
        this.verifyingOldPhone = false
      }
    },
    async sendNewCode() {
      if (this.newCodeCooldown > 0 || this.sendingNewCode) return

      this.sendingNewCode = true
      try {
        const result = await requestRolePhoneChangeCode({
          step: 'new',
          phoneValue: this.newPhone,
          oldPhoneValue: this.oldPhone,
          scene: NEW_SCENE,
          requestSMSCode,
          extra: { targetType: 'rider' },
          cooldownController: {
            start: () => this.startCountdown('new'),
          },
          invalidPhoneMessage: '请输入正确手机号',
          samePhoneMessage: '新手机号不能与原手机号相同',
          failureMessage: '发送失败',
        })
        if (!result.ok) {
          uni.showToast({ title: result.message, icon: 'none' })
          return
        }

        uni.showToast({ title: result.message, icon: 'success' })
      } finally {
        this.sendingNewCode = false
      }
    },
    async submitChangePhone() {
      if (this.submitting) return

      const phoneValidation = validateRolePhoneChangeNewPhoneInput(this.newPhone, this.oldPhone, {
        invalidPhoneMessage: '请输入正确手机号',
        samePhoneMessage: '新手机号不能与原手机号相同',
      })
      if (!phoneValidation.phone) {
        uni.showToast({ title: phoneValidation.error, icon: 'none' })
        return
      }

      const payload = buildRolePhoneChangePayload({
        oldPhone: this.oldPhone,
        oldCode: this.oldCode,
        newPhone: this.newPhone,
        newCode: this.newCode,
      })
      if (payload.newCode.length !== 6) {
        uni.showToast({ title: '请输入6位验证码', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const res: any = await changePhone(payload)
        if (!res) {
          throw new Error('登录状态已失效，请重新登录')
        }

        if (res.success === false) {
          throw res
        }

        const currentSession = readRiderAuthSession({ uniApp: uni })
        const nextProfile = Object.assign({}, currentSession.profile, res.user || {}, {
          phone: payload.newPhone,
        })

        if (res.token) {
          persistRoleAuthSessionFromAuthResult({
            uniApp: uni,
            persistRoleAuthSession: persistRiderAuthSession,
            response: res,
            currentSession,
            profile: nextProfile,
            extraStorageValues({ responseUser, profile, currentSession: previousSession, pickFirstText }) {
              return {
                riderId:
                  responseUser.id != null
                    ? String(responseUser.id)
                    : previousSession.accountId || null,
                riderName: pickFirstText(
                  [
                    responseUser.name,
                    responseUser.nickname,
                    previousSession.profile?.name,
                    previousSession.profile?.nickname,
                    profile.name,
                    profile.nickname,
                  ],
                  '骑手',
                ),
              }
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
