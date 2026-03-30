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

function isWaitingStatus(status) {
  return ['initiated', 'ringing'].includes(normalizeCallStatus(status))
}

function isFinalStatus(status) {
  return ['rejected', 'cancelled', 'ended', 'timeout', 'failed', 'busy'].includes(
    normalizeCallStatus(status)
  )
}

function buildStatusMeta(status) {
  switch (normalizeCallStatus(status)) {
    case 'ringing':
      return { text: '等待接听', hint: '已发起站内语音，正在等待对方响应。' }
    case 'accepted':
      return { text: '已接通', hint: '通话已接通，正在协商或传输音频。' }
    case 'rejected':
      return { text: '已拒绝', hint: '对方拒绝了本次站内语音。' }
    case 'cancelled':
      return { text: '已取消', hint: '发起方已取消本次呼叫。' }
    case 'ended':
      return { text: '已结束', hint: '本次通话已结束。' }
    case 'timeout':
      return { text: '无人接听', hint: '对方未在有效时间内响应，本次呼叫已超时。' }
    case 'failed':
      return { text: '呼叫失败', hint: '信令或网络异常，未能完成本次呼叫。' }
    case 'busy':
      return { text: '对方忙线', hint: '对方当前已有进行中的通话。' }
    default:
      return { text: '发起中', hint: '正在创建站内语音会话。' }
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
      return '远端音频已接入'
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

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function createRTCCallPage(options = {}) {
  const {
    canUseRTCContact,
    connectRTCSignalSession,
    fetchRTCCall,
    startRTCCall,
    canUseRTCMedia,
    createRTCMediaSession,
  } = options

  return {
    data() {
      return {
        signalSupported: typeof canUseRTCContact === 'function' ? canUseRTCContact() : false,
        mediaSupported: typeof canUseRTCMedia === 'function' ? canUseRTCMedia() : false,
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
        rtcTimeoutSeconds: 35,
        timeoutTimer: null,
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
          return '当前平台暂不支持站内语音，请返回后改用系统电话。'
        }
        if (this.errorMessage) {
          return this.errorMessage
        }
        if (this.mode === 'outgoing' && isWaitingStatus(this.status) && this.rtcTimeoutSeconds > 0) {
          return `${buildStatusMeta(this.status).hint} 无人接听将在 ${this.rtcTimeoutSeconds} 秒后自动结束。`
        }
        return buildStatusMeta(this.status).hint
      },
      mediaCapabilityText() {
        return this.mediaSupported ? '支持 WebRTC 音频协商' : '仅支持信令与审计'
      },
      mediaStatusText() {
        if (!this.mediaSupported) return buildMediaStatusText('unsupported')
        return this.remoteAudioReady ? '远端音频已接入' : buildMediaStatusText(this.mediaStage)
      },
      showAccept() {
        return this.mode === 'incoming' && isWaitingStatus(this.status)
      },
      showReject() {
        return this.mode === 'incoming' && isWaitingStatus(this.status)
      },
      showCancel() {
        return this.mode === 'outgoing' && isWaitingStatus(this.status)
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
      this.rtcTimeoutSeconds = toPositiveInt(query.timeoutSeconds, 35)

      if (!this.signalSupported) {
        this.errorMessage = '当前平台暂不支持站内语音，请改用系统电话。'
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
      this.clearTimeoutTimer()
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
          entryPoint: this.entryPoint,
          scene: this.scene,
        }
      },
      clearTimeoutTimer() {
        if (!this.timeoutTimer) return
        clearTimeout(this.timeoutTimer)
        this.timeoutTimer = null
      },
      scheduleTimeoutIfNeeded() {
        this.clearTimeoutTimer()
        if (!this.session || !isWaitingStatus(this.status) || this.rtcTimeoutSeconds <= 0) {
          return
        }
        this.timeoutTimer = setTimeout(() => {
          this.timeoutTimer = null
          if (!this.session || !isWaitingStatus(this.status) || typeof this.session.timeout !== 'function') {
            return
          }
          this.errorMessage = '对方未在有效时间内响应，本次呼叫已自动结束。'
          this.session.timeout({
            ...this.buildSignalMeta(),
            failureReason: 'no_answer_timeout',
          })
        }, this.rtcTimeoutSeconds * 1000)
      },
      bindSessionHandlers() {
        return {
          rtc_ready: () => {
            if (this.session && typeof this.session.join === 'function' && this.callId) {
              this.session.join()
            }
          },
          rtc_call_created: (payload) => {
            this.applyCallRecord(payload && (payload.call || payload))
          },
          rtc_invite: (payload) => {
            this.applyCallRecord(payload && (payload.call || payload))
          },
          rtc_status: async (payload) => {
            if (!payload || normalizeCallId(payload.callId) !== this.callId) return
            this.applyCallRecord(payload.call || payload)
            if (this.status === 'accepted') {
              await this.bootstrapAcceptedMedia()
              return
            }
            if (isFinalStatus(this.status)) {
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

        if (this.status === 'accepted' || isFinalStatus(this.status)) {
          this.clearTimeoutTimer()
        } else {
          this.scheduleTimeoutIfNeeded()
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

        const result = await startRTCCall(
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
        const record = await fetchRTCCall(this.callId)
        this.applyCallRecord(record)
        this.session = await connectRTCSignalSession(this.callId, this.bindSessionHandlers())
        if (this.session && typeof this.session.join === 'function') {
          this.session.join()
        }
        if (this.status === 'accepted') {
          await this.bootstrapAcceptedMedia()
        } else {
          this.scheduleTimeoutIfNeeded()
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
        uni.navigateBack({
          fail: () => {},
        })
      },
    },
  }
}
