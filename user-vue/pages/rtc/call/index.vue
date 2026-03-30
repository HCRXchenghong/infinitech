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
          当前页已经接通 RTC 审计、信令、来电跳转和 WebRTC 音频协商骨架。若设备不支持媒体能力，仍可回退到在线聊天或系统电话。
        </text>
      </view>

      <view class="action-group">
        <button
          v-if="showAccept"
          class="action-btn primary"
          :loading="submitting"
          @tap="handleAccept"
        >
          接听
        </button>
        <button
          v-if="showReject"
          class="action-btn danger"
          :loading="submitting"
          @tap="handleReject"
        >
          拒绝
        </button>
        <button
          v-if="showCancel"
          class="action-btn secondary"
          :loading="submitting"
          @tap="handleCancel"
        >
          取消呼叫
        </button>
        <button
          v-if="showEnd"
          class="action-btn danger"
          :loading="submitting"
          @tap="handleEnd"
        >
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
  startUserRTCCall,
} from '@/shared-ui/rtc-contact.js'
import { canUseRTCMedia, createRTCMediaSession } from '@/shared-ui/rtc-media.js'

function trimValue(value) {
  return String(value || '').trim()
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value || '')
  } catch (_err) {
    return value || ''
  }
}

function normalizeCallId(value) {
  if (!value) return ''
  if (typeof value === 'object') {
    return trimValue(value.uid || value.callId || value.call_id_raw || value.call_id)
  }
  return trimValue(value)
}

function normalizeCallStatus(value) {
  return trimValue(value || 'initiated').toLowerCase()
}

function buildStatusMeta(status) {
  switch (normalizeCallStatus(status)) {
    case 'accepted':
      return { text: '已接通', hint: '通话已接通，正在协商音频流。' }
    case 'rejected':
      return { text: '已拒绝', hint: '对方已拒绝本次站内语音。' }
    case 'cancelled':
      return { text: '已取消', hint: '发起方已取消本次呼叫。' }
    case 'ended':
      return { text: '已结束', hint: '本次通话已结束。' }
    case 'timeout':
      return { text: '已超时', hint: '对方未在有效时间内响应。' }
    case 'failed':
      return { text: '呼叫失败', hint: '信令或网络异常，未能完成呼叫。' }
    case 'busy':
      return { text: '对方忙线', hint: '对方当前已有进行中的会话。' }
    default:
      return { text: '呼叫中', hint: '已发起呼叫，正在等待对方响应。' }
  }
}

function buildMediaStatusText(stage) {
  switch (trimValue(stage)) {
    case 'local-ready':
      return '麦克风已就绪'
    case 'offer-sent':
      return '已发送 offer'
    case 'answer-sent':
      return '已发送 answer'
    case 'streaming':
      return '音频流已建立'
    case 'connected':
      return '连接已建立'
    case 'ending':
      return '正在结束'
    case 'unsupported':
      return '当前设备不支持 WebRTC 音频'
    default:
      return '等待协商'
  }
}

