<template>
  <view v-if="popupState.visible" class="message-popup-wrapper" :style="{ top: statusBarTop + 'px' }">
    <view class="message-popup">
      <view class="popup-header">
        <view class="sender-info">
          <image class="sender-avatar" :src="senderAvatar" mode="aspectFill" />
          <view class="sender-text">
            <text class="sender-name">{{ senderName }}</text>
            <text class="message-time">{{ messageTime }}</text>
          </view>
        </view>
        <view class="close-btn" @click.stop="handleClose">×</view>
      </view>

      <view class="popup-content" @click.stop="handleClick">
        <text class="message-text">{{ displayContent }}</text>
        <text class="view-detail">点击查看详情 ›</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import messageManager from '@/utils/message-manager'

export default Vue.extend({
  name: 'MessagePopup',
  data() {
    return {
      popupState: {
        visible: false,
        message: null as any
      },
      statusBarHeight: 44,
      statusBarTop: 0
    }
  },
  computed: {
    senderAvatar(): string {
      if (!this.popupState.message) return '/static/images/logo.png'
      return messageManager.getSenderAvatar(this.popupState.message)
    },
    senderName(): string {
      if (!this.popupState.message) return ''
      return messageManager.formatSenderName(this.popupState.message)
    },
    displayContent(): string {
      if (!this.popupState.message) return ''
      return messageManager.formatMessageContent(this.popupState.message)
    },
    messageTime(): string {
      if (!this.popupState.message) return ''
      return messageManager.formatTime(this.popupState.message.timestamp)
    }
  },
  mounted() {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]

    // 获取系统信息
    try {
      const systemInfo = uni.getSystemInfoSync()
      this.statusBarHeight = systemInfo.statusBarHeight || 44
      this.statusBarTop = 0

      // #ifdef APP-PLUS
      this.statusBarTop = 0
      // #endif
    } catch (e) {
      // system info retrieval failure is non-critical
    }

    // 监听弹窗状态变化
    uni.$on('popup-state-change', this.onPopupStateChange)

    // 同时监听直接事件（兼容性）
    uni.$on('show-message-popup', this.onShowMessage)
    uni.$on('hide-message-popup', this.onHideMessage)
    uni.$on('test-popup-event', this.onShowMessage)
  },
  beforeDestroy() {
    uni.$off('popup-state-change', this.onPopupStateChange)
    uni.$off('show-message-popup', this.onShowMessage)
    uni.$off('hide-message-popup', this.onHideMessage)
    uni.$off('test-popup-event', this.onShowMessage)
  },
  methods: {
    onPopupStateChange(state: any) {
      this.popupState = state
    },
    onShowMessage(message: any) {
      this.popupState = {
        visible: true,
        message: message
      }
    },
    onHideMessage() {
      this.popupState = {
        visible: false,
        message: null
      }
    },
    handleClick() {
      if (this.popupState.message) {
        messageManager.navigateToChat(this.popupState.message)
      }
      this.onHideMessage()
    },
    handleClose() {
      this.onHideMessage()
    }
  }
})
</script>

<style lang="scss">
.message-popup-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  pointer-events: none;
}

.message-popup {
  position: relative;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  margin: 16rpx 24rpx;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;
  pointer-events: auto;
  transform-origin: top center;
  animation: slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideDown {
  0% {
    transform: translateY(-100%) scale(0.9);
    opacity: 0;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f1f5f9;
}

.sender-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.sender-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #e2e8f0;
  flex-shrink: 0;
}

.sender-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex: 1;
}

.sender-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-time {
  font-size: 22rpx;
  color: #94a3b8;
}

.close-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
  line-height: 1;
  color: #64748b;
  font-weight: 300;
  flex-shrink: 0;
}

.popup-content {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.message-text {
  font-size: 28rpx;
  color: #475569;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
}

.view-detail {
  font-size: 24rpx;
  color: #009bf5;
  font-weight: 500;
}
</style>
