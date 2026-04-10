<template>
  <view class="page notifications-page">
    <view class="nav">
      <view class="nav-left" @tap="back">
        <image src="/static/icons/arrow-left.svg" mode="aspectFit" class="nav-icon" />
      </view>
      <view class="nav-title">
        <text>官方通知</text>
      </view>
      <view class="nav-right" />
    </view>

    <scroll-view scroll-y class="scroll" @scrolltolower="loadMore">
      <view
        v-for="item in notifications"
        :key="item.id"
        class="notification-card"
        @tap="goDetail(item.id)"
      >
        <view class="card-content">
          <view v-if="item.cover" class="cover">
            <image :src="item.cover" mode="aspectFill" class="cover-img" />
          </view>
          <view class="info">
            <text class="title">{{ item.title }}</text>
            <text class="summary">{{ item.summary }}</text>
            <view class="meta">
              <text class="source">{{ item.source }}</text>
              <text class="dot">·</text>
              <text class="time">{{ item.created_at }}</text>
            </view>
          </view>
          <view v-if="!item.is_read" class="unread-dot"></view>
        </view>
      </view>

      <view v-if="loading" class="loading-wrapper">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-if="!loading && notifications.length === 0" class="empty-state">
        <view class="empty-icon-wrapper">
          <image src="/static/icons/empty-message.svg" mode="aspectFit" class="empty-icon-img" />
        </view>
        <text class="empty-text">暂无通知</text>
        <text class="empty-hint">官方通知将显示在这里</text>
      </view>

      <view v-if="!loading && notifications.length > 0 && !hasMore" class="no-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchNotificationList } from '@/shared-ui/api.js'

const NOTIFICATION_READ_EVENT = 'official-notification-read'
const REALTIME_NOTIFICATION_REFRESH_EVENT = 'realtime:refresh:notifications'

export default {
  data() {
    return {
      notifications: [],
      loading: false,
      page: 1,
      pageSize: 20,
      hasMore: true
    }
  },
  onLoad() {
    uni.$on(NOTIFICATION_READ_EVENT, this.handleNotificationRead)
    uni.$off(REALTIME_NOTIFICATION_REFRESH_EVENT, this.handleRealtimeNotificationRefresh)
    uni.$on(REALTIME_NOTIFICATION_REFRESH_EVENT, this.handleRealtimeNotificationRefresh)
    this.refreshNotifications()
  },
  onUnload() {
    uni.$off(NOTIFICATION_READ_EVENT, this.handleNotificationRead)
    uni.$off(REALTIME_NOTIFICATION_REFRESH_EVENT, this.handleRealtimeNotificationRefresh)
  },
  methods: {
    async refreshNotifications() {
      this.notifications = []
      this.page = 1
      this.hasMore = true
      await this.loadNotifications()
    },
    async loadNotifications() {
      if (this.loading || !this.hasMore) return

      this.loading = true
      try {
        const res = await fetchNotificationList({ page: this.page, pageSize: this.pageSize })
        if (res.success && Array.isArray(res.data)) {
          if (res.data.length < this.pageSize) {
            this.hasMore = false
          }
          this.notifications = [...this.notifications, ...res.data]
          this.page++
        } else {
          this.hasMore = false
        }
      } catch (err) {
        console.error('加载通知失败:', err)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    handleNotificationRead(payload = {}) {
      const targetId = String(payload.id || '')
      if (!targetId) return
      this.notifications = this.notifications.map(item =>
        String(item.id) === targetId
          ? { ...item, is_read: true, isRead: true }
          : item
      )
    },
    handleRealtimeNotificationRefresh() {
      void this.refreshNotifications()
    },
    loadMore() {
      this.loadNotifications()
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/message/notification-detail/index?id=${id}` })
    },
    back() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped lang="scss">
.notifications-page {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 89px;
  padding-top: 45px;
  display: flex;
  align-items: center;
  background: #fff;
  box-sizing: border-box;
  border-bottom: 1px solid #f2f3f5;
}

.nav-left,
.nav-right {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  width: 22px;
  height: 22px;
  opacity: 0.85;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: #111827;
}

.scroll {
  position: fixed;
  top: 89px;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.notification-card {
  background: #fff;
  margin: 8px 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-content {
  padding: 12px;
  display: flex;
  gap: 12px;
  position: relative;
}

.cover {
  width: 100px;
  height: 70px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.cover-img {
  width: 100%;
  height: 100%;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.summary {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #9ca3af;
  margin-top: auto;
}

.source {
  color: #6b7280;
}

.dot {
  color: #d1d5db;
}

.time {
  color: #9ca3af;
}

.unread-dot {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading-text {
  font-size: 13px;
  color: #9ca3af;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.empty-icon-wrapper {
  width: 120px;
  height: 120px;
  margin-bottom: 16px;
}

.empty-icon-img {
  width: 100%;
  height: 100%;
  opacity: 0.5;
}

.empty-text {
  font-size: 15px;
  color: #6b7280;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: #9ca3af;
}

.no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-size: 12px;
  color: #9ca3af;
}
</style>
