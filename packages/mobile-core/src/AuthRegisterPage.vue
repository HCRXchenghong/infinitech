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

    <view class="form">
      <input v-model="nickname" class="input" placeholder="昵称" maxlength="16" />
      <input v-model="phone" class="input" placeholder="手机号" type="number" maxlength="11" />
      <input v-model="inviteCode" class="input" placeholder="邀请码（选填）" maxlength="20" />

      <view class="code-row">
        <input v-model="code" class="input" placeholder="验证码" type="number" maxlength="6" />
        <text class="code-btn" :class="{ off: codeCooldown > 0 || loading }" @tap.stop="sendCode" @click.stop="sendCode">
          {{ loading ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
        </text>
      </view>

      <view v-if="needCaptcha" class="captcha-row">
        <view class="captcha-input-row">
          <input v-model="captchaCode" class="input captcha-input" placeholder="图形验证码" maxlength="4" />
          <view class="captcha-image-wrap" @tap="refreshCaptcha">
            <image v-if="captchaImageUrl" class="captcha-image" :src="captchaImageUrl" mode="aspectFit" />
            <text v-else class="captcha-placeholder">点击加载</text>
          </view>
        </view>
      </view>

      <input v-model="password" class="input" placeholder="密码，至少 6 位" :password="true" maxlength="20" />
      <input v-model="confirmPassword" class="input" placeholder="确认密码" :password="true" maxlength="20" />

      <button class="btn" @tap="submit" :disabled="loading">
        {{
          loading
            ? bindRequired
              ? '注册并绑定中...'
              : '注册中...'
            : bindRequired
              ? '注册并绑定微信'
              : '注册'
        }}
      </button>
    </view>

    <view class="footer">
      <view class="footer-row">
        <text class="txt">已有账号？</text>
        <text class="link" @tap="goLogin">去登录</text>
      </view>
      <text class="portal-footer">{{ portalRuntime.loginFooter }}</text>
    </view>

    <view v-if="wechatLoginAvailable" class="wechat-login">
      <view class="divider">
        <view class="line"></view>
        <text>或</text>
        <view class="line"></view>
      </view>
      <view class="wechat-btn" @tap="startWechatLogin('register')">
        <image class="wechat-icon" src="/static/icons/wechat.png" mode="aspectFit" />
        <text>微信注册 / 登录</text>
      </view>
    </view>
  </view>
</template>

<script>
import {
  getBaseUrl,
  login as loginApi,
  register as registerApi,
  requestSMSCode,
  verifySMSCodeCheck,
} from "@/shared-ui/api.js";
import { saveTokenInfo } from "@/shared-ui/request-interceptor";
import {
  getCachedConsumerAuthRuntimeSettings,
  loadConsumerAuthRuntimeSettings,
} from "@/shared-ui/auth-runtime.js";
import { createRegisterPage } from "./auth-portal-pages.js";

export default createRegisterPage({
  getBaseUrl,
  loginApi,
  registerApi,
  requestSMSCode,
  verifySMSCodeCheck,
  saveTokenInfo,
  getCachedConsumerAuthRuntimeSettings,
  loadConsumerAuthRuntimeSettings,
});
</script>

<style scoped lang="scss" src="./auth-register-page.scss"></style>
