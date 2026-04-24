<template>
  <view class="page auth">
    <view class="header">
      <text class="title">{{ portalRuntime.title }}</text>
      <text class="subtitle">{{ portalRuntime.subtitle }}</text>
    </view>

    <view class="login-tabs">
      <text class="tab-item" :class="{ active: loginType === 'code' }" @tap="switchLoginType('code')">
        验证码登录
      </text>
      <text class="tab-item" :class="{ active: loginType === 'password' }" @tap="switchLoginType('password')">
        密码登录
      </text>
    </view>

    <view class="form">
      <input v-model="phone" class="input" placeholder="手机号" type="number" maxlength="11" />

      <view v-if="loginType === 'code'" class="code-row">
        <input v-model="code" class="input" placeholder="验证码" type="number" maxlength="6" />
        <text class="code-btn" :class="{ off: codeCooldown > 0 || sendingCode }" @tap="sendCode">
          {{ sendingCode ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
        </text>
      </view>

      <view v-else>
        <input v-model="password" class="input" placeholder="密码" :password="true" maxlength="20" />
        <view class="password-actions">
          <text class="forgot-password" @tap="goResetPassword">忘记密码？</text>
        </view>
      </view>

      <button class="btn" @tap="submit" :disabled="submitting">
        {{ submitting ? '登录中...' : '登录' }}
      </button>
    </view>

    <view class="footer">
      <text class="txt">{{ portalRuntime.loginFooter }}</text>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { requestSMSCode, riderLogin } from '../../shared-ui/api'
import { persistRiderAuthSession } from '../../shared-ui/auth-session.js'
import {
  getCachedRiderPortalRuntimeSettings,
  loadRiderPortalRuntimeSettings,
} from '../../shared-ui/portal-runtime'
import { createRiderLoginPageLogic } from '../../../packages/mobile-core/src/rider-login-page.js'

export default Vue.extend(createRiderLoginPageLogic({
  requestSMSCode,
  riderLogin,
  persistRiderAuthSession,
  getCachedPortalRuntimeSettings: getCachedRiderPortalRuntimeSettings,
  loadPortalRuntimeSettings: loadRiderPortalRuntimeSettings,
  uniApp: uni,
}) as any)
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
  margin-bottom: 64rpx;
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

.login-tabs {
  display: flex;
  justify-content: center;
  gap: 48rpx;
  margin-bottom: 48rpx;
}

.tab-item {
  position: relative;
  padding-bottom: 8rpx;
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.6);

  &.active {
    color: #ffffff;
    font-weight: bold;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 4rpx;
      border-radius: 999rpx;
      background: #ffffff;
    }
  }
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

.password-actions {
  display: flex;
  justify-content: flex-end;
  margin: -16rpx 0 32rpx;
}

.forgot-password {
  font-size: 26rpx;
  color: #0284c7;
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
  color: rgba(255, 255, 255, 0.8);
}
</style>
