<template>
  <view class="auth-page">
    <view class="header">
      <text class="title">设置新密码</text>
      <text class="subtitle">密码长度不少于 6 位</text>
    </view>

    <view class="panel">
      <view class="form-item">
        <text class="label">新密码</text>
        <input
          v-model="password"
          class="input"
          :password="true"
          maxlength="32"
          placeholder="请输入新密码"
        />
      </view>

      <view class="form-item">
        <text class="label">确认密码</text>
        <input
          v-model="confirmPassword"
          class="input"
          :password="true"
          maxlength="32"
          placeholder="请再次输入密码"
        />
      </view>

      <button class="submit" :disabled="submitting" @tap="handleSubmit">
        {{ submitting ? '提交中...' : '完成重置' }}
      </button>
    </view>

    <view class="footer">
      <text class="text">已有账号密码？</text>
      <text class="link" @tap="goLogin">返回登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { merchantSetNewPassword } from '@/shared-ui/api'

const phone = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const submitting = ref(false)

onLoad((options: any) => {
  if (options?.phone) phone.value = decodeURIComponent(options.phone)
  if (options?.code) code.value = decodeURIComponent(options.code)

  if (!phone.value || !code.value) {
    const cache = uni.getStorageSync('reset_password_data')
    if (cache) {
      phone.value = cache.phone || ''
      code.value = cache.code || ''
    }
  }

  if (!phone.value || !code.value) {
    uni.showToast({ title: '验证信息已失效，请重新获取验证码', icon: 'none' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/reset-password/index' })
    }, 500)
  }
})

async function handleSubmit() {
  if (submitting.value) return

  const pw = String(password.value || '').trim()
  const cpw = String(confirmPassword.value || '').trim()

  if (!pw || pw.length < 6) {
    uni.showToast({ title: '密码至少 6 位', icon: 'none' })
    return
  }
  if (pw !== cpw) {
    uni.showToast({ title: '两次输入密码不一致', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const res: any = await merchantSetNewPassword({ phone: phone.value, code: code.value, password: pw })
    if (res?.success === false) {
      throw new Error(res?.error || res?.message || '密码重置失败')
    }

    uni.removeStorageSync('reset_password_data')
    uni.showToast({ title: '密码重置成功', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/login/index' })
    }, 500)
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '密码重置失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goLogin() {
  uni.redirectTo({ url: '/pages/login/index' })
}
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #edf7ff 0%, #ffffff 45%, #f6fbff 100%);
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
