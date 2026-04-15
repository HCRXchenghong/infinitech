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

<script lang="ts">
import { defineComponent } from 'vue'
import { useMerchantLoginPage } from '@/shared-ui/merchantAccountPages'

export default defineComponent({
  setup() {
    return useMerchantLoginPage()
  },
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
