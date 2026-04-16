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
              {{ showAllLeaderboard ? '收起' : '查看全部' }}
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
                  <text class="rank-name">{{ item.name || '匿名用户' }}</text>
                  <text class="rank-time">{{ item.time_label || '最近更新' }}</text>
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
                  <text>{{ item.source || '运营中心' }}</text>
                  <text>{{ item.time_label || '最新' }}</text>
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
import { fetchPublicCharitySettings } from '@/shared-ui/api.js'
import { ensureRuntimeFeatureOpen } from '@/shared-ui/feature-runtime.js'
import {
  buildCharityLeaderboardToShow,
  createDefaultCharitySettings,
  formatCharityAmount,
  normalizeCharityJoinUrl,
  normalizeCharitySettings
} from '../../../packages/mobile-core/src/charity-page.js'

export default {
  data() {
    return {
      settings: createDefaultCharitySettings(),
      showAllLeaderboard: false
    }
  },
  computed: {
    leaderboardToShow() {
      return buildCharityLeaderboardToShow(
        this.settings.leaderboard,
        this.showAllLeaderboard
      )
    }
  },
  async onLoad() {
    const enabled = await ensureRuntimeFeatureOpen('charity')
    if (!enabled) {
      return
    }
    this.loadSettings()
  },
  methods: {
    async loadSettings() {
      try {
        const response = await fetchPublicCharitySettings()
        this.settings = normalizeCharitySettings(response)
      } catch (error) {
        this.settings = createDefaultCharitySettings()
      }
    },
    formatAmount(value) {
      return formatCharityAmount(value)
    },
    goBack() {
      uni.navigateBack({
        fail: () => {
          uni.switchTab({ url: '/pages/profile/index/index' })
        }
      })
    },
    openExternalLink(url) {
      const target = normalizeCharityJoinUrl(url)
      if (!target) {
        return false
      }
      // #ifdef H5
      window.location.href = target
      return true
      // #endif
      if (typeof plus !== 'undefined' && plus.runtime && typeof plus.runtime.openURL === 'function') {
        plus.runtime.openURL(target)
        return true
      }
      uni.setClipboardData({
        data: target,
        success: () => {
          uni.showToast({ title: '链接已复制', icon: 'success' })
        }
      })
      return true
    },
    handleAction() {
      if (this.openExternalLink(this.settings.join_url)) {
        return
      }
      uni.showModal({
        title: this.settings.action_label,
        content: this.settings.participation_notice,
        showCancel: false
      })
    }
  }
}
</script>

<style scoped lang="scss">
.charity-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
  background: rgba(248, 250, 252, 0.92);
  backdrop-filter: blur(12px);
}

.back-button,
.header-placeholder {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button {
  font-size: 28px;
  color: #0f172a;
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.content {
  min-height: calc(100vh - 60px);
  padding: 12px 16px 0;
  box-sizing: border-box;
}

.hero-card,
.section-card,
.action-card,
.stat-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.12);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
}

.hero-card {
  position: relative;
  overflow: hidden;
  min-height: 240px;
  border-radius: 24px;
}

.hero-image,
.hero-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-overlay {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.72), rgba(37, 99, 235, 0.32));
}

.hero-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 240px;
  padding: 20px;
  box-sizing: border-box;
}

.hero-tag {
  font-size: 11px;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.8);
}

.hero-title {
  margin-top: 10px;
  font-size: 28px;
  font-weight: 800;
  color: #fff;
}

.hero-subtitle {
  margin-top: 6px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.92);
}

.hero-copy {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.84);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.stat-card {
  border-radius: 18px;
  padding: 16px;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
}

.stat-value {
  display: block;
  margin-top: 8px;
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
}

.stat-status {
  font-size: 18px;
}

.section-card,
.action-card {
  margin-top: 16px;
  border-radius: 22px;
  padding: 18px;
  box-sizing: border-box;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.section-action {
  font-size: 13px;
  color: #2563eb;
}

.rank-list,
.news-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.rank-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: #f8fafc;
}

.rank-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.rank-badge {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 700;
}

.rank-name,
.news-title,
.plan-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.rank-time,
.news-summary,
.paragraph,
.empty-text,
.plan-desc {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #64748b;
}

.rank-amount {
  font-size: 15px;
  font-weight: 800;
  color: #1d4ed8;
}

.plan-card {
  margin-top: 14px;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(135deg, #eff6ff, #eef2ff);
}

.news-item {
  overflow: hidden;
  border-radius: 18px;
  background: #f8fafc;
}

.news-image {
  width: 100%;
  height: 148px;
  display: block;
}

.news-body {
  padding: 14px;
}

.news-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  font-size: 12px;
  color: #94a3b8;
}

.action-card {
  margin-bottom: 0;
  text-align: center;
}

.action-note {
  display: block;
  font-size: 11px;
  letter-spacing: 1.5px;
  color: #64748b;
}

.action-button {
  margin-top: 12px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.empty-card {
  margin-top: 16px;
}

.bottom-space {
  height: 24px;
}
</style>
