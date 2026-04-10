<template>
  <view class="vip-center-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack"><text class="back-icon">&#x2039;</text></view>
      <view class="nav-title"><image src="/static/icons/crown.svg" mode="aspectFit" class="crown-icon" /><text>{{ vipConfig.page_title }}</text></view>
      <view class="nav-right" @tap="showRules"><text class="rule-text">规则说明</text><text class="arrow-icon">&#x203A;</text></view>
    </view>
    <view class="nav-placeholder"></view>

    <view v-if="!vipConfig.enabled" class="section-card" style="margin:24rpx;">
      <view class="section-title"><text class="title-text">会员中心</text></view>
      <text class="header-tip">会员权益与成长规则以平台发布为准，请留意后续通知。</text>
    </view>

    <template v-else>
      <view class="user-overview">
        <view class="user-info-row">
          <view class="user-left">
            <view class="avatar-wrapper"><image :src="avatarUrl || '/static/images/my-avatar.svg'" mode="aspectFill" class="avatar" /></view>
            <view class="user-detail">
              <view class="name-row"><text class="username">{{ nickname }}</text><view class="level-badge">Lv.{{ currentUserLevelIndex + 1 }}</view></view>
              <view class="points-row" @tap="goPointsMall"><text class="points-label">当前积分:</text><text class="points-value">{{ points }}</text><text class="arrow-small">&#x203A;</text></view>
            </view>
          </view>
          <view class="saved-amount"><text class="saved-label">当前等级</text><text class="saved-value">{{ currentUserLevel.name || '--' }}</text></view>
        </view>
      </view>

      <view class="level-tabs"><view class="tabs-container"><view v-for="(level, index) in vipLevels" :key="level.name" class="tab-item" :class="{ active: activeTab === index }" @tap="switchTab(index)"><text>{{ level.name }}</text><view v-if="activeTab === index" class="tab-indicator"></view></view></view></view>

      <view class="vip-card-container">
        <view class="vip-card" :class="[currentLevel.style_class, animateCard ? 'animate' : '']">
          <view class="card-bg-pattern"></view>
          <view v-if="currentLevel.is_black_gold" class="shimmer-effect"></view>
          <view class="card-content">
            <view class="card-header"><view class="card-title-row"><image src="/static/icons/crown.svg" mode="aspectFit" class="card-crown" /><text class="card-title" :class="{ 'gold-text': currentLevel.is_black_gold }">{{ currentLevel.name }}</text></view><view class="current-badge">{{ activeTab === currentUserLevelIndex ? '当前等级' : '权益预览' }}</view></view>
            <text class="card-tagline">{{ currentLevel.tagline }}</text>
            <view class="progress-section">
              <view class="progress-header"><text class="progress-label">成长进度</text><text class="progress-value">{{ progressValueText(currentLevel) }}</text></view>
              <view class="progress-bar"><view class="progress-fill" :class="{ 'gold-fill': currentLevel.is_black_gold }" :style="{ width: progressPercent(currentLevel) }"></view></view>
              <view class="progress-tip"><text class="tip-icon">&#x2192;</text><text class="tip-text">{{ nextThresholdText(activeTab) }}</text></view>
            </view>
          </view>
        </view>
      </view>

      <view class="benefits-header"><view class="header-left"><text class="header-title">{{ vipConfig.benefit_section_title }}</text><view class="vip-tag">{{ vipConfig.benefit_section_tag }}</view></view><text class="header-tip">{{ vipConfig.benefit_section_tip }}</text></view>
      <view class="benefits-grid"><view v-for="benefit in currentLevel.benefits" :key="benefit.title" class="benefit-card" @tap="openBenefitDetail(benefit)"><view class="benefit-icon" :class="{ 'gold-icon': currentLevel.is_black_gold }"><image :src="benefit.icon" mode="aspectFit" class="icon-img" /></view><view class="benefit-info"><text class="benefit-title">{{ benefit.title }}</text><text class="benefit-desc">{{ benefit.desc }}</text></view><text class="benefit-arrow">&#x203A;</text></view></view>

      <view class="tasks-section"><view class="section-card"><view class="section-header"><view class="section-title"><text class="title-icon">★</text><text class="title-text">{{ vipConfig.tasks_section_title }}</text></view><text class="section-tip">{{ vipConfig.tasks_section_tip }}</text></view><view v-if="vipTasks.length" class="tasks-list"><view v-for="task in vipTasks" :key="task.title" class="task-item"><view class="task-info"><text class="task-title">{{ task.title }}</text><view class="task-meta"><view class="task-reward">{{ task.reward_text }}</view><text class="task-progress">{{ task.description }}</text></view></view><view class="task-btn" @tap="handleTaskAction()"><text>{{ task.action_label || '去完成' }}</text></view></view></view><view v-else class="form-tip">成长任务将按平台发布规则展示。</view></view></view>

      <view class="points-section">
        <view class="points-header"><view class="points-title"><text class="title-icon">★</text><text class="title-text">{{ vipConfig.points_section_title }}</text></view><view class="points-more" @tap="goPointsMall"><text>更多</text><text class="arrow-small">&#x203A;</text></view></view>
        <text class="header-tip" style="margin:0 0 16rpx;">{{ vipConfig.points_section_tip }}</text>
        <scroll-view scroll-x class="points-scroll"><view class="points-list"><view v-for="reward in pointRewards" :key="reward.name" class="reward-card" @tap="exchangeReward()"><view class="reward-icon" :class="reward.colorClass"><text class="reward-emoji">{{ reward.emoji }}</text></view><view class="reward-title-row"><text class="reward-name">{{ reward.name }}</text><view v-if="reward.tag" class="reward-tag">{{ reward.tag }}</view></view><view class="reward-meta"><text class="reward-points">{{ reward.points }} 积分</text><text v-if="reward.shipFee > 0" class="reward-ship">运费 ￥{{ reward.shipFee }}</text><text v-else class="reward-ship">免运费</text></view><view class="exchange-btn">去兑换</view></view></view></scroll-view>
      </view>

      <view class="bottom-bar"><view class="service-btn" @tap="contactService"><text class="service-icon">◎</text><text class="service-text">{{ vipConfig.service_button_text }}</text></view><view class="action-btn" :class="{ 'black-gold': currentUserLevel.is_black_gold }" @tap="handleAction"><image v-if="currentUserLevel.is_black_gold" src="/static/icons/crown.svg" mode="aspectFit" class="btn-crown" /><text>{{ actionButtonText }}</text><text v-if="!currentUserLevel.is_black_gold" class="btn-arrow">&#x203A;</text></view></view>

      <view v-if="showRulesModal" class="rules-overlay" @tap="closeRules"><view class="rules-card" @tap.stop><view class="rules-header"><text class="rules-title">{{ vipConfig.rules_title }}</text><view class="rules-close" @tap="closeRules"><text>×</text></view></view><scroll-view scroll-y class="rules-body"><view class="rules-section"><text class="rules-section-title">等级权益</text><view v-for="(level, index) in vipLevels" :key="index" class="rules-item"><text class="rules-level">{{ level.name }}</text><text class="rules-text">{{ summarizeBenefits(level.benefits) }}</text></view></view><view class="rules-section"><text class="rules-section-title">积分规则</text><view v-for="(rule, index) in vipConfig.point_rules" :key="index" class="rules-bullet">{{ rule }}</view></view></scroll-view><view class="rules-footer"><view class="rules-btn" @tap="closeRules">我知道了</view></view></view></view>

      <view v-if="showModal && selectedBenefit" class="modal-overlay" @tap="closeModal"><view class="modal-content" @tap.stop><view class="modal-close" @tap="closeModal"><text>×</text></view><view class="modal-body"><view class="modal-icon" :class="{ 'gold-modal-icon': currentLevel.is_black_gold }"><image :src="selectedBenefit.icon" mode="aspectFit" class="modal-icon-img" /></view><text class="modal-title">{{ selectedBenefit.title }}</text><text class="modal-subtitle">{{ selectedBenefit.desc }}</text><view class="modal-detail"><text class="detail-label">权益详情</text><text class="detail-text">{{ selectedBenefit.detail }}</text></view><view class="modal-btn" @tap="closeModal"><text>我知道了</text></view></view></view></view>
    </template>
  </view>
</template>

<script>
import options from './page-options.js'
export default options
</script>

<style scoped lang="scss" src="./index.scss"></style>
