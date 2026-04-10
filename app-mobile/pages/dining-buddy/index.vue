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
import PageHeader from '@/components/PageHeader.vue'
import {
  listDiningBuddyParties,
  createDiningBuddyParty,
  joinDiningBuddyParty,
  fetchDiningBuddyMessages,
  sendDiningBuddyMessage,
  createDiningBuddyReport
} from '@/shared-ui/api.js'
import { isRuntimeRouteEnabled, loadPlatformRuntimeSettings } from '@/shared-ui/platform-runtime.js'

const QUIZ_STORAGE_KEY = 'diningBuddyQuizCompleted'

function pickErrorMessage(error, fallback = '操作失败，请稍后再试') {
  const payload = error && typeof error === 'object' ? error : {}
  const data = payload.data && typeof payload.data === 'object' ? payload.data : {}
  return data.error || payload.error || payload.message || fallback
}

function normalizePartyListResponse(response) {
  if (Array.isArray(response)) {
    return response
  }
  if (response && Array.isArray(response.parties)) {
    return response.parties
  }
  if (response && response.data && Array.isArray(response.data.parties)) {
    return response.data.parties
  }
  return []
}

function normalizeMessageListResponse(response) {
  if (Array.isArray(response)) {
    return response
  }
  if (response && Array.isArray(response.messages)) {
    return response.messages
  }
  if (response && response.data && Array.isArray(response.data.messages)) {
    return response.data.messages
  }
  return []
}

function createDefaultPartyForm() {
  return {
    category: 'food',
    title: '',
    location: '',
    time: '',
    description: '',
    maxPeople: 4
  }
}

