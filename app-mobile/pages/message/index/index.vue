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

const SESSION_VISIBLE_MAX_AGE = 30 * 24 * 60 * 60 * 1000
const REALTIME_NOTIFICATION_REFRESH_EVENT = 'realtime:refresh:notifications'

const UI_TEXT = {
  title: '\u6d88\u606f',
  clearUnread: '\u6e05\u9664\u672a\u8bfb',
  notificationName: '\u5b98\u65b9\u901a\u77e5',
  notificationTag: '\u7cfb\u7edf',
  noNotification: '\u6682\u65e0\u901a\u77e5',
  emptyTitle: '\u6682\u65e0\u6d88\u606f',
  emptyHint: '\u4f60\u7684\u4f1a\u8bdd\u4f1a\u663e\u793a\u5728\u8fd9\u91cc',
  footer: '\u4ec5\u663e\u793a\u6700\u8fd1\u4e00\u4e2a\u6708\u7684\u6d88\u606f',
  clearUnreadSuccess: '\u5df2\u6e05\u9664\u672a\u8bfb',
  clearUnreadFailure: '\u6e05\u9664\u672a\u8bfb\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5',
  roleRider: '\u9a91\u624b',
  roleShop: '\u5546\u5bb6',
  roleSupport: '\u5ba2\u670d',
  emptyTime: '--:--',
  tabs: {
    all: '\u5168\u90e8',
    rider: '\u9a91\u624b',
    shop: '\u5546\u5bb6',
    notification: '\u901a\u77e5'
  }
}

