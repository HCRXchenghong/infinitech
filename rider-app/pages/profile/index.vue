<template>
  <view class="container">
    <message-popup />

    <view class="profile-header">
      <view :style="{ height: statusBarHeight + 'px' }"></view>

      <view class="user-card">
        <view class="user-info">
          <image class="avatar" :src="avatarUrl" mode="aspectFill" @click="changeAvatar"></image>
          <view class="user-detail">
            <text class="user-name" @click="goToPersonalInfo">{{ riderName }}</text>
            <view class="badges">
              <text class="badge-level">{{ rankName }} Lv.{{ riderLevel }}</text>
              <text class="badge-rating">★ {{ riderRating.toFixed(1) }} ({{ riderRatingCount }})</text>
              <text class="badge-id">ID: {{ riderId }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <scroll-view class="content-scroll" scroll-y>
      <view class="stats-card">
        <view class="stats-header">
          <text class="stats-title">今日数据</text>
          <text class="stats-badge">实时刷新</text>
        </view>

        <view class="stats-main">
          <view class="earnings-box">
            <text class="earnings-label">今日总收入（元）</text>
            <text class="earnings-amount">¥{{ todayEarnings }}</text>
          </view>
          <view class="online-box">
            <text class="online-label">在线时长</text>
            <text class="online-time">{{ onlineHours }}h</text>
          </view>
        </view>

        <view class="stats-grid">
          <view class="stat-item">
            <text class="stat-label">完成单数</text>
            <text class="stat-value">{{ completedCount }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">准时率</text>
            <text class="stat-value">{{ onTimeRate }}%</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">绩效</text>
            <text class="stat-value">{{ performance }}</text>
          </view>
        </view>
      </view>

      <view class="wallet-card" @click="goToWallet">
        <view class="card-header">
          <text class="card-title">我的钱包</text>
          <view class="card-link">
            <text class="link-text">去提现</text>
            <text class="link-arrow">›</text>
          </view>
        </view>
      </view>

      <view class="wallet-card" @click="goToRiderHome">
        <view class="card-header">
          <text class="card-title">骑手之家</text>
          <view class="card-link">
            <text class="link-text">查看排名</text>
            <text class="link-arrow">›</text>
          </view>
        </view>
      </view>

      <view class="menu-card">
        <view class="menu-item" @click="goToHistory">
          <view class="menu-left">
            <image class="menu-icon-img" src="/static/icons/history.png" mode="aspectFit"></image>
            <text class="menu-name">历史订单</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>

        <view class="menu-item" @click="goToAppeal">
          <view class="menu-left">
            <image class="menu-icon-img" src="/static/icons/appeal.png" mode="aspectFit"></image>
            <text class="menu-name">违规申诉</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>

        <view class="menu-item" @click="goToService">
          <view class="menu-left">
            <image class="menu-icon-img" src="/static/icons/service.png" mode="aspectFit"></image>
            <text class="menu-name">{{ supportChatTitle }}</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>

        <view class="menu-item" @click="goToSettings">
          <view class="menu-left">
            <image class="menu-icon-img" src="/static/icons/settings.png" mode="aspectFit"></image>
            <text class="menu-name">设置</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <view style="height: 120rpx;"></view>
    </scroll-view>
  </view>
</template>

<script lang="ts">
import pageLogic from './index-logic.ts'

export default pageLogic
</script>

<style scoped lang="scss" src="./index.scss"></style>
