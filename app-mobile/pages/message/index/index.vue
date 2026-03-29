<template>
  <view class="page message-page">
    <view class="page-header">
      <text class="page-title">消息</text>
      <view class="header-actions">
        <view class="clear-btn" @tap="clearUnread">
          <text>清除未读</text>
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
        <text>{{ tab.name }}</text>
        <view v-if="currentTab === tab.id" class="tab-indicator"></view>
      </view>
    </view>

    <scroll-view scroll-y class="message-list" :refresher-enabled="false" @scroll="onScroll">
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
                <text class="info-name">官方通知</text>
                <view class="info-tag tag-system">
                  <text>系统</text>
                </view>
              </view>
              <text class="info-time">{{ notificationTime }}</text>
            </view>
          </view>
          <view v-if="notificationUnread > 0" class="unread-badge">
            <text>{{ notificationUnread > 99 ? "99+" : notificationUnread }}</text>
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
            <text>{{ item.unread > 99 ? "99+" : item.unread }}</text>
          </view>
        </view>
      </view>

      <view
        v-if="filteredSessions.length === 0 && currentTab !== 'all' && currentTab !== 'notification'"
        class="empty-state"
      >
        <view class="empty-icon-wrapper">
          <image src="/static/icons/empty-message.svg" mode="aspectFit" class="empty-icon-img" />
        </view>
        <text class="empty-text">暂无消息</text>
        <text class="empty-hint">你的会话会显示在这里</text>
      </view>

      <view
        v-if="filteredSessions.length > 0 || currentTab === 'all' || currentTab === 'notification'"
        class="list-footer"
      >
        <view class="footer-line"></view>
        <text class="footer-text">仅显示最近一个月的消息</text>
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

const SESSION_CACHE_MAX_AGE = 6 * 60 * 60 * 1000
const SESSION_VISIBLE_MAX_AGE = 30 * 24 * 60 * 60 * 1000
const SESSION_CACHE_MAX_ITEMS = 50

export default {
  data() {
    const supportRuntime = getCachedSupportRuntimeSettings()
    return {
      currentTab: 'all',
      scrollTop: 0,
      userId: '',
      tabs: [
        { id: 'all', name: '全部' },
        { id: 'rider', name: '骑手' },
        { id: 'shop', name: '商家' },
        { id: 'notification', name: '通知' }
      ],
      notificationTime: '暂无通知',
      notificationPreview: '',
      notificationUnread: 0,
      sessions: [],
      supportTitle: supportRuntime.title
    }
  },
  computed: {
    filteredSessions() {
      if (this.currentTab === 'all') return this.sessions
      if (this.currentTab === 'rider') return this.sessions.filter((item) => item.role === 'rider')
      if (this.currentTab === 'shop') return this.sessions.filter((item) => item.role === 'shop')
      if (this.currentTab === 'notification') return []
      return this.sessions
    }
  },
  onShow() {
    this.initializePage()
  },
  methods: {
    async initializePage() {
      this.userId = this.resolveUserId()
      await this.loadSupportRuntimeConfig()
      await Promise.all([this.loadSessions(), this.loadNotificationSummary()])
    },

    async loadSupportRuntimeConfig() {
      const supportRuntime = await loadSupportRuntimeSettings()
      this.supportTitle = supportRuntime.title
    },

    resolveUserId() {
      const profile = uni.getStorageSync('userProfile') || {}
      const uid =
        profile.id ||
        profile.userId ||
        profile.phone ||
        uni.getStorageSync('userId') ||
        uni.getStorageSync('phone')
      return uid ? String(uid) : ''
    },

    getSessionStorageKey() {
      return `user_message_sessions_${this.userId || 'guest'}`
    },

    normalizeRole(role) {
      const value = String(role || '').toLowerCase()
      if (value === 'rider') return 'rider'
      if (value === 'shop' || value === 'merchant') return 'shop'
      return 'cs'
    },

    formatClock(raw) {
      if (typeof raw === 'string') {
        const match = raw.trim().match(/(\d{2}:\d{2})$/)
        if (match) return match[1]
      }
      const date = raw ? new Date(raw) : null
      if (!date || Number.isNaN(date.getTime())) return '暂无通知'
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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

    serializeSession(item = {}) {
      return {
        id: String(item.id || ''),
        roomId: String(item.roomId || ''),
        role: this.normalizeRole(item.role),
        orderId: item.orderId ? String(item.orderId) : '',
        targetId: item.targetId ? String(item.targetId) : '',
        name: String(item.name || ''),
        avatarUrl: String(item.avatarUrl || ''),
        updatedAt: Number(item.updatedAt || 0)
      }
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
        name: String(
          item.name || (role === 'rider' ? '骑手' : role === 'shop' ? '商家' : this.supportTitle)
        ),
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

    readStoredSessions() {
      try {
        const raw = uni.getStorageSync(this.getSessionStorageKey())
        if (!raw) return []
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (Array.isArray(parsed)) {
          return parsed
        }

        const cachedAt = this.parseTimestamp(parsed?.cachedAt)
        const sessions = Array.isArray(parsed?.sessions) ? parsed.sessions : []
        if (!cachedAt || Date.now() - cachedAt > SESSION_CACHE_MAX_AGE) {
          uni.removeStorageSync(this.getSessionStorageKey())
          return []
        }

        return sessions
          .map((item) => ({
            ...this.normalizeSession(item),
            unread: 0,
            online: false
          }))
          .filter((item) => item.roomId && this.isSessionRecent(item))
      } catch (err) {
        console.error('读取本地会话失败:', err)
        return []
      }
    },

    saveSessions(list = this.sessions) {
      try {
        const payload = this.sortSessions(list)
          .filter((item) => item.roomId && this.isSessionRecent(item))
          .slice(0, SESSION_CACHE_MAX_ITEMS)
          .map((item) => this.serializeSession(item))
        uni.setStorageSync(
          this.getSessionStorageKey(),
          JSON.stringify({
            cachedAt: Date.now(),
            sessions: payload
          })
        )
      } catch (err) {
        console.error('保存本地会话失败:', err)
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
        this.saveSessions()
      } catch (err) {
        console.error('加载服务端会话失败，回退本地缓存:', err)
        this.sessions = this.sortSessions(
          this.readStoredSessions()
            .filter((item) => item.roomId && this.isSessionRecent(item))
        )
      }
    },

    async loadNotificationSummary() {
      try {
        const res = await fetchNotificationList({ page: 1, pageSize: 1 })
        if (!res.success) return
        this.notificationUnread = Number(res.unreadCount || res.unread_count || 0)
        this.notificationTime = this.formatClock(res.latestAt || res.latest_at || '')
        this.notificationPreview = String(res.latestSummary || res.latest_summary || '')
      } catch (err) {
        console.error('加载通知摘要失败:', err)
      }
    },

    onScroll(e) {
      this.scrollTop = e.detail.scrollTop
    },

    switchTab(tabId) {
      this.currentTab = tabId
    },

    getRoleTag(role) {
      const tags = {
        rider: '骑手',
        shop: '商家',
        cs: '客服'
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

    async openChat(item) {
      let readSynced = false
      try {
        await markConversationRead(item.roomId || item.id)
        readSynced = true
      } catch (err) {
        console.error('同步会话已读失败:', err)
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
        title: hasSuccess
          ? '\u5df2\u6e05\u9664\u672a\u8bfb'
          : '\u6e05\u9664\u672a\u8bfb\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5',
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
