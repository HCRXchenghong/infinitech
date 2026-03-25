<template>
  <view class="page profile-page">
    <view class="user-header" :style="headerStyle">
      <view class="user-info" @tap="goEditProfile">
        <view class="avatar-wrapper">
          <image
            :src="avatarUrl || '/static/images/my-avatar.svg'"
            mode="aspectFill"
            class="avatar-img"
          />
        </view>

        <view class="info-wrapper">
          <view class="name-row">
            <text class="nickname">{{ displayName }}</text>
            <view v-if="isVip" class="vip-badge">
              <image src="/static/icons/crown.svg" mode="aspectFit" class="crown-icon" />
              <text>{{ vipLabel }}</text>
            </view>
          </view>
          <view class="phone-row" @tap.stop="goChangePhone">
            <text class="phone">{{ phoneMasked }}</text>
            <text class="arrow">></text>
          </view>
        </view>
      </view>
    </view>

    <view class="vip-card" @tap="goVip">
      <view class="vip-bg-circle"></view>
      <view class="vip-content">
        <view class="vip-left">
          <view class="vip-title">
            <image src="/static/icons/crown.svg" mode="aspectFit" class="vip-crown" />
            <text>会员中心</text>
          </view>
          <text class="vip-desc">本月已省 {{ savedAmountText }}</text>
        </view>
        <view class="vip-btn">
          <text>查看详情</text>
        </view>
      </view>
    </view>

    <view class="asset-tools-section">
      <view class="asset-item" @tap="goWallet">
        <view class="asset-icon">
          <image src="/static/icons/wallet.svg" mode="aspectFit" />
        </view>
        <text class="asset-label">我的资产</text>
      </view>

      <view
        v-for="item in tools"
        :key="item.label"
        class="tool-item"
        @tap="go(item.path)"
      >
        <view class="tool-icon" :class="item.colorClass">
          <image :src="item.icon" mode="aspectFit" />
        </view>
        <text class="tool-label">{{ item.label }}</text>
      </view>
    </view>

    <view class="menu-section">
      <view
        v-for="item in moreEntries"
        :key="item.label"
        class="line-card"
        @tap="go(item.path)"
      >
        <view class="line-left">
          <view class="line-icon">
            <image :src="item.icon" mode="aspectFit" />
          </view>
          <text class="line-label">{{ item.label }}</text>
        </view>
        <text class="line-arrow">></text>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchUser } from '@/shared-ui/api.js'

const DEFAULT_TOOLS = [
  { icon: '/static/icons/location.svg', label: '我的地址', path: '/pages/profile/address-list/index', colorClass: 'blue' },
  { icon: '/static/icons/star.svg', label: '我的收藏', path: '/pages/profile/favorites/index', colorClass: 'yellow' },
  { icon: '/static/icons/comment.svg', label: '我的评价', path: '/pages/profile/my-reviews/index', colorClass: 'green' }
]

const DEFAULT_MORE_ENTRIES = [
  { icon: '/static/icons/gift.svg', label: '邀请好友', path: '/pages/profile/invite-friends/index' },
  { icon: '/static/icons/briefcase.svg', label: '反馈与合作', path: '/pages/profile/cooperation/index' },
  { icon: '/static/icons/settings.svg', label: '系统设置', path: '/pages/profile/settings/index' }
]

export default {
  data() {
    return {
      nickname: '悦享e食用户',
      avatarUrl: '',
      phone: '',
      headerBg: '',
      savedAmount: 0,
      vipLabel: 'SVIP',
      isVip: false,
      tools: DEFAULT_TOOLS,
      moreEntries: DEFAULT_MORE_ENTRIES
    }
  },
  computed: {
    displayName() {
      return String(this.nickname || '').trim() || '悦享e食用户'
    },
    phoneMasked() {
      const phone = String(this.phone || '').trim()
      if (/^1\d{10}$/.test(phone)) {
        return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
      }
      return '点击绑定手机号'
    },
    savedAmountText() {
      const amount = Number(this.savedAmount || 0)
      return `¥${amount.toFixed(2)}`
    },
    headerStyle() {
      const background = String(this.headerBg || '').trim()
      if (!background) {
        return {}
      }
      if (background.startsWith('linear-gradient')) {
        return { background }
      }
      return {
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    }
  },
  onShow() {
    this.bootstrap()
  },
  methods: {
    normalizeUserPayload(payload) {
      if (payload && payload.user && typeof payload.user === 'object') {
        return payload.user
      }
      return payload && typeof payload === 'object' ? payload : {}
    },
    resolveUserId() {
      const profile = uni.getStorageSync('userProfile') || {}
      return String(profile.id || profile.userId || '').trim()
    },
    applyProfile(profile = {}) {
      const nickname = profile.nickname || profile.name || this.nickname
      const avatarUrl = profile.avatarUrl || this.avatarUrl
      const phone = profile.phone || this.phone
      const headerBg = profile.headerBg || this.headerBg
      const savedAmount = profile.savedAmount || profile.monthlySavedAmount || profile.monthSavedAmount || this.savedAmount
      const vipLabel = profile.vipLabel || profile.membershipName || profile.memberLevelName || this.vipLabel
      const isVip = Boolean(profile.isVip || profile.vip || String(vipLabel || '').trim())

      this.nickname = nickname || '悦享e食用户'
      this.avatarUrl = avatarUrl || ''
      this.phone = phone || ''
      this.headerBg = headerBg || ''
      this.savedAmount = Number(savedAmount || 0)
      this.vipLabel = String(vipLabel || 'SVIP').trim() || 'SVIP'
      this.isVip = isVip
    },
    syncLocalProfile(patch = {}) {
      const current = uni.getStorageSync('userProfile') || {}
      uni.setStorageSync('userProfile', {
        ...current,
        ...patch
      })
    },
    async bootstrap() {
      if (uni.getStorageSync('authMode') !== 'user') {
        uni.reLaunch({ url: '/pages/auth/login/index' })
        return
      }

      const localProfile = uni.getStorageSync('userProfile') || {}
      this.applyProfile(localProfile)

      const userId = this.resolveUserId()
      if (!userId) {
        return
      }

      try {
        const remoteProfile = this.normalizeUserPayload(await fetchUser(userId))
        this.syncLocalProfile(remoteProfile)
        this.applyProfile(remoteProfile)
      } catch (error) {
        console.error('加载用户资料失败:', error)
      }
    },
    go(path) {
      if (!path) return
      uni.navigateTo({ url: path })
    },
    goEditProfile() {
      uni.navigateTo({ url: '/pages/profile/edit/index' })
    },
    goChangePhone() {
      uni.navigateTo({ url: '/pages/profile/phone-change/index' })
    },
    goWallet() {
      uni.navigateTo({ url: '/pages/profile/wallet/index' })
    },
    goVip() {
      uni.navigateTo({ url: '/pages/profile/vip-center/index' })
    }
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
