<template>
  <view class="container">
    <!-- 消息弹窗组件 -->
    <message-popup />

    <view class="page-padding">
      <view class="header">
        <image class="back-icon" src="/static/icons/back.png" @click="goBack"></image>
        <text class="page-title">开发者选项</text>
      </view>

      <!-- 消息通知测试 -->
      <view class="section">
        <view class="section-title">消息通知测试</view>
        <view class="card">
          <view class="test-item" @click="testNotification">
            <view class="test-info">
              <text class="test-name">测试消息通知</text>
              <text class="test-desc">测试弹窗和原生通知</text>
            </view>
            <text class="test-btn">测试</text>
          </view>
        </view>
      </view>

      <!-- 系统信息 -->
      <view class="section">
        <view class="section-title">系统信息</view>
        <view class="card">
          <view class="info-item" @click="showDiagnosticInfo">
            <text class="info-label">诊断信息</text>
            <text class="arrow">›</text>
          </view>
          <view class="divider"></view>
          <view class="info-item" @click="reinitNotification">
            <text class="info-label">重新初始化通知</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 通知设置 -->
      <view class="section">
        <view class="section-title">通知状态</view>
        <view class="card">
          <view class="info-item">
            <text class="info-label">消息通知</text>
            <text :class="['status', notificationSettings.messageNotice ? 'on' : 'off']">
              {{ notificationSettings.messageNotice ? '开启' : '关闭' }}
            </text>
          </view>
          <view class="divider"></view>
          <view class="info-item">
            <text class="info-label">新订单提醒</text>
            <text :class="['status', notificationSettings.orderNotice ? 'on' : 'off']">
              {{ notificationSettings.orderNotice ? '开启' : '关闭' }}
            </text>
          </view>
          <view class="divider"></view>
          <view class="info-item">
            <text class="info-label">震动提醒</text>
            <text :class="['status', notificationSettings.vibrateNotice ? 'on' : 'off']">
              {{ notificationSettings.vibrateNotice ? '开启' : '关闭' }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import notification from '@/utils/notification'
import { getCachedSupportRuntimeSettings } from '@/shared-ui/support-runtime'

export default Vue.extend({
  data() {
    return {
      notificationSettings: {
        messageNotice: true,
        orderNotice: true,
        vibrateNotice: false
      }
    }
  },
  onLoad() {
    this.loadSettings()
  },
  onShow() {
    this.loadSettings()
  },
  methods: {
    loadSettings() {
      this.notificationSettings = notification.getSettings()
    },

    goBack() {
      uni.navigateBack()
    },

    /**
     * 测试消息通知
     */
    testNotification() {
      const supportTitle = getCachedSupportRuntimeSettings().title
      // 模拟一条来自客服的消息
      const testMessage = {
        id: Date.now(),
        chatId: 999,
        sender: supportTitle,
        senderId: 'admin_001',
        senderRole: 'admin',
        content: '这是一条测试消息，用于验证消息弹窗功能是否正常工作。',
        messageType: 'text',
        avatar: null,
        timestamp: Date.now()
      }
      // 触发弹窗事件
      uni.$emit('popup-state-change', {
        visible: true,
        message: testMessage
      })
      uni.$emit('show-message-popup', testMessage)
      uni.$emit('test-popup-event', testMessage)

      // 触发原生通知
      setTimeout(() => {
        notification.showLocalNotification({
          title: `${testMessage.sender}发来新消息`,
          content: testMessage.content,
          sound: true,
          vibrate: true
        })
      }, 300)

      uni.showToast({
        title: '已发送测试通知',
        icon: 'none',
        duration: 2000
      })
    },

    /**
     * 显示诊断信息
     */
    showDiagnosticInfo() {
      const systemInfo = uni.getSystemInfoSync()
      const notificationSettings = notification.getSettings()

      const info = [
        `平台: ${systemInfo.platform || 'unknown'}`,
        `uniPlatform: ${systemInfo.uniPlatform || 'unknown'}`,
        `系统版本: ${systemInfo.system || 'unknown'}`,
        `消息通知: ${notificationSettings.messageNotice ? '开启' : '关闭'}`,
        `新订单提醒: ${notificationSettings.orderNotice ? '开启' : '关闭'}`,
        `震动提醒: ${notificationSettings.vibrateNotice ? '开启' : '关闭'}`,
        `当前页面: ${getCurrentPages()[getCurrentPages().length - 1]?.route || 'unknown'}`,
        `Plus API: ${typeof plus !== 'undefined' ? '可用' : '不可用'}`,
        `当前时间: ${new Date().toLocaleString()}`
      ].join('\n')

      uni.showModal({
        title: '诊断信息',
        content: info,
        showCancel: false,
        confirmText: '复制',
        success: (res) => {
          if (res.confirm) {
            uni.setClipboardData({
              data: info,
              success: () => {
                uni.showToast({ title: '已复制', icon: 'success' })
              }
            })
          }
        }
      })
    },

    /**
     * 重新初始化通知系统
     */
    reinitNotification() {
      uni.showLoading({ title: '正在重置...' })

      // #ifdef APP-PLUS
      setTimeout(() => {
        notification.init()
        uni.hideLoading()
        uni.showToast({
          title: '通知系统已重新初始化',
          icon: 'success',
          duration: 2000
        })
        this.loadSettings()
      }, 500)
      // #endif

      // #ifndef APP-PLUS
      uni.hideLoading()
      uni.showToast({
        title: '仅 APP 端支持原生通知',
        icon: 'none',
        duration: 2000
      })
      // #endif
    }
  }
})
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f3f4f6;
  padding-top: 88rpx;
}

.page-padding {
  padding: 24rpx;
}

.header {
  display: flex;
  align-items: center;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.back-icon {
  width: 40rpx;
  height: 40rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #1f2937;
  margin-left: 24rpx;
}

.section {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 26rpx;
  color: #6b7280;
  padding: 0 16rpx 16rpx;
  font-weight: 500;
}

.card {
  background: white;
  border-radius: 24rpx;
  overflow: hidden;
}

.test-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
}

.test-info {
  flex: 1;
}

.test-name {
  font-size: 30rpx;
  color: #1f2937;
  font-weight: 500;
  display: block;
  margin-bottom: 8rpx;
}

.test-desc {
  font-size: 24rpx;
  color: #9ca3af;
}

.test-btn {
  background: #009bf5;
  color: white;
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
}

.info-label {
  font-size: 30rpx;
  color: #1f2937;
}

.status {
  font-size: 26rpx;
  padding: 8rpx 24rpx;
  border-radius: 32rpx;
}

.status.on {
  background: #d1fae5;
  color: #059669;
}

.status.off {
  background: #f3f4f6;
  color: #9ca3af;
}

.arrow {
  font-size: 32rpx;
  color: #d1d5db;
}

.divider {
  height: 2rpx;
  background: #f3f4f6;
  margin-left: 32rpx;
}
</style>
