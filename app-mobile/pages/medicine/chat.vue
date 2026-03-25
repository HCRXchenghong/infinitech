<template>
  <view class="page med-chat">
    <view class="status-spacer" />
    <view class="header">
      <view class="back" @tap="back">
        <image class="back-svg" src="/static/icons/arrow-left.svg" mode="aspectFit" />
      </view>
      <view class="title-wrap">
        <view class="title-row">
          <text class="title">AI 健康助手</text>
          <view class="dot" />
        </view>
        <text class="sub">本建议仅供参考，不可替代线下就医</text>
      </view>
      <view class="trash" @tap="clear">
        <image class="trash-svg" src="/static/icons/trash.svg" mode="aspectFit" />
      </view>
    </view>

    <scroll-view scroll-y class="body" :scroll-top="scrollTop" :scroll-with-animation="true">
      <view class="msg-row">
        <view class="avatar ai">
          <image class="ai-svg" src="/static/icons/ai-doctor.svg" mode="aspectFit" />
        </view>
        <view class="bubble ai-bubble">
          你好！我是您的 AI 健康助手。请告诉我您哪里不舒服？或者想咨询什么药？
        </view>
      </view>

      <view
        v-for="(msg, idx) in messages"
        :key="idx"
        class="msg-row"
        :class="{ reverse: msg.role === 'user' }"
      >
        <view class="avatar" :class="msg.role === 'user' ? 'user' : 'ai'">
          <text v-if="msg.role === 'user'">👤</text>
          <image
            v-else
            class="ai-svg"
            src="/static/icons/ai-doctor.svg"
            mode="aspectFit"
          />
        </view>
        <view class="bubble" :class="msg.role === 'user' ? 'user-bubble' : 'ai-bubble'">
          <text>{{ msg.content }}</text>
          <view v-if="msg.suggestion" class="suggestion">
            <view class="suggestion-btn" @tap.stop="quickBuy(msg.suggestion)">
              去购买：{{ msg.suggestion }}
            </view>
          </view>
        </view>
      </view>

      <view v-if="isTyping" class="msg-row">
        <view class="avatar ai">
          <image class="ai-svg" src="/static/icons/ai-doctor.svg" mode="aspectFit" />
        </view>
        <view class="typing">
          <view class="dot3" />
          <view class="dot3 d2" />
          <view class="dot3 d3" />
        </view>
      </view>

      <view style="height: 12px" />
    </scroll-view>

    <view class="inputbar">
      <input
        v-model="chatInput"
        class="input"
        placeholder="描述症状，如：头痛、发烧..."
        confirm-type="send"
        @confirm="send"
      />
      <view class="send" :class="{ disabled: !trimmed }" @tap="send">➤</view>
    </view>
  </view>
</template>

<script>
import { consultMedicineAssistant } from '@/shared-ui/api.js'
import { requireCurrentUserIdentity } from '@/shared-ui/errand.js'

export default {
  data() {
    return {
      chatInput: '',
      isTyping: false,
      messages: [],
      scrollTop: 0
    }
  },
  computed: {
    trimmed() {
      return (this.chatInput || '').trim()
    }
  },
  methods: {
    back() {
      uni.navigateBack()
    },
    clear() {
      this.messages = []
    },
    scrollToBottom() {
      this.$nextTick(() => {
        this.scrollTop = 999999
      })
    },
    async send() {
      const text = (this.chatInput || '').trim()
      if (!text || this.isTyping) return
      const identity = requireCurrentUserIdentity()
      if (!identity) return

      this.messages.push({ role: 'user', content: text })
      this.chatInput = ''
      this.scrollToBottom()

      this.isTyping = true
      try {
        const res = await consultMedicineAssistant({
          messages: this.messages.map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        })
        const msg = {
          role: 'assistant',
          content: (res && res.reply) || '暂时无法生成建议，请稍后再试。'
        }
        if (res && res.suggestion) {
          msg.suggestion = res.suggestion
        }
        this.messages.push(msg)
      } catch (error) {
        const message = (error && error.data && error.data.error) || error.error || '问诊服务暂不可用'
        uni.showToast({ title: message, icon: 'none' })
      } finally {
        this.isTyping = false
        this.scrollToBottom()
      }
    },
    quickBuy(name) {
      uni.navigateTo({ url: `/pages/medicine/order?prefill=${encodeURIComponent(name)}` })
    }
  }
}
</script>

<style scoped lang="scss">
.med-chat {
  height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.status-spacer {
  height: 45px;
  background: #f8fafc;
}

.header {
  padding-top: 0;
  padding-left: 12px;
  padding-right: 12px;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
}

.back,
.trash {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  color: #334155;
}

.title-wrap {
  flex: 1;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.title {
  font-size: 15px;
  font-weight: 900;
  color: #0f172a;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #22c55e;
}

.sub {
  display: block;
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
}

.body {
  flex: 1;
  min-height: 0;
  background: #f0f2f5;
  padding: 12px;
  box-sizing: border-box;
  /* 给固定底部输入框让位，避免被覆盖 */
  padding-bottom: calc(12px + 64px + env(safe-area-inset-bottom));
}

.msg-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.msg-row.reverse {
  flex-direction: row-reverse;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
}

.avatar.ai {
  background: #ccfbf1;
  border: 1px solid #99f6e4;
}

.avatar.user {
  background: #e2e8f0;
  color: #475569;
}

.ai-svg {
  width: 30px;
  height: 30px;
}

.bubble {
  max-width: 78%;
  padding: 10px 12px;
  border-radius: 18px;
  font-size: 13px;
  line-height: 1.5;
  box-shadow: 0 1px 8px rgba(15, 23, 42, 0.06);
}

.ai-bubble {
  background: #fff;
  color: #334155;
  border-top-left-radius: 6px;
}

.user-bubble {
  background: #14b8a6;
  color: #fff;
  border-top-right-radius: 6px;
}

.suggestion {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.suggestion-btn {
  background: rgba(20, 184, 166, 0.12);
  color: #0f766e;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 900;
}

.typing {
  background: #fff;
  border-radius: 18px;
  border-top-left-radius: 6px;
  padding: 10px 12px;
  display: flex;
  gap: 6px;
  align-items: center;
}

.dot3 {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #94a3b8;
  animation: bounce 0.9s infinite;
}
.dot3.d2 {
  animation-delay: 0.12s;
}
.dot3.d3 {
  animation-delay: 0.24s;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.inputbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 12px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #f1f5f9;
  display: flex;
  gap: 10px;
  align-items: center;
  z-index: 50;
}

.input {
  flex: 1;
  background: #f1f5f9;
  border-radius: 14px;
  padding: 10px 12px;
  font-size: 13px;
  box-sizing: border-box;
}

.send {
  width: 44px;
  height: 40px;
  border-radius: 14px;
  background: #0d9488;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 900;
}

.send.disabled {
  background: #cbd5e1;
}

.trash-svg {
  width: 18px;
  height: 18px;
}

.back-svg {
  width: 18px;
  height: 18px;
}
</style>
