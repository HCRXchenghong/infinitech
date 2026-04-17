<template>
  <view class="page rtc-call-page">
    <view class="page-header">
      <view class="back-btn" @tap="handleClose">返回</view>
      <text class="page-title">站内语音</text>
      <view class="page-header-spacer" />
    </view>

    <view class="page-body">
      <view class="hero-card">
        <text class="target-role">{{ roleLabel }}</text>
        <text class="target-name">{{ targetName || '当前联系人' }}</text>
        <text class="status-text">{{ statusText }}</text>
        <text class="status-hint">{{ statusHint }}</text>
      </view>

      <view class="info-card">
        <view class="info-row">
          <text class="info-label">通话编号</text>
          <text class="info-value">{{ callId || '--' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">订单编号</text>
          <text class="info-value">{{ orderId || '--' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">会话标识</text>
          <text class="info-value">{{ conversationId || '--' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">RTC 信令</text>
          <text class="info-value">{{ signalSupported ? '可用' : '不可用' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">媒体协商</text>
          <text class="info-value">{{ mediaCapabilityText }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">媒体状态</text>
          <text class="info-value">{{ mediaStatusText }}</text>
        </view>
      </view>

      <view v-if="errorMessage" class="error-card">
        <text class="error-title">通话异常</text>
        <text class="error-message">{{ errorMessage }}</text>
      </view>

      <view class="note-card">
        <text class="note-title">当前能力</text>
        <text class="note-text">
          当前页已经接入 RTC 审计、信令、来电跳转和 WebRTC 音频协商。
          如果设备不支持媒体能力，仍可回退到在线聊天或系统电话。
        </text>
      </view>

      <view class="action-group">
        <button v-if="showAccept" class="action-btn primary" :loading="submitting" @tap="handleAccept">
          接听
        </button>
        <button v-if="showReject" class="action-btn danger" :loading="submitting" @tap="handleReject">
          拒绝
        </button>
        <button v-if="showCancel" class="action-btn secondary" :loading="submitting" @tap="handleCancel">
          取消呼叫
        </button>
        <button v-if="showEnd" class="action-btn danger" :loading="submitting" @tap="handleEnd">
          结束通话
        </button>
        <button class="action-btn ghost" @tap="goChat">转到在线聊天</button>
      </view>
    </view>
  </view>
</template>

<script>
import {
  canUseUserRTCContact,
  connectUserRTCSignalSession,
  fetchUserRTCCall,
  getCachedRTCRuntimeSettings,
  loadRTCRuntimeSettings,
  startUserRTCCall,
} from '@/shared-ui/rtc-contact.js'
import { canUseRTCMedia, createRTCMediaSession } from '@/shared-ui/rtc-media.js'
import { createRTCCallPage } from '../../../../packages/mobile-core/src/rtc-call-page.js'

export default createRTCCallPage({
  canUseRTCContact: canUseUserRTCContact,
  connectRTCSignalSession: connectUserRTCSignalSession,
  fetchRTCCall: fetchUserRTCCall,
  startRTCCall: startUserRTCCall,
  canUseRTCMedia,
  createRTCMediaSession,
  getCachedRTCRuntimeSettings,
  loadRTCRuntimeSettings,
})
</script>

<style scoped lang="scss">
.rtc-call-page {
  min-height: 100vh;
  background: #f5f7fb;
}

.page-header {
  height: 88rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #eef2f7;
}

.back-btn,
.page-header-spacer {
  width: 96rpx;
  font-size: 28rpx;
  color: #111827;
}

.page-header-spacer {
  visibility: hidden;
}

.page-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #111827;
}

.page-body {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.hero-card,
.info-card,
.error-card,
.note-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 12rpx 40rpx rgba(15, 23, 42, 0.06);
}

.hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.target-role {
  font-size: 24rpx;
  color: #64748b;
}

.target-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
}

.status-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #2563eb;
}

.status-hint,
.note-text,
.error-message {
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.6;
}

.note-title,
.error-title {
  margin-bottom: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.error-title,
.error-message {
  color: #b91c1c;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  padding: 12rpx 0;
  border-bottom: 1px solid #f1f5f9;
}

.info-row:last-child {
  border-bottom: 0;
}

.info-label {
  font-size: 24rpx;
  color: #64748b;
}

.info-value {
  flex: 1;
  font-size: 24rpx;
  text-align: right;
  color: #0f172a;
  word-break: break-all;
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.action-btn {
  border: 0;
  border-radius: 999rpx;
  font-size: 28rpx;
}

.action-btn.primary {
  background: #2563eb;
  color: #fff;
}

.action-btn.secondary {
  background: #e2e8f0;
  color: #0f172a;
}

.action-btn.danger {
  background: #dc2626;
  color: #fff;
}

.action-btn.ghost {
  background: transparent;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}
</style>
