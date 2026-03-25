<template>
  <view class="auth-page">
    <view class="hero">
      <view class="logo-ring">
        <text class="logo-mark">悦</text>
      </view>
      <text class="title">{{ portalRuntime.title }}</text>
      <text class="subtitle">{{ portalRuntime.subtitle }}</text>
    </view>

    <view class="panel">
      <view class="tabs">
        <view class="tab" :class="{ active: loginType === 'code' }" @tap="loginType = 'code'">验证码登录</view>
        <view class="tab" :class="{ active: loginType === 'password' }" @tap="loginType = 'password'">密码登录</view>
      </view>

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

      <view v-if="loginType === 'code'" class="form-item">
        <text class="label">验证码</text>
        <view class="row">
          <input
            v-model="code"
            class="input code-input"
            type="number"
            maxlength="6"
            placeholder="6位验证码"
          />
          <button class="code-btn" :disabled="codeCooldown > 0 || sendingCode" @tap="handleSendCode">
            {{ sendingCode ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
          </button>
        </view>
      </view>

      <view v-else class="form-item">
        <text class="label">密码</text>
        <input
          v-model="password"
          class="input"
          :password="true"
          maxlength="32"
          placeholder="请输入登录密码"
        />
        <text class="link" @tap="goResetPassword">忘记密码？</text>
      </view>

      <button class="submit" :disabled="submitting" @tap="handleSubmit">
        {{ submitting ? '登录中...' : '登录商户端' }}
      </button>
    </view>

    <view class="footer">{{ portalRuntime.loginFooter }}</view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { merchantLogin, requestSMSCode } from '@/shared-ui/api'
import { clearMerchantContext } from '@/shared-ui/merchantContext'
import {
  getCachedMerchantPortalRuntimeSettings,
  loadMerchantPortalRuntimeSettings,
} from '@/shared-ui/portal-runtime'

const loginType = ref<'code' | 'password'>('password')
const phone = ref('')
const code = ref('')
const password = ref('')
const submitting = ref(false)
const sendingCode = ref(false)
const codeCooldown = ref(0)
const portalRuntime = reactive(getCachedMerchantPortalRuntimeSettings())

let timer: any = null

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

function validatePhone() {
  const p = String(phone.value || '').trim()
  if (!/^1\d{10}$/.test(p)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return ''
  }
  return p
}

function formatLoginError(err: any) {
  const raw = String(err?.error || err?.message || '').toLowerCase()
  if (!raw) return '登录失败'
  if (raw.includes('merchant not found') || raw.includes('商户不存在')) {
    return '该手机号不是商户账号，请使用商户账号登录'
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
  return err?.error || err?.message || '登录失败'
}

async function handleSendCode() {
  if (sendingCode.value || codeCooldown.value > 0) return
  const p = validatePhone()
  if (!p) return

  sendingCode.value = true
  try {
    const res: any = await requestSMSCode(p, 'merchant_login')
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

async function handleSubmit() {
  if (submitting.value) return
  const p = validatePhone()
  if (!p) return

  const payload: any = { phone: p }
  if (loginType.value === 'code') {
    const c = String(code.value || '').trim()
    if (!c) {
      uni.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }
    payload.code = c
  } else {
    const pw = String(password.value || '').trim()
    if (!pw) {
      uni.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    payload.password = pw
  }

  submitting.value = true
  try {
    const res: any = await merchantLogin(payload)
    if (!res?.success || !res?.token) {
      throw new Error(res?.error || '登录失败')
    }

    uni.setStorageSync('token', res.token)
    uni.setStorageSync('merchantProfile', res.user || { phone: p })
    uni.setStorageSync('authMode', 'merchant')
    clearMerchantContext()

    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 300)
  } catch (err: any) {
    uni.showToast({ title: formatLoginError(err), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goResetPassword() {
  uni.navigateTo({ url: '/pages/reset-password/index' })
}

onMounted(() => {
  void loadMerchantPortalRuntimeSettings().then((runtime) => {
    Object.assign(portalRuntime, runtime)
  })
})

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
  background: radial-gradient(circle at 10% 0%, rgba(0, 155, 245, 0.28), transparent 36%),
    radial-gradient(circle at 100% 0%, rgba(0, 129, 204, 0.2), transparent 30%),
    linear-gradient(160deg, #ecf8ff 0%, #f7fbff 46%, #ffffff 100%);
  padding: calc(var(--status-bar-height) + 72rpx) 40rpx calc(40rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48rpx;
}

.logo-ring {
  width: 112rpx;
  height: 112rpx;
  border-radius: 32rpx;
  background: linear-gradient(140deg, #009bf5, #0077c2);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14rpx 36rpx rgba(0, 155, 245, 0.28);
  margin-bottom: 20rpx;
}

.logo-mark {
  font-size: 50rpx;
  color: #ffffff;
  font-weight: 700;
}

.title {
  font-size: 48rpx;
  color: #10253d;
  font-weight: 700;
}

.subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #5b7697;
}

.panel {
  background: #ffffff;
  border: 1rpx solid #d9ebfb;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 44rpx rgba(12, 82, 137, 0.14);
  padding: 32rpx;
}

.tabs {
  display: flex;
  background: #eef5fb;
  border-radius: 18rpx;
  padding: 8rpx;
  margin-bottom: 24rpx;
}

.tab {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #5d748f;
  padding: 14rpx 0;
  border-radius: 12rpx;

  &.active {
    background: #ffffff;
    color: #007ed0;
    font-weight: 600;
    box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.08);
  }
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
  font-size: 28rpx;
  color: #0b2139;
  box-sizing: border-box;
}

.row {
  display: flex;
  gap: 12rpx;
}

.code-input {
  flex: 1;
}

.code-btn {
  width: 208rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: #e8f4ff;
  color: #007ed0;
  border: 1rpx solid #badaf7;
  font-size: 24rpx;
  font-weight: 600;
}

.link {
  margin-top: 12rpx;
  display: inline-block;
  color: #007ed0;
  font-size: 24rpx;
}

.submit {
  margin-top: 18rpx;
  width: 100%;
  height: 92rpx;
  line-height: 92rpx;
  border-radius: 18rpx;
  border: none;
  background: linear-gradient(135deg, #009bf5 0%, #0077c2 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 700;
  box-shadow: 0 12rpx 28rpx rgba(0, 132, 212, 0.28);
}

.footer {
  margin-top: 28rpx;
  text-align: center;
  font-size: 22rpx;
  color: #6f87a4;
  line-height: 1.6;
}
</style>
