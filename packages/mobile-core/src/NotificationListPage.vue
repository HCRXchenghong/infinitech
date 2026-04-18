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
import { fetchNotificationList } from "@/shared-ui/api.js";
import { createNotificationListPage } from "./message-center.js";

export default createNotificationListPage({
  fetchNotificationList,
});
</script>

<style scoped lang="scss" src="./notification-list-page.scss"></style>