export default {
  data() {
    const supportRuntime = getCachedSupportRuntimeSettings()
    return {
      ui: UI_TEXT,
      currentTab: 'all',
      tabs: [
        { id: 'all' },
        { id: 'rider' },
        { id: 'shop' },
        { id: 'notification' }
      ],
      notificationTime: UI_TEXT.noNotification,
      notificationUnread: 0,
      sessions: [],
      supportTitle: supportRuntime.title || UI_TEXT.roleSupport,
      hasLoadedServerSessions: false
    }
  },
  computed: {
    filteredSessions() {
      if (this.currentTab === 'all') return this.sessions
      if (this.currentTab === 'rider') return this.sessions.filter((item) => item.role === 'rider')
      if (this.currentTab === 'shop') return this.sessions.filter((item) => item.role === 'shop')
      if (this.currentTab === 'notification') return []
      return this.sessions
    },
    showEmptyState() {
      return (
        this.filteredSessions.length === 0 &&
        this.currentTab !== 'all' &&
        this.currentTab !== 'notification'
      )
    },
    showFooter() {
      return (
        this.filteredSessions.length > 0 ||
        this.currentTab === 'all' ||
        this.currentTab === 'notification'
      )
    }
  },
  onLoad() {
    uni.$off(REALTIME_NOTIFICATION_REFRESH_EVENT, this.handleRealtimeNotificationRefresh)
    uni.$on(REALTIME_NOTIFICATION_REFRESH_EVENT, this.handleRealtimeNotificationRefresh)
  },
  onShow() {
    this.initializePage()
  },
  onUnload() {
    uni.$off(REALTIME_NOTIFICATION_REFRESH_EVENT, this.handleRealtimeNotificationRefresh)
  },
  methods: {
    async initializePage() {
      await this.loadSupportRuntimeConfig()
      await Promise.all([this.loadSessions(), this.loadNotificationSummary()])
    },

    handleRealtimeNotificationRefresh() {
      void this.loadNotificationSummary()
    },

    async loadSupportRuntimeConfig() {
      const supportRuntime = await loadSupportRuntimeSettings()
      this.supportTitle = supportRuntime.title || this.ui.roleSupport
    },

    normalizeRole(role) {
      const value = String(role || '').toLowerCase()
      if (value === 'rider') return 'rider'
      if (value === 'shop' || value === 'merchant') return 'shop'
      return 'cs'
    },

    parseTimestamp(raw) {
      if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
        return raw
      }
      if (typeof raw === 'string') {
        const trimmed = raw.trim()
        if (!trimmed) return 0
        if (/^\d+$/.test(trimmed)) {
          const numeric = Number(trimmed)
          if (Number.isFinite(numeric) && numeric > 0) return numeric
        }
        const parsed = new Date(trimmed).getTime()
        if (Number.isFinite(parsed) && parsed > 0) return parsed
      }
      if (raw instanceof Date) {
        const value = raw.getTime()
        if (Number.isFinite(value) && value > 0) return value
      }
      return 0
    },

    formatClock(raw) {
      if (typeof raw === 'string') {
        const match = raw.trim().match(/(\d{2}:\d{2})$/)
        if (match) return match[1]
      }

      const timestamp = this.parseTimestamp(raw)
      if (!timestamp) return this.ui.emptyTime

      const date = new Date(timestamp)
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    },

    resolveSessionUpdatedAt(item = {}) {
      const candidates = [
        item.updatedAt,
        item.updated_at,
        item.lastMessageAt,
        item.last_message_at,
        item.latestAt,
        item.latest_at,
        item.timestamp,
        item.createdAt,
        item.created_at
      ]

      for (const candidate of candidates) {
        const value = this.parseTimestamp(candidate)
        if (value > 0) return value
      }
      return 0
    },

    isSessionRecent(item = {}) {
      const updatedAt = Number(item.updatedAt || 0)
      if (!Number.isFinite(updatedAt) || updatedAt <= 0) return true
      return Date.now() - updatedAt <= SESSION_VISIBLE_MAX_AGE
    },

    sortSessions(list = []) {
      return list.slice().sort((a, b) => {
        const diff = Number(b.updatedAt || 0) - Number(a.updatedAt || 0)
        if (diff !== 0) return diff
        return String(a.id || '').localeCompare(String(b.id || ''))
      })
    },

    resolveSessionId(item = {}, role = 'cs', roomId = '') {
      const directId = item.id || item.chatId || roomId
      if (directId) return String(directId)

      const targetSeed =
        item.targetId ||
        item.orderId ||
        item.userId ||
        item.riderId ||
        item.shopId ||
        item.senderId ||
        item.name ||
        'unknown'

      return `session_${role}_${String(targetSeed)}`
    },

    resolveDefaultName(role) {
      if (role === 'rider') return this.ui.roleRider
      if (role === 'shop') return this.ui.roleShop
      return this.supportTitle
    },

    getRoleTag(role) {
      const tags = {
        rider: this.ui.roleRider,
        shop: this.ui.roleShop,
        cs: this.ui.roleSupport
      }
      return tags[role] || ''
    },

    getTagClass(role) {
      const classes = {
        rider: 'tag-rider',
        shop: 'tag-shop',
        cs: 'tag-cs'
      }
      return classes[role] || ''
    },

    normalizeSession(item = {}) {
      const role = this.normalizeRole(item.role)
      const roomId = String(item.roomId || item.chatId || item.id || '')
      const updatedAt = this.resolveSessionUpdatedAt(item)

      return {
        id: this.resolveSessionId(item, role, roomId),
        roomId,
        role,
        orderId: item.orderId ? String(item.orderId) : '',
        targetId: item.targetId ? String(item.targetId) : '',
        name: String(item.name || this.resolveDefaultName(role)),
        avatarUrl: String(
          item.avatarUrl ||
            item.avatar ||
            (role === 'shop'
              ? '/static/images/default-shop.svg'
              : role === 'cs'
                ? '/static/images/logo.png'
                : '/static/images/default-avatar.svg')
        ),
        tag: this.getRoleTag(role),
        tagClass: this.getTagClass(role),
        time: String(item.time || this.formatClock(updatedAt)),
        unread: Number(item.unread || 0),
        online: item.online === true,
        updatedAt
      }
    },

    async loadSessions() {
      try {
        const response = await fetchConversations()
        const serverSessions = Array.isArray(response) ? response : []
        this.sessions = this.sortSessions(
          serverSessions
            .map((item) => this.normalizeSession(item))
            .filter((item) => item.roomId && this.isSessionRecent(item))
        )
        this.hasLoadedServerSessions = true
      } catch (err) {
        console.error('Failed to load server conversations:', err)
        if (!this.hasLoadedServerSessions) {
          this.sessions = []
        }
      }
    },

    async loadNotificationSummary() {
      try {
        const res = await fetchNotificationList({ page: 1, pageSize: 1 })
        if (!res.success) return
        this.notificationUnread = Number(res.unreadCount || res.unread_count || 0)
        const latestTime = res.latestAt || res.latest_at || ''
        this.notificationTime = latestTime
          ? this.formatClock(latestTime)
          : this.ui.noNotification
      } catch (err) {
        console.error('Failed to load notification summary:', err)
      }
    },

    switchTab(tabId) {
      this.currentTab = tabId
    },

    async openChat(item) {
      let readSynced = false
      try {
        await markConversationRead(item.roomId || item.id)
        readSynced = true
      } catch (err) {
        console.error('Failed to sync conversation read state:', err)
      }

      if (readSynced) {
        await this.loadSessions()
      }

      const chatType = this.normalizeRole(item.role) === 'cs' ? 'support' : 'direct'
      const roomId = item.roomId || item.id
      uni.navigateTo({
        url:
          '/pages/message/chat/index?chatType=' +
          encodeURIComponent(chatType) +
          '&roomId=' +
          encodeURIComponent(roomId) +
          '&name=' +
          encodeURIComponent(item.name) +
          '&role=' +
          encodeURIComponent(item.role) +
          '&avatar=' +
          encodeURIComponent(item.avatarUrl || '') +
          '&targetId=' +
          encodeURIComponent(item.targetId || '') +
          '&orderId=' +
          encodeURIComponent(item.orderId || '')
      })
    },

    async clearUnread() {
      const results = await Promise.allSettled([
        markAllConversationsRead(),
        markAllNotificationsRead()
      ])

      await Promise.all([this.loadSessions(), this.loadNotificationSummary()])
      const hasSuccess = results.some((item) => item.status === 'fulfilled')
      uni.showToast({
        title: hasSuccess ? this.ui.clearUnreadSuccess : this.ui.clearUnreadFailure,
        icon: 'none'
      })
    },

    goSettings() {
      uni.navigateTo({ url: '/pages/profile/settings/detail/index' })
    },

    goNotifications() {
      uni.navigateTo({ url: '/pages/message/notification-list/index' })
    }
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
