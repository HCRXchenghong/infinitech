<template>
  <view class="page auth">
    <view class="header">
      <text class="title">{{ portalRuntime.title }}</text>
      <text class="subtitle">{{ headerSubtitle }}</text>
    </view>

    <view v-if="bindRequired" class="bind-banner">
      <image v-if="wechatAvatarUrl" class="bind-avatar" :src="wechatAvatarUrl" mode="aspectFill" />
      <view class="bind-copy">
        <text class="bind-title">检测到待绑定的微信账号</text>
        <text class="bind-desc">{{ bindBannerDesc }}</text>
      </view>
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
        <text class="code-btn" :class="{ off: codeCooldown > 0 || loading }" @tap="sendCode">
          {{ loading ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
        </text>
      </view>

      <view v-else>
        <input v-model="password" class="input" placeholder="密码" :password="true" maxlength="20" />
        <view class="password-actions">
          <text class="forgot-password" @tap="goResetPassword">忘记密码？</text>
        </view>
      </view>

      <button class="btn" @tap="submit" :disabled="loading">
        {{
          loading
            ? bindRequired
              ? '绑定中...'
              : '登录中...'
            : bindRequired
              ? '登录并绑定微信'
              : '登录'
        }}
      </button>
    </view>

    <view class="footer">
      <view class="footer-row">
        <text class="txt">还没有账号？</text>
        <text class="link" @tap="goRegister">去注册</text>
      </view>
      <text class="portal-footer">{{ portalRuntime.loginFooter }}</text>
    </view>

    <view v-if="wechatLoginAvailable" class="wechat-login">
      <view class="divider">
        <view class="line"></view>
        <text>或</text>
        <view class="line"></view>
      </view>
      <view class="wechat-btn" @tap="startWechatLogin('login')">
        <image class="wechat-icon" src="/static/icons/wechat.png" mode="aspectFit" />
        <text>微信登录</text>
      </view>
    </view>
  </view>
</template>

<script>
import { login as loginApi, requestSMSCode, wechatBindLogin } from "@/shared-ui/api.js";
import { saveTokenInfo } from "@/shared-ui/request-interceptor";
import { normalizeErrorMessage } from "@/shared-ui/foundation/error.js";
import {
  getCachedConsumerAuthRuntimeSettings,
  loadConsumerAuthRuntimeSettings,
} from "@/shared-ui/auth-runtime.js";
import { createLoginPage } from "./auth-portal-pages.js";

export default createLoginPage({
  loginApi,
  requestSMSCode,
  wechatBindLogin,
  saveTokenInfo,
  normalizeErrorMessage,
  getCachedConsumerAuthRuntimeSettings,
  loadConsumerAuthRuntimeSettings,
});
</script>

<style scoped lang="scss" src="./auth-login-page.scss"></style>
