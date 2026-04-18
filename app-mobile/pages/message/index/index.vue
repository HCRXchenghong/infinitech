<template>
  <view class="page message-page">
    <view class="page-header">
      <text class="page-title">{{ ui.title }}</text>
      <view class="header-actions">
        <view class="clear-btn" @tap="clearUnread">
          <text>{{ ui.clearUnread }}</text>
        </view>
        <view class="settings-btn" @tap="goSettings">
          <image src="/static/icons/settings.svg" mode="aspectFit" class="settings-icon" />
        </view>
      </view>
    </view>

    <view class="tabs-bar">
      <view
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: currentTab === tab.id }"
        @tap="switchTab(tab.id)"
      >
        <text>{{ ui.tabs[tab.id] }}</text>
        <view v-if="currentTab === tab.id" class="tab-indicator"></view>
      </view>
    </view>

    <scroll-view scroll-y class="message-list" :refresher-enabled="false">
      <view
        v-if="currentTab === 'all' || currentTab === 'notification'"
        class="message-card"
        @tap="goNotifications"
      >
        <view class="card-content">
          <view class="avatar-info">
            <view class="notification-avatar">
              <image src="/static/icons/bell.svg" mode="aspectFit" class="avatar-icon" />
            </view>
            <view class="info-detail">
              <view class="name-row">
                <text class="info-name">{{ ui.notificationName }}</text>
                <view class="info-tag tag-system">
                  <text>{{ ui.notificationTag }}</text>
                </view>
              </view>
              <text class="info-time">{{ notificationTime }}</text>
            </view>
          </view>
          <view v-if="notificationUnread > 0" class="unread-badge">
            <text>{{ notificationUnread > 99 ? '99+' : notificationUnread }}</text>
          </view>
        </view>
      </view>

      <view
        v-for="item in filteredSessions"
        :key="item.id"
        class="message-card"
        @tap="openChat(item)"
      >
        <view class="card-content">
          <view class="avatar-info">
            <view class="avatar-wrapper">
              <image
                :src="item.avatarUrl || '/static/images/default-avatar.svg'"
                mode="aspectFill"
                class="avatar-img"
              />
              <view v-if="item.online" class="online-dot"></view>
            </view>
            <view class="info-detail">
              <view class="name-row">
                <text class="info-name">{{ item.name }}</text>
                <view v-if="item.tag" class="info-tag" :class="item.tagClass">
                  <text>{{ item.tag }}</text>
                </view>
              </view>
              <text class="info-time">{{ item.time }}</text>
            </view>
          </view>
          <view v-if="item.unread > 0" class="unread-badge">
            <text>{{ item.unread > 99 ? '99+' : item.unread }}</text>
          </view>
        </view>
      </view>

      <view v-if="showEmptyState" class="empty-state">
        <view class="empty-icon-wrapper">
          <image src="/static/icons/empty-message.svg" mode="aspectFit" class="empty-icon-img" />
        </view>
        <text class="empty-text">{{ ui.emptyTitle }}</text>
        <text class="empty-hint">{{ ui.emptyHint }}</text>
      </view>

      <view v-if="showFooter" class="list-footer">
        <view class="footer-line"></view>
        <text class="footer-text">{{ ui.footer }}</text>
        <view class="footer-line"></view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import {
  fetchConversations,
  fetchNotificationList,
  markAllConversationsRead,
  markAllNotificationsRead,
  markConversationRead
} from '@/shared-ui/api.js'
import {
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings
} from '@/shared-ui/support-runtime.js'
import { createMessageCenterPage } from '../../../../packages/mobile-core/src/message-center.js'

export default createMessageCenterPage({
  fetchConversations,
  fetchNotificationList,
  markAllConversationsRead,
  markAllNotificationsRead,
  markConversationRead,
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings
})
</script>

<style scoped lang="scss" src="./index.scss"></style>
