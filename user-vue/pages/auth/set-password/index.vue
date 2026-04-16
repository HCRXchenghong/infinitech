<template>
  <view class="page auth">
    <view class="header">
      <text class="title">设置新密码</text>
      <text class="subtitle">{{ portalRuntime.subtitle }}</text>
    </view>

    <view class="form">
      <input
        v-model="password"
        class="input"
        placeholder="新密码（至少 6 位）"
        :password="true"
        maxlength="20"
      />
      <input
        v-model="confirmPassword"
        class="input"
        placeholder="确认密码"
        :password="true"
        maxlength="20"
      />
      <button class="btn" @tap="submit" :disabled="loading">
        {{ loading ? '设置中...' : '完成' }}
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
import { request } from '@/shared-ui/api.js'
import { normalizeErrorMessage } from '@/shared-ui/foundation/error.js'
import {
  getCachedConsumerAuthRuntimeSettings,
  loadConsumerAuthRuntimeSettings
} from '@/shared-ui/auth-runtime.js'
import { createSetPasswordPage } from '../../../../shared/mobile-common/auth-password-pages.js'

export default createSetPasswordPage({
  request,
  getCachedConsumerAuthRuntimeSettings,
  loadConsumerAuthRuntimeSettings,
  normalizeErrorMessage
})
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