export default {
  components: { PageHeader },

  data() {
    return {
      featureEnabled: true,
      diningTitle: '同频饭友',
      diningSubtitle: '约饭、聊天、学习，快速找到同频搭子。',
      defaultMaxPeople: 4,
      maxPeopleLimit: 6,
      view: 'welcome',
      activeCategory: 'food',
      showCreateModal: false,
      quizStep: 0,
      parties: [],
      activeParty: null,
      messages: [],
      chatInput: '',
      chatScrollTo: '',
      loadingParties: false,
      creatingParty: false,
      openingPartyId: '',
      sendingMessage: false,
      pollTimer: null,
      categories: [
        { id: 'chat', label: '聊天', iconSvg: '/static/icons/chat-bubble.svg', color: '#ec4899' },
        { id: 'food', label: '约饭', iconSvg: '/static/icons/food-bowl.svg', color: '#f97316' },
        { id: 'study', label: '学习', iconSvg: '/static/icons/study-book.svg', color: '#6366f1' }
      ],
      questions: [
        {
          question: '你更想先从哪种搭子开始？',
          options: [
            { text: '先找个能聊天的人', icon: '💬' },
            { text: '先约一顿饭最直接', icon: '🍜' },
            { text: '先找学习监督搭子', icon: '📚' }
          ]
        },
        {
          question: '你希望这场局有多少人？',
          options: [
            { text: '2 人就够，直接高效', icon: '🫶' },
            { text: '3-4 人，刚好不冷场', icon: '✨' },
            { text: '5-6 人，更热闹一点', icon: '🎉' }
          ]
        },
        {
          question: '如果现场节奏不一致，你更偏向？',
          options: [
            { text: '先听听大家意见', icon: '🤝' },
            { text: '商量一个折中方案', icon: '🗣️' },
            { text: '我会先把偏好说清楚', icon: '✅' }
          ]
        }
      ],
      newParty: createDefaultPartyForm()
    }
  },

  computed: {
    currentQuestion() {
      return this.questions[this.quizStep] || this.questions[0]
    },
    quizProgress() {
      return this.questions.length ? ((this.quizStep + 1) / this.questions.length) * 100 : 100
    },
    filteredParties() {
      return this.parties.filter((party) => party.category === this.activeCategory)
    },
    currentCategoryLabel() {
      const current = this.categories.find((item) => item.id === this.activeCategory)
      return current ? current.label : '约饭'
    }
  },

  onLoad() {
    this.loadRuntime()
    const quizCompleted = !!uni.getStorageSync(QUIZ_STORAGE_KEY)
    this.view = quizCompleted ? 'home' : 'welcome'
    this.loadParties()
  },

  onUnload() {
    this.stopMessagePolling()
  },

  methods: {
    async loadRuntime() {
      try {
        const runtime = await loadPlatformRuntimeSettings()
        this.featureEnabled = isRuntimeRouteEnabled(runtime, 'feature', 'dining_buddy', 'app-mobile')
        const settings = runtime.diningBuddySettings || {}
        this.diningTitle = settings.welcome_title || '同频饭友'
        this.diningSubtitle = settings.welcome_subtitle || '约饭、聊天、学习，快速找到同频搭子。'
        this.categories = Array.isArray(settings.categories)
          ? settings.categories
              .filter((item) => item && item.enabled !== false)
              .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
              .map((item) => ({
                id: item.id,
                label: item.label,
                iconSvg: item.icon,
                color: item.color
              }))
          : this.categories
        this.questions = Array.isArray(settings.questions) && settings.questions.length
          ? settings.questions
          : this.questions
        this.defaultMaxPeople = Number(settings.default_max_people || 4)
        this.maxPeopleLimit = Number(settings.max_max_people || 6)
        if (!this.categories.find((item) => item.id === this.activeCategory)) {
          this.activeCategory = (this.categories[0] && this.categories[0].id) || 'food'
        }
        this.newParty.maxPeople = this.defaultMaxPeople
        this.newParty.category = this.activeCategory
      } catch (error) {
        console.error('加载饭友 runtime 失败:', error)
      }
    },
    startQuiz() {
      if (!this.featureEnabled) {
        uni.showToast({ title: '当前服务暂未开放', icon: 'none' })
        return
      }
      this.view = 'quiz'
      this.quizStep = 0
    },

    handleQuizAnswer() {
      if (this.quizStep < this.questions.length - 1) {
        this.quizStep += 1
        return
      }
      this.completeQuiz()
    },

    completeQuiz() {
      this.view = 'matching'
      uni.setStorageSync(QUIZ_STORAGE_KEY, true)
      setTimeout(() => {
        this.view = 'home'
        this.loadParties()
      }, 1200)
    },

    switchCategory(categoryId) {
      this.activeCategory = categoryId
      this.newParty.category = categoryId
    },

    getCategoryColor(category, opacity = 1) {
      const current = this.categories.find((item) => item.id === category)
      if (!current) return '#f97316'
      if (opacity >= 1) return current.color

      const hex = current.color.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${opacity})`
    },

    isPartyFull(party) {
      return Number(party.current || 0) >= Number(party.max || 0)
    },

    async loadParties() {
      if (!this.featureEnabled) {
        this.parties = []
        return
      }
      this.loadingParties = true
      try {
        const response = await listDiningBuddyParties()
        this.parties = normalizePartyListResponse(response)
      } catch (error) {
        uni.showToast({
          title: pickErrorMessage(error, '加载组局失败'),
          icon: 'none'
        })
      } finally {
        this.loadingParties = false
      }
    },

    async joinParty(party) {
      if (!this.featureEnabled) {
        uni.showToast({ title: '当前服务暂未开放', icon: 'none' })
        return
      }
      if (!party || !party.id) {
        return
      }
      if (this.isPartyFull(party) && !party.joined) {
        uni.showToast({ title: '该组局已满员', icon: 'none' })
        return
      }
      if (this.openingPartyId === party.id) {
        return
      }

      this.openingPartyId = party.id
      uni.showLoading({ title: '进入中...' })
      try {
        const activeParty = party.joined ? party : await joinDiningBuddyParty(party.id)
        this.activeParty = activeParty
        this.view = 'chat'
        await this.loadMessages(activeParty.id)
        await this.loadParties()
        this.startMessagePolling()
      } catch (error) {
        uni.showToast({
          title: pickErrorMessage(error, '进入组局失败'),
          icon: 'none'
        })
      } finally {
        this.openingPartyId = ''
        uni.hideLoading()
      }
    },

    async loadMessages(partyId) {
      const response = await fetchDiningBuddyMessages(partyId)
      this.messages = normalizeMessageListResponse(response)
      this.scrollToLatestMessage()
    },

    async sendMessage() {
      if (!this.featureEnabled) {
        uni.showToast({ title: '当前服务暂未开放', icon: 'none' })
        return
      }
      const content = this.chatInput.trim()
      if (!content || !this.activeParty || !this.activeParty.id || this.sendingMessage) {
        return
      }

      this.sendingMessage = true
      try {
        const message = await sendDiningBuddyMessage(this.activeParty.id, { content })
        this.messages.push(message)
        this.chatInput = ''
        this.scrollToLatestMessage()
      } catch (error) {
        uni.showToast({
          title: pickErrorMessage(error, '发送失败'),
          icon: 'none'
        })
      } finally {
        this.sendingMessage = false
      }
    },

    startMessagePolling() {
      this.stopMessagePolling()
      this.pollTimer = setInterval(() => {
        if (this.view === 'chat' && this.activeParty && this.activeParty.id) {
          this.loadMessages(this.activeParty.id).catch(() => {})
        }
      }, 5000)
    },

    stopMessagePolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },

    handleChatBack() {
      this.stopMessagePolling()
      this.view = 'home'
      this.chatInput = ''
      this.chatScrollTo = ''
      this.messages = []
      this.activeParty = null
    },

    scrollToLatestMessage() {
      this.$nextTick(() => {
        const latest = this.messages[this.messages.length - 1]
        this.chatScrollTo = latest ? `msg-${latest.id}` : ''
      })
    },

    getPlaceholder(field) {
      if (field === 'title') {
        if (this.newParty.category === 'study') return '例如：考研晚自习'
        if (this.newParty.category === 'chat') return '例如：下班吐槽局'
        return '例如：火锅搭子局'
      }
      if (field === 'location') {
        if (this.newParty.category === 'chat') return '线上语音 / 咖啡店 / 公园'
        return '例如：万象城海底捞'
      }
      return ''
    },

    adjustPeople(delta) {
      const nextValue = Number(this.newParty.maxPeople || 4) + delta
      if (nextValue >= 2 && nextValue <= this.maxPeopleLimit) {
        this.newParty.maxPeople = nextValue
      }
    },

    openCreateModal() {
      if (!this.featureEnabled) {
        uni.showToast({ title: '当前服务暂未开放', icon: 'none' })
        return
      }
      this.newParty.category = this.activeCategory
      this.newParty.maxPeople = this.defaultMaxPeople
      this.showCreateModal = true
    },

    async createParty() {
      if (!this.featureEnabled) {
        uni.showToast({ title: '当前服务暂未开放', icon: 'none' })
        return
      }
      if (this.creatingParty) {
        return
      }
      if (!this.newParty.title.trim() || !this.newParty.location.trim()) {
        uni.showToast({ title: '请填写完整信息', icon: 'none' })
        return
      }

      this.creatingParty = true
      try {
        const party = await createDiningBuddyParty({
          category: this.newParty.category,
          title: this.newParty.title.trim(),
          location: this.newParty.location.trim(),
          time: this.newParty.time.trim(),
          description: this.newParty.description.trim(),
          maxPeople: this.newParty.maxPeople
        })

        this.parties.unshift(party)
        this.activeCategory = party.category || this.newParty.category
        this.showCreateModal = false
        this.newParty = createDefaultPartyForm()
        this.newParty.category = this.activeCategory
        this.newParty.maxPeople = this.defaultMaxPeople
        uni.showToast({ title: '发布成功', icon: 'success' })
      } catch (error) {
        uni.showToast({
          title: pickErrorMessage(error, '发布失败'),
          icon: 'none'
        })
      } finally {
        this.creatingParty = false
      }
    },

    async submitReport(targetType, targetId, reason, description = '') {
      try {
        await createDiningBuddyReport({
          target_type: targetType,
          target_id: String(targetId || '').trim(),
          reason,
          description
        })
        uni.showToast({ title: '举报已提交', icon: 'success' })
      } catch (error) {
        uni.showToast({
          title: pickErrorMessage(error, '举报失败'),
          icon: 'none'
        })
      }
    },

    chooseReportReason(targetType, callback) {
      const itemMap = {
        party: ['虚假组局', '骚扰引流', '不当内容'],
        message: ['辱骂骚扰', '广告引流', '不当内容'],
        user: ['骚扰他人', '欺诈风险', '违规引流']
      }
      const options = itemMap[targetType] || ['内容违规']
      uni.showActionSheet({
        itemList: options,
        success: (result) => {
          const reason = options[result.tapIndex]
          if (reason && typeof callback === 'function') {
            callback(reason)
          }
        }
      })
    },

    reportParty(party) {
      if (!party || !party.id) return
      this.chooseReportReason('party', (reason) => {
        this.submitReport('party', party.id, reason)
      })
    },

    reportMessage(message) {
      if (!message || !message.id) return
      this.chooseReportReason('message', (reason) => {
        this.submitReport('message', message.id, reason)
      })
    },

    reportUser(userId) {
      if (!userId) return
      this.chooseReportReason('user', (reason) => {
        this.submitReport('user', userId, reason)
      })
    },

    goBackHome() {
      uni.switchTab({ url: '/pages/index/index' })
    }
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
