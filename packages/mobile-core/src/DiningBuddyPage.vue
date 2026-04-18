<template>
  <view class="page dining-buddy">
    <view v-if="!featureEnabled" class="welcome-screen">
      <view class="icon-group">
        <view class="icon-item icon-chat"><image src="/static/icons/chat-bubble.svg" mode="aspectFit" class="icon-svg" /></view>
        <view class="icon-item icon-food"><image src="/static/icons/food-bowl.svg" mode="aspectFit" class="icon-svg" /></view>
        <view class="icon-item icon-study"><image src="/static/icons/study-book.svg" mode="aspectFit" class="icon-svg" /></view>
      </view>
      <text class="title">{{ diningTitle }}</text>
      <text class="subtitle">当前服务暂未开放，已在后台关闭入口或社区总开关。</text>
      <button class="start-btn" @tap="goBackHome">返回首页</button>
    </view>

    <view v-else-if="view === 'welcome'" class="welcome-screen">
      <view class="icon-group">
        <view class="icon-item icon-chat"><image src="/static/icons/chat-bubble.svg" mode="aspectFit" class="icon-svg" /></view>
        <view class="icon-item icon-food"><image src="/static/icons/food-bowl.svg" mode="aspectFit" class="icon-svg" /></view>
        <view class="icon-item icon-study"><image src="/static/icons/study-book.svg" mode="aspectFit" class="icon-svg" /></view>
      </view>
      <text class="title">{{ diningTitle }}</text>
      <text class="subtitle">{{ diningSubtitle }}</text>
      <button class="start-btn" @tap="startQuiz">开始匹配</button>
    </view>

    <view v-else-if="view === 'quiz'" class="quiz-screen">
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: quizProgress + '%' }"></view>
      </view>
      <text class="quiz-question">{{ currentQuestion.question }}</text>
      <view class="quiz-options">
        <view
          v-for="(opt, index) in currentQuestion.options"
          :key="index"
          class="quiz-option"
          @tap="handleQuizAnswer"
        >
          <text class="option-text">{{ opt.text }}</text>
          <text class="option-icon">{{ opt.icon }}</text>
        </view>
      </view>
    </view>

    <view v-else-if="view === 'matching'" class="matching-screen">
      <view class="loading-spinner"></view>
      <text class="matching-text">正在整理适合你的组局...</text>
    </view>

    <view v-else-if="view === 'home'" class="home-screen">
      <PageHeader :title="diningTitle" />

      <scroll-view class="content" scroll-y>
        <view class="category-tabs">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="tab-item"
            :class="{ active: activeCategory === cat.id }"
            @tap="switchCategory(cat.id)"
          >
            <image :src="cat.iconSvg" mode="aspectFit" class="tab-icon-svg" />
            <text class="tab-label">{{ cat.label }}</text>
          </view>
        </view>

        <view class="party-list">
          <view v-if="filteredParties.length === 0" class="empty-state">
            <text class="empty-text">当前分类还没有可加入的组局。</text>
            <text class="empty-hint">可以先自己发起一场。</text>
          </view>

          <view
            v-for="party in filteredParties"
            :key="party.id"
            class="party-card"
            @tap="joinParty(party)"
          >
            <view class="card-header">
              <view class="match-badge" :style="{ background: getCategoryColor(party.category, 0.1), color: getCategoryColor(party.category) }">
                <image src="/static/icons/sparkle.svg" mode="aspectFit" class="match-icon-svg" />
                <text class="match-score">{{ party.matchScore }}% 匹配</text>
              </view>
              <view class="people-count">
                <image src="/static/icons/people.svg" mode="aspectFit" class="people-icon-svg" />
                <text class="people-text">{{ party.current }}/{{ party.max }} 人</text>
              </view>
            </view>

            <text class="party-title">{{ party.title }}</text>
            <view class="party-location">
              <image src="/static/icons/map-pin.svg" mode="aspectFit" class="location-icon-svg" />
              <text class="location-text">{{ party.location }}</text>
            </view>

            <view class="party-location">
              <image src="/static/icons/lightbulb.svg" mode="aspectFit" class="location-icon-svg" />
              <text class="location-text">{{ party.time }}</text>
            </view>

            <view class="party-reason">
              <view class="reason-inner">
                <image src="/static/icons/lightbulb.svg" mode="aspectFit" class="reason-icon-svg" />
                <text class="reason-text">{{ party.matchReason }}</text>
              </view>
            </view>

            <view class="party-footer">
              <view class="members-avatars">
                <view v-for="index in party.current" :key="'filled-' + party.id + '-' + index" class="avatar-item filled"></view>
                <view v-for="index in Math.max(party.max - party.current, 0)" :key="'empty-' + party.id + '-' + index" class="avatar-item empty">+</view>
              </view>
              <view class="party-footer-actions">
                <text class="report-link" @tap.stop="reportParty(party)">举报组局</text>
                <view
                  class="join-btn"
                  :style="{ background: getCategoryColor(party.category), opacity: isPartyFull(party) && !party.joined ? 0.6 : 1 }"
                >
                  <text class="join-text">{{ party.joined ? '进入聊天' : (isPartyFull(party) ? '已满员' : '加入') }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="create-btn-wrapper">
        <button class="create-btn" @tap="openCreateModal">
          <image src="/static/icons/plus.svg" mode="aspectFit" class="create-icon-svg" />
          <text class="create-text">发起{{ currentCategoryLabel }}局</text>
        </button>
      </view>
    </view>

    <view v-else-if="view === 'chat'" class="chat-screen">
      <PageHeader :title="activeParty ? activeParty.title : '组局聊天'" :showBack="true" @back="handleChatBack" />

      <view class="chat-action-bar">
        <text class="report-link" @tap="reportParty(activeParty)">举报组局</text>
        <text v-if="activeParty && activeParty.hostUserId" class="report-link" @tap="reportUser(activeParty.hostUserId)">举报发起人</text>
      </view>

      <scroll-view class="chat-content" scroll-y :scroll-into-view="chatScrollTo">
        <view
          v-for="msg in messages"
          :key="msg.id"
          :id="'msg-' + msg.id"
          class="message-item"
          :class="{ 'message-me': msg.sender === 'me', 'message-system': msg.sender === 'system' }"
        >
          <view v-if="msg.sender !== 'me' && msg.sender !== 'system'" class="message-avatar"></view>
          <view class="message-column">
            <view class="message-bubble" :class="'bubble-' + msg.sender">
              <text v-if="msg.sender === 'other' && msg.senderName" class="message-sender">{{ msg.senderName }}</text>
              <text class="message-text">{{ msg.text }}</text>
            </view>
            <view v-if="msg.sender === 'other'" class="message-actions">
              <text class="report-link" @tap="reportMessage(msg)">举报消息</text>
              <text v-if="msg.senderUserId" class="report-link" @tap="reportUser(msg.senderUserId)">举报用户</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="chat-input-area">
        <input
          class="chat-input"
          v-model="chatInput"
          placeholder="发送消息..."
          @confirm="sendMessage"
        />
        <button class="send-btn" @tap="sendMessage" :disabled="sendingMessage || !chatInput.trim()">
          <image src="/static/icons/send.svg" mode="aspectFit" class="send-icon-svg" />
        </button>
      </view>
    </view>

    <view v-if="showCreateModal" class="modal-overlay" @tap="showCreateModal = false">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">发起新组局</text>
          <text class="modal-subtitle">把需求说清楚，搭子会来得更快。</text>
          <view class="modal-close" @tap="showCreateModal = false">
            <image src="/static/icons/close.svg" mode="aspectFit" class="close-icon-svg" />
          </view>
        </view>

        <view class="modal-body">
          <view class="form-group">
            <text class="form-label">类型</text>
            <view class="category-selector">
              <view
                v-for="cat in categories"
                :key="cat.id"
                class="category-option"
                :class="{ active: newParty.category === cat.id }"
                :style="newParty.category === cat.id ? { background: cat.color, color: '#fff' } : {}"
                @tap="newParty.category = cat.id"
              >
                <image :src="cat.iconSvg" mode="aspectFit" class="category-option-icon" />
                <text class="category-label">{{ cat.label }}</text>
              </view>
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">标题</text>
            <input class="form-input" v-model="newParty.title" :placeholder="getPlaceholder('title')" />
          </view>

          <view class="form-group">
            <text class="form-label">{{ newParty.category === 'chat' ? '地点 / 平台' : '地点' }}</text>
            <input class="form-input" v-model="newParty.location" :placeholder="getPlaceholder('location')" />
          </view>

          <view class="form-group">
            <text class="form-label">时间</text>
            <input class="form-input" v-model="newParty.time" placeholder="例如：周五 19:00" />
          </view>

          <view class="form-group">
            <text class="form-label">一句话说明</text>
            <input class="form-input" v-model="newParty.description" placeholder="让大家知道你想找什么样的搭子" />
          </view>

          <view class="form-group">
            <text class="form-label">人数限制（2-{{ maxPeopleLimit }} 人）</text>
            <view class="people-selector">
              <text class="people-value">{{ newParty.maxPeople }} 人</text>
              <view class="people-controls">
                <button class="control-btn" @tap="adjustPeople(-1)">-</button>
                <button class="control-btn" @tap="adjustPeople(1)">+</button>
              </view>
            </view>
          </view>
        </view>

        <button class="submit-btn" @tap="createParty" :disabled="creatingParty">
          {{ creatingParty ? '发布中...' : '立即发布' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import PageHeader from "@/components/PageHeader.vue";
import {
  listDiningBuddyParties,
  createDiningBuddyParty,
  joinDiningBuddyParty,
  fetchDiningBuddyMessages,
  sendDiningBuddyMessage,
  createDiningBuddyReport,
} from "@/shared-ui/api.js";
import { isRuntimeRouteEnabled, loadPlatformRuntimeSettings } from "@/shared-ui/platform-runtime.js";
import { createDiningBuddyPage } from "./dining-buddy.js";

export default createDiningBuddyPage({
  PageHeader,
  createDiningBuddyParty,
  createDiningBuddyReport,
  fetchDiningBuddyMessages,
  isRuntimeRouteEnabled,
  joinDiningBuddyParty,
  listDiningBuddyParties,
  loadPlatformRuntimeSettings,
  sendDiningBuddyMessage,
});
</script>

<style scoped lang="scss" src="./dining-buddy-page.scss"></style>