export default {
  data() {
    return {
      signalSupported: canUseUserRTCContact(),
      mediaSupported: canUseRTCMedia(),
      mode: 'outgoing',
      callId: '',
      orderId: '',
      conversationId: '',
      targetName: '',
      targetRole: '',
      targetId: '',
      targetPhone: '',
      entryPoint: 'order_contact_modal',
      scene: 'order_contact',
      errorMessage: '',
      submitting: false,
      status: 'initiated',
      session: null,
      mediaSession: null,
      mediaStage: 'idle',
      offerSent: false,
      answerSent: false,
      remoteAudioReady: false,
    }
  },
  computed: {
    roleLabel() {
      if (this.targetRole === 'rider') return '联系骑手'
      if (this.targetRole === 'merchant' || this.targetRole === 'shop') return '联系商家'
      return '站内语音'
    },
    statusText() {
      return buildStatusMeta(this.status).text
    },
    statusHint() {
      if (!this.signalSupported) {
        return '当前平台不支持站内语音，请返回后改用系统电话。'
      }
      if (this.errorMessage) {
        return this.errorMessage
      }
      return buildStatusMeta(this.status).hint
    },
    mediaCapabilityText() {
      return this.mediaSupported ? '支持 WebRTC 音频协商' : '仅支持信令与审计'
    },
    mediaStatusText() {
      if (!this.mediaSupported) return buildMediaStatusText('unsupported')
      if (this.remoteAudioReady) return '远端音频已接入'
      return buildMediaStatusText(this.mediaStage)
    },
    showAccept() {
      return this.mode === 'incoming' && this.status === 'initiated'
    },
    showReject() {
      return this.mode === 'incoming' && this.status === 'initiated'
    },
    showCancel() {
      return this.mode === 'outgoing' && this.status === 'initiated'
    },
    showEnd() {
      return this.status === 'accepted'
    },
  },
  async onLoad(query) {
    this.mode = trimValue(query.mode || 'outgoing') || 'outgoing'
    this.callId = trimValue(query.callId)
    this.orderId = trimValue(query.orderId)
    this.conversationId = trimValue(query.conversationId)
    this.targetName = safeDecode(query.targetName || query.name || '')
    this.targetRole = trimValue(query.targetRole || query.role)
    this.targetId = trimValue(query.targetId)
    this.targetPhone = trimValue(query.targetPhone)
    this.entryPoint = trimValue(query.entryPoint || this.entryPoint)
    this.scene = trimValue(query.scene || this.scene)

    if (!this.signalSupported) {
      this.errorMessage = '当前平台暂不支持站内语音，请改用系统电话联系。'
      return
    }

    try {
      if (this.mode === 'incoming' && this.callId) {
        await this.bootstrapExistingCall()
        return
      }
      await this.bootstrapOutgoingCall()
    } catch (err) {
      this.errorMessage = err && err.message ? err.message : '初始化站内语音失败'
    }
  },
  onUnload() {
    this.disposeMediaSession()
    if (this.session && typeof this.session.disconnect === 'function') {
      this.session.disconnect()
    }
  },
  methods: {
    buildSignalMeta() {
      return {
        orderId: this.orderId,
        conversationId: this.conversationId,
      }
    },
    bindSessionHandlers() {
      return {
        rtc_ready: () => {
          if (this.session && typeof this.session.join === 'function' && this.callId) {
            this.session.join()
          }
        },
        rtc_call_created: (payload) => {
          if (!payload) return
          this.applyCallRecord(payload.call || payload)
        },
        rtc_invite: (payload) => {
          if (!payload) return
          this.applyCallRecord(payload.call || payload)
        },
        rtc_status: async (payload) => {
          if (!payload || normalizeCallId(payload.callId) !== this.callId) return
          this.applyCallRecord(payload.call || payload)
          if (this.status === 'accepted') {
            await this.bootstrapAcceptedMedia()
          }
          if (['ended', 'cancelled', 'rejected', 'failed', 'timeout', 'busy'].includes(this.status)) {
            this.mediaStage = 'ending'
            this.disposeMediaSession()
          }
        },
        rtc_signal: async (payload) => {
          try {
            await this.handleRTCSignal(payload)
          } catch (err) {
            this.errorMessage = err && err.message ? err.message : 'RTC 媒体协商失败'
          }
        },
        rtc_error: (payload) => {
          this.errorMessage = trimValue(payload && payload.message) || 'RTC 信令处理失败'
        },
        auth_error: () => {
          this.errorMessage = 'RTC 鉴权已失效，请重新进入页面后再试'
        },
        connect_error: () => {
          this.errorMessage = 'RTC 连接失败，请检查网络后重试'
        },
      }
    },
    applyCallRecord(record) {
      if (!record) return
      const nextCallId = normalizeCallId(record)
      if (nextCallId) this.callId = nextCallId
      this.status = normalizeCallStatus(record.status)
      this.orderId = trimValue(record.orderId || record.order_id || this.orderId)
      this.conversationId = trimValue(record.conversationId || record.conversation_id || this.conversationId)
      if (this.mode === 'incoming') {
        this.targetRole = trimValue(record.callerRole || record.caller_role || this.targetRole)
        this.targetId = trimValue(record.callerId || record.caller_id || this.targetId)
        this.targetPhone = trimValue(record.callerPhone || record.caller_phone || this.targetPhone)
      } else {
        this.targetRole = trimValue(record.calleeRole || record.callee_role || this.targetRole)
        this.targetId = trimValue(record.calleeId || record.callee_id || this.targetId)
        this.targetPhone = trimValue(record.calleePhone || record.callee_phone || this.targetPhone)
      }
    },
    async ensureMediaSession() {
      if (!this.mediaSupported) {
        throw new Error('当前设备不支持 WebRTC 音频协商')
      }
      if (this.mediaSession) return this.mediaSession

      this.mediaSession = createRTCMediaSession({
        onIceCandidate: (candidate) => {
          if (!candidate || !this.session || !this.callId) return
          this.session.signal('ice-candidate', candidate, this.buildSignalMeta())
        },
        onTrack: () => {
          this.remoteAudioReady = true
          this.mediaStage = 'streaming'
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            this.mediaStage = 'connected'
            return
          }
          if (state === 'failed') {
            this.errorMessage = 'RTC 连接失败，请稍后重试或改用系统电话'
          }
        },
      })

      await this.mediaSession.ensureLocalAudio()
      this.mediaStage = 'local-ready'
      return this.mediaSession
    },
    disposeMediaSession() {
      if (!this.mediaSession || typeof this.mediaSession.stop !== 'function') {
        this.mediaSession = null
        this.remoteAudioReady = false
        this.offerSent = false
        this.answerSent = false
        return
      }
      this.mediaSession.stop()
      this.mediaSession = null
      this.remoteAudioReady = false
      this.offerSent = false
      this.answerSent = false
    },
    async bootstrapAcceptedMedia() {
      if (!this.mediaSupported || !this.session || this.status !== 'accepted') {
        return
      }

      const media = await this.ensureMediaSession()
      if (this.mode === 'outgoing' && !this.offerSent) {
        const offer = await media.createOffer()
        this.session.signal('offer', offer, this.buildSignalMeta())
        this.offerSent = true
        this.mediaStage = 'offer-sent'
      }
    },
    async handleRTCSignal(payload = {}) {
      if (!payload || normalizeCallId(payload.callId) !== this.callId) return
      const signalType = trimValue(payload.signalType).toLowerCase()
      if (!signalType) return

      const media = await this.ensureMediaSession()
      if (signalType === 'offer') {
        const answer = await media.applyOffer(payload.signal)
        this.answerSent = true
        this.mediaStage = 'answer-sent'
        this.session.signal('answer', answer, this.buildSignalMeta())
        return
      }

      if (signalType === 'answer') {
        await media.applyAnswer(payload.signal)
        this.mediaStage = 'connected'
        return
      }

      if (signalType === 'ice-candidate') {
        await media.addIceCandidate(payload.signal)
      }
    },
    async bootstrapOutgoingCall() {
      if (!this.targetRole || !this.targetId) {
        throw new Error('缺少语音联系目标')
      }

      const result = await startUserRTCCall(
        {
          calleeRole: this.targetRole,
          calleeId: this.targetId,
          calleePhone: this.targetPhone,
          conversationId: this.conversationId,
          orderId: this.orderId,
          entryPoint: this.entryPoint,
          scene: this.scene,
        },
        this.bindSessionHandlers()
      )

      this.session = result.session
      this.applyCallRecord(result.call)
    },
    async bootstrapExistingCall() {
      const record = await fetchUserRTCCall(this.callId)
      this.applyCallRecord(record)
      this.session = await connectUserRTCSignalSession(this.callId, this.bindSessionHandlers())
      if (this.session && typeof this.session.join === 'function') {
        this.session.join()
      }
      if (this.status === 'accepted') {
        await this.bootstrapAcceptedMedia()
      }
    },
    async guardAction(handler) {
      if (this.submitting) return
      this.submitting = true
      this.errorMessage = ''
      try {
        await handler()
      } catch (err) {
        this.errorMessage = err && err.message ? err.message : '通话状态更新失败'
      } finally {
        this.submitting = false
      }
    },
    handleAccept() {
      return this.guardAction(async () => {
        if (!this.session) throw new Error('RTC 会话未就绪')
        if (this.mediaSupported) {
          await this.ensureMediaSession()
        }
        this.session.accept(this.buildSignalMeta())
      })
    },
    handleReject() {
      return this.guardAction(async () => {
        if (!this.session) throw new Error('RTC 会话未就绪')
        this.session.reject(this.buildSignalMeta())
      })
    },
    handleCancel() {
      return this.guardAction(async () => {
        if (!this.session) throw new Error('RTC 会话未就绪')
        this.session.cancel(this.buildSignalMeta())
      })
    },
    handleEnd() {
      return this.guardAction(async () => {
        if (!this.session) throw new Error('RTC 会话未就绪')
        this.mediaStage = 'ending'
        this.session.end(this.buildSignalMeta())
        this.disposeMediaSession()
      })
    },
    goChat() {
      if (!this.orderId || !this.targetRole) {
        uni.showToast({ title: '缺少聊天上下文', icon: 'none' })
        return
      }
      const chatRole = this.targetRole === 'merchant' ? 'shop' : this.targetRole
      const roomId = this.conversationId || `${chatRole}_${this.orderId}`
      const avatar =
        chatRole === 'rider'
          ? '/static/images/default-avatar.svg'
          : '/static/images/default-shop.svg'
      uni.navigateTo({
        url:
          `/pages/message/chat/index?chatType=direct` +
          `&roomId=${encodeURIComponent(roomId)}` +
          `&name=${encodeURIComponent(this.targetName || '当前联系人')}` +
          `&role=${encodeURIComponent(chatRole)}` +
          `&avatar=${encodeURIComponent(avatar)}` +
          `&targetId=${encodeURIComponent(this.targetId || '')}` +
          `&orderId=${encodeURIComponent(this.orderId || '')}`,
      })
    },
    handleClose() {
      uni.navigateBack()
    },
  },
}
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
  width: 72rpx;
  font-size: 40rpx;
  color: #111827;
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
