<template>
  <view class="auth-page">
    <view class="header">
      <text class="title">找回商户密码</text>
      <text class="subtitle">验证码验证后重置登录密码</text>
    </view>

    <view class="panel">
      <view class="form-item">
        <text class="label">手机号</text>
        <input
          v-model="phone"
          class="input"
          type="number"
          maxlength="11"
          placeholder="请输入商户手机号"
        />
      </view>

      <view class="form-item">
        <text class="label">验证码</text>
        <view class="row">
          <input
            v-model="code"
            class="input code-input"
            type="number"
            maxlength="6"
            placeholder="请输入6位验证码"
          />
          <button class="code-btn" :disabled="sendingCode || codeCooldown > 0" @tap="handleSendCode">
            {{ sendingCode ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
          </button>
        </view>
      </view>

      <button class="submit" :disabled="submitting" @tap="handleNext">
        {{ submitting ? '校验中...' : '下一步' }}
      </button>
    </view>

    <view class="footer">
      <text class="text">记起密码了？</text>
      <text class="link" @tap="goLogin">返回登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { requestSMSCode, verifySMSCodeCheck } from '@/shared-ui/api'

const phone = ref('')
const code = ref('')
const sendingCode = ref(false)
const submitting = ref(false)
const codeCooldown = ref(0)

let timer: any = null

function validatePhone() {
  const p = String(phone.value || '').trim()
  if (!/^1\d{10}$/.test(p)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return ''
  }
  return p
}

function startCooldown() {
  codeCooldown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    codeCooldown.value -= 1
    if (codeCooldown.value <= 0) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function handleSendCode() {
  if (sendingCode.value || codeCooldown.value > 0) return
  const p = validatePhone()
  if (!p) return

  sendingCode.value = true
  try {
    const res: any = await requestSMSCode(p, 'merchant_reset')
    if (res?.success === false) {
      throw new Error(res?.error || res?.message || '验证码发送失败')
    }
    uni.showToast({ title: res?.message || '验证码已发送', icon: 'success' })
    startCooldown()
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '验证码发送失败', icon: 'none' })
  } finally {
    sendingCode.value = false
  }
}

async function handleNext() {
  if (submitting.value) return
  const p = validatePhone()
  if (!p) return

  const c = String(code.value || '').trim()
  if (!c) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const res: any = await verifySMSCodeCheck({ phone: p, code: c, scene: 'merchant_reset' })
    if (res?.success === false) {
      throw new Error(res?.error || res?.message || '验证码校验失败')
    }

    uni.setStorageSync('reset_password_data', { phone: p, code: c })
    uni.redirectTo({
      url: `/pages/set-password/index?phone=${encodeURIComponent(p)}&code=${encodeURIComponent(c)}`,
    })
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '验证码错误', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goLogin() {
  uni.redirectTo({ url: '/pages/login/index' })
}

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  background: linear-gradient(165deg, #edf7ff 0%, #ffffff 45%, #f6fbff 100%);
  padding: calc(var(--status-bar-height) + 64rpx) 40rpx calc(40rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.header {
  margin-bottom: 42rpx;
}

.title {
  display: block;
  font-size: 50rpx;
  color: #0f263f;
  font-weight: 700;
}

.subtitle {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #6a83a0;
}

.panel {
  background: #ffffff;
  border: 1rpx solid #dbeaf9;
  border-radius: 24rpx;
  box-shadow: 0 14rpx 36rpx rgba(12, 82, 137, 0.1);
  padding: 30rpx;
}

.form-item {
  margin-bottom: 18rpx;
}

.label {
  display: block;
  font-size: 24rpx;
  color: #3f5977;
  margin-bottom: 10rpx;
}

.input {
  width: 100%;
  height: 88rpx;
  background: #f6fafe;
  border: 1rpx solid #d9e9f8;
  border-radius: 16rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #0b2139;
}

.row {
  display: flex;
  gap: 12rpx;
}

.code-input {
  flex: 1;
}

.code-btn {
  width: 206rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: #e8f4ff;
  color: #007ed0;
  border: 1rpx solid #badaf7;
  font-size: 24rpx;
  font-weight: 600;
}

.submit {
  margin-top: 8rpx;
  width: 100%;
  height: 92rpx;
  line-height: 92rpx;
  border-radius: 18rpx;
  border: none;
  background: linear-gradient(135deg, #009bf5 0%, #0077c2 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 700;
}

.footer {
  margin-top: 28rpx;
  text-align: center;
  font-size: 24rpx;
}

.text {
  color: #66809f;
}

.link {
  color: #007ed0;
  font-weight: 600;
  margin-left: 8rpx;
}
</style>
