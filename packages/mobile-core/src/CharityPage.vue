<template>
  <view class="charity-page">
    <view class="header">
      <view class="back-button" @tap="goBack">
        <text>&lt;</text>
      </view>
      <text class="header-title">{{ settings.page_title }}</text>
      <view class="header-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="hero-card">
        <image class="hero-image" :src="settings.hero_image_url" mode="aspectFill" />
        <view class="hero-overlay" />
        <view class="hero-body">
          <text class="hero-tag">CHARITY OPS</text>
          <text class="hero-title">{{ settings.page_title }}</text>
          <text class="hero-subtitle">{{ settings.page_subtitle }}</text>
          <text class="hero-copy">{{ settings.hero_tagline }}</text>
        </view>
      </view>

      <view v-if="!settings.enabled" class="section-card empty-card">
        <text class="section-title">公益参与方式</text>
        <text class="empty-text">{{ settings.participation_notice }}</text>
      </view>

      <block v-else>
        <view class="stats-grid">
          <view class="stat-card">
            <text class="stat-label">公益资金池</text>
            <text class="stat-value">¥{{ formatAmount(settings.fund_pool_amount) }}</text>
          </view>
          <view class="stat-card">
            <text class="stat-label">今日参与数</text>
            <text class="stat-value">{{ formatAmount(settings.today_donation_count) }}</text>
          </view>
          <view class="stat-card">
            <text class="stat-label">运行天数</text>
            <text class="stat-value">{{ formatAmount(settings.hero_days_running) }}</text>
          </view>
          <view class="stat-card">
            <text class="stat-label">项目状态</text>
            <text class="stat-value stat-status">{{ settings.project_status_text }}</text>
          </view>
        </view>

        <view class="section-card">
          <view class="section-head">
            <text class="section-title">{{ settings.leaderboard_title }}</text>
            <text
              v-if="settings.leaderboard.length > 5"
              class="section-action"
              @tap="showAllLeaderboard = !showAllLeaderboard"
            >
              {{ showAllLeaderboard ? "收起" : "查看全部" }}
            </text>
          </view>
          <view v-if="leaderboardToShow.length" class="rank-list">
            <view
              v-for="(item, index) in leaderboardToShow"
              :key="`${item.name}-${index}`"
              class="rank-item"
            >
              <view class="rank-left">
                <view class="rank-badge">{{ index + 1 }}</view>
                <view>
                  <text class="rank-name">{{ item.name || "匿名用户" }}</text>
                  <text class="rank-time">{{ item.time_label || "最近更新" }}</text>
                </view>
              </view>
              <text class="rank-amount">¥{{ formatAmount(item.amount) }}</text>
            </view>
          </view>
          <text v-else class="empty-text">榜单数据由管理端配置，当前暂无可展示内容。</text>
        </view>

        <view class="section-card">
          <text class="section-title">{{ settings.mission_title }}</text>
          <text class="paragraph">{{ settings.mission_paragraph_one }}</text>
          <text class="paragraph">{{ settings.mission_paragraph_two }}</text>
          <view class="plan-card">
            <text class="plan-title">{{ settings.matching_plan_title }}</text>
            <text class="plan-desc">{{ settings.matching_plan_description }}</text>
          </view>
        </view>

        <view class="section-card">
          <text class="section-title">{{ settings.news_title }}</text>
          <view v-if="settings.news_list.length" class="news-list">
            <view
              v-for="(item, index) in settings.news_list"
              :key="`${item.title}-${index}`"
              class="news-item"
            >
              <image v-if="item.image_url" class="news-image" :src="item.image_url" mode="aspectFill" />
              <view class="news-body">
                <text class="news-title">{{ item.title }}</text>
                <text class="news-summary">{{ item.summary }}</text>
                <view class="news-meta">
                  <text>{{ item.source || "运营中心" }}</text>
                  <text>{{ item.time_label || "最新" }}</text>
                </view>
              </view>
            </view>
          </view>
          <text v-else class="empty-text">资讯内容由管理端维护，当前暂无发布内容。</text>
        </view>

        <view class="action-card">
          <text class="action-note">{{ settings.action_note }}</text>
          <button class="action-button" @tap="handleAction">{{ settings.action_label }}</button>
        </view>
      </block>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script>
import { fetchPublicCharitySettings } from "@/shared-ui/api.js";
import { ensureRuntimeFeatureOpen } from "@/shared-ui/feature-runtime.js";
import {
  buildCharityLeaderboardToShow,
  createDefaultCharitySettings,
  formatCharityAmount,
  normalizeCharityJoinUrl,
  normalizeCharitySettings,
} from "./charity-page.js";

export default {
  data() {
    return {
      settings: createDefaultCharitySettings(),
      showAllLeaderboard: false,
    };
  },
  computed: {
    leaderboardToShow() {
      return buildCharityLeaderboardToShow(
        this.settings.leaderboard,
        this.showAllLeaderboard,
      );
    },
  },
  async onLoad() {
    const enabled = await ensureRuntimeFeatureOpen("charity");
    if (!enabled) {
      return;
    }
    this.loadSettings();
  },
  methods: {
    async loadSettings() {
      try {
        const response = await fetchPublicCharitySettings();
        this.settings = normalizeCharitySettings(response);
      } catch (error) {
        this.settings = createDefaultCharitySettings();
      }
    },
    formatAmount(value) {
      return formatCharityAmount(value);
    },
    goBack() {
      uni.navigateBack({
        fail: () => {
          uni.switchTab({ url: "/pages/profile/index/index" });
        },
      });
    },
    openExternalLink(url) {
      const target = normalizeCharityJoinUrl(url);
      if (!target) {
        return false;
      }
      // #ifdef H5
      window.location.href = target;
      return true;
      // #endif
      if (
        typeof plus !== "undefined" &&
        plus.runtime &&
        typeof plus.runtime.openURL === "function"
      ) {
        plus.runtime.openURL(target);
        return true;
      }
      uni.setClipboardData({
        data: target,
        success: () => {
          uni.showToast({ title: "链接已复制", icon: "success" });
        },
      });
      return true;
    },
    handleAction() {
      if (this.openExternalLink(this.settings.join_url)) {
        return;
      }
      uni.showModal({
        title: this.settings.action_label,
        content: this.settings.participation_notice,
        showCancel: false,
      });
    },
  },
};
</script>

<style scoped lang="scss" src="./charity-page.scss"></style>
