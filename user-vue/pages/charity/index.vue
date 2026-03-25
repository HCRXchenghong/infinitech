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
        <text class="section-title">公益入口暂未开放</text>
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

const DEFAULT_SETTINGS = {
  enabled: true,
  page_title: '悦享公益',
  page_subtitle: '让每一份善意都被看见',
  hero_image_url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200',
  hero_tagline: '以长期、透明、可配置的方式，把平台善意送到真正需要帮助的人手里。',
  hero_days_running: 0,
  fund_pool_amount: 0,
  today_donation_count: 0,
  project_status_text: '筹备中',
  leaderboard_title: '善行榜单',
  news_title: '公益资讯',
  mission_title: '初心',
  mission_paragraph_one: '悦享e食不只是生活服务平台，也希望成为连接商户、用户与城市善意的长期基础设施。',
  mission_paragraph_two: '公益页面展示、参与入口与说明文案均以管理端发布为准，避免前端静态内容误导用户。',
  matching_plan_title: '公益参与计划',
  matching_plan_description: '平台会根据运营策略配置公益参与方式，当前展示内容和入口均可在管理端统一调整。',
  action_label: '了解参与方式',
  action_note: 'OPERATED BY CHARITY OPS',
  participation_notice: '公益参与方式由平台统一发布。若当前未开放线上参与，请留意后续活动公告。',
  join_url: '',
  leaderboard: [],
  news_list: []
}

function normalizeText(value, fallback = '') {
  const normalized = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  return normalized || fallback
}

function normalizeLeaderboard(items = []) {
  if (!Array.isArray(items)) {
    return []
  }
  return items
    .map((item) => ({
      name: normalizeText(item?.name),
      amount: Math.max(0, Number(item?.amount || 0)),
      time_label: normalizeText(item?.time_label)
    }))
    .filter((item) => item.name || item.amount > 0 || item.time_label)
}

function normalizeNewsList(items = []) {
  if (!Array.isArray(items)) {
    return []
  }
  return items
    .map((item) => ({
      title: normalizeText(item?.title),
      summary: normalizeText(item?.summary),
      source: normalizeText(item?.source),
      time_label: normalizeText(item?.time_label),
      image_url: normalizeText(item?.image_url)
    }))
    .filter((item) => item.title || item.summary || item.source || item.time_label || item.image_url)
}

function normalizeSettings(payload = {}) {
  return {
    enabled: Boolean(payload.enabled ?? DEFAULT_SETTINGS.enabled),
    page_title: normalizeText(payload.page_title, DEFAULT_SETTINGS.page_title),
    page_subtitle: normalizeText(payload.page_subtitle, DEFAULT_SETTINGS.page_subtitle),
    hero_image_url: normalizeText(payload.hero_image_url, DEFAULT_SETTINGS.hero_image_url),
    hero_tagline: normalizeText(payload.hero_tagline, DEFAULT_SETTINGS.hero_tagline),
    hero_days_running: Math.max(0, Number(payload.hero_days_running || 0)),
    fund_pool_amount: Math.max(0, Number(payload.fund_pool_amount || 0)),
    today_donation_count: Math.max(0, Number(payload.today_donation_count || 0)),
    project_status_text: normalizeText(payload.project_status_text, DEFAULT_SETTINGS.project_status_text),
    leaderboard_title: normalizeText(payload.leaderboard_title, DEFAULT_SETTINGS.leaderboard_title),
    news_title: normalizeText(payload.news_title, DEFAULT_SETTINGS.news_title),
    mission_title: normalizeText(payload.mission_title, DEFAULT_SETTINGS.mission_title),
    mission_paragraph_one: normalizeText(payload.mission_paragraph_one, DEFAULT_SETTINGS.mission_paragraph_one),
    mission_paragraph_two: normalizeText(payload.mission_paragraph_two, DEFAULT_SETTINGS.mission_paragraph_two),
    matching_plan_title: normalizeText(payload.matching_plan_title, DEFAULT_SETTINGS.matching_plan_title),
    matching_plan_description: normalizeText(payload.matching_plan_description, DEFAULT_SETTINGS.matching_plan_description),
    action_label: normalizeText(payload.action_label, DEFAULT_SETTINGS.action_label),
    action_note: normalizeText(payload.action_note, DEFAULT_SETTINGS.action_note),
    participation_notice: normalizeText(payload.participation_notice, DEFAULT_SETTINGS.participation_notice),
    join_url: normalizeText(payload.join_url, ''),
    leaderboard: normalizeLeaderboard(payload.leaderboard),
    news_list: normalizeNewsList(payload.news_list)
  }
}

export default {
  data() {
    return {
      settings: { ...DEFAULT_SETTINGS },
      showAllLeaderboard: false
    }
  },
  computed: {
    leaderboardToShow() {
      if (this.showAllLeaderboard) {
        return this.settings.leaderboard
      }
      return this.settings.leaderboard.slice(0, 5)
    }
  },
  onLoad() {
    this.loadSettings()
  },
  methods: {
    async loadSettings() {
      try {
        const response = await fetchPublicCharitySettings()
        this.settings = normalizeSettings(response)
      } catch (error) {
        this.settings = { ...DEFAULT_SETTINGS }
      }
    },
    formatAmount(value) {
      return Number(value || 0).toLocaleString('en-US')
    },
    goBack() {
      uni.navigateBack({
        fail: () => {
          uni.switchTab({ url: '/pages/profile/index/index' })
        }
      })
    },
    openExternalLink(url) {
      const target = normalizeText(url)
      if (!target) {
        return
      }
      // #ifdef H5
      window.location.href = target
      return
      // #endif
      if (typeof plus !== 'undefined' && plus.runtime && typeof plus.runtime.openURL === 'function') {
        plus.runtime.openURL(target)
        return
      }
      uni.setClipboardData({
        data: target,
        success: () => {
          uni.showToast({ title: '链接已复制', icon: 'success' })
        }
      })
    },
    handleAction() {
      if (this.settings.join_url) {
        this.openExternalLink(this.settings.join_url)
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
