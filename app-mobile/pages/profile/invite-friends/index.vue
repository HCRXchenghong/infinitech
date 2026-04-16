<template>
  <view class="page invite-page">
    <view class="header">
      <view class="back-btn" @tap="goBack">
        <text>&#x2039;</text>
      </view>
      <text class="title">邀请好友</text>
      <view class="placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="banner-card">
        <text class="banner-title">邀请关系由服务端统一记录</text>
        <text class="banner-sub">
          好友注册时填写你的邀请码，系统会自动绑定邀请关系，并按后台配置发放奖励。
        </text>
      </view>

      <view class="invite-code-card">
        <view class="code-title">我的邀请码</view>
        <view class="code-value" :class="{ muted: !hasInviteCode }">
          {{ inviteCodeDisplay }}
        </view>
        <view class="code-actions">
          <button class="ghost-btn" :disabled="!hasInviteCode" @tap="copyCode">复制邀请码</button>
          <button class="primary-btn" :disabled="!hasInviteCode" @tap="shareInvite">复制邀请文案</button>
        </view>
        <view class="code-tip">
          <text v-if="codeStatus === 'loading'">正在获取服务端邀请码，请稍候。</text>
          <text v-else-if="codeStatus === 'error'">{{ codeErrorMessage }}</text>
          <text v-else>
            仅展示服务端下发或已缓存的真实邀请码，不再本地伪造临时邀请码。
          </text>
        </view>
      </view>

      <view v-if="inviteLink" class="section">
        <view class="section-title">注册链接</view>
        <view class="message-card">
          <text class="message-body">{{ inviteLink }}</text>
          <button class="ghost-btn full" @tap="copyInviteLink">复制注册链接</button>
        </view>
      </view>

      <view class="section">
        <view class="section-title">邀请文案</view>
        <view class="message-card">
          <text class="message-body">{{ inviteMessage }}</text>
          <button class="ghost-btn full" :disabled="!hasInviteCode" @tap="copyInviteText">复制邀请文案</button>
        </view>
      </view>

      <view class="section">
        <view class="section-title">说明</view>
        <view class="rule-card">
          <view class="rule-item">邀请码优先从服务端获取，失败时仅回退到已缓存的真实邀请码。</view>
          <view class="rule-item">复制邀请文案前会先写入一条邀请分享记录，方便后台审计。</view>
          <view class="rule-item">如后台配置了邀请落地页，会自动附带可直接打开的注册链接。</view>
        </view>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script>
import {
  fetchInviteCode,
  fetchPublicRuntimeSettings,
  recordInviteShare
} from '@/shared-ui/api.js'
import { createProfileInviteFriendsPage } from '../../../../shared/mobile-common/profile-outreach-pages.js'

export default createProfileInviteFriendsPage({
  fetchInviteCode,
  fetchPublicRuntimeSettings,
  recordInviteShare
})
</script>

<style scoped lang="scss">
.invite-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
  background: #fff;
  border-bottom: 1px solid #f1f2f4;
  box-sizing: border-box;
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #111827;
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.placeholder {
  width: 36px;
  height: 36px;
}

.content {
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top, 0px) + 76px) 20px 24px;
  box-sizing: border-box;
}

.banner-card {
  margin-bottom: 20px;
  padding: 20px;
  border-radius: 18px;
  background: linear-gradient(135deg, #f97316, #fb923c);
  box-shadow: 0 12px 24px rgba(249, 115, 22, 0.2);
}

.banner-title {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.banner-sub {
  display: block;
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.9);
}

.invite-code-card,
.message-card,
.rule-card {
  padding: 20px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.invite-code-card {
  margin-bottom: 20px;
}

.code-title,
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.code-value {
  margin-top: 12px;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 3px;
  color: #ea580c;
}

.code-value.muted {
  color: #9ca3af;
  letter-spacing: 1px;
}

.code-actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}

.ghost-btn,
.primary-btn {
  flex: 1;
  height: 42px;
  line-height: 42px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
}

.ghost-btn {
  color: #ea580c;
  background: #fff7ed;
  border: 1px solid #fdba74;
}

.primary-btn {
  color: #fff;
  background: linear-gradient(135deg, #f97316, #ea580c);
}

.ghost-btn[disabled],
.primary-btn[disabled] {
  opacity: 0.55;
}

.code-tip {
  margin-top: 14px;
  font-size: 13px;
  line-height: 1.7;
  color: #6b7280;
}

.section {
  margin-bottom: 20px;
}

.message-card {
  margin-top: 12px;
}

.message-body {
  display: block;
  font-size: 14px;
  line-height: 1.8;
  color: #1f2937;
  word-break: break-all;
}

.full {
  width: 100%;
  margin-top: 14px;
}

.rule-card {
  margin-top: 12px;
}

.rule-item {
  position: relative;
  padding-left: 16px;
  font-size: 14px;
  line-height: 1.8;
  color: #4b5563;
}

.rule-item + .rule-item {
  margin-top: 10px;
}

.rule-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f97316;
}

.bottom-space {
  height: 24px;
}
</style>
