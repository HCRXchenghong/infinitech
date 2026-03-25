import { fetchPointsBalance, fetchPointsGoods, fetchPublicVIPSettings } from '@/shared-ui/api.js'
import { DEFAULT_VIP_CENTER_SETTINGS, normalizeVIPCenterSettings } from './vip-data.js'

const EMPTY_LEVEL = {
  name: '',
  style_class: 'level-quality',
  tagline: '',
  threshold_label: '',
  threshold_value: 1,
  multiplier: 1,
  is_black_gold: false,
  benefits: []
}

function mapRewardList(list = []) {
  const colors = ['red-bg', 'blue-bg', 'green-bg', 'yellow-bg', 'orange-bg', 'black-bg']
  return Array.isArray(list)
    ? list.map((item, index) => ({
        name: item.name,
        points: item.points,
        shipFee: Number(item.ship_fee || item.shipFee || 0),
        colorClass: colors[index % colors.length],
        emoji: item.type === 'vip' ? 'VIP' : '礼',
        tag: item.tag || (item.type === 'vip' ? 'VIP' : '实物')
      }))
    : []
}

export default {
  data() {
    return {
      nickname: '美食家',
      avatarUrl: '',
      points: 0,
      activeTab: 0,
      showRulesModal: false,
      showModal: false,
      selectedBenefit: null,
      animateCard: false,
      vipConfig: normalizeVIPCenterSettings(DEFAULT_VIP_CENTER_SETTINGS),
      pointRewards: []
    }
  },

  computed: {
    vipLevels() {
      return Array.isArray(this.vipConfig.levels) ? this.vipConfig.levels : []
    },
    vipTasks() {
      return Array.isArray(this.vipConfig.growth_tasks) ? this.vipConfig.growth_tasks : []
    },
    currentLevel() {
      return this.vipLevels[this.activeTab] || this.vipLevels[0] || EMPTY_LEVEL
    },
    currentUserLevelIndex() {
      return this.resolveLevelIndex(this.points)
    },
    currentUserLevel() {
      return this.vipLevels[this.currentUserLevelIndex] || this.currentLevel
    },
    actionButtonText() {
      return this.currentUserLevel.is_black_gold
        ? this.vipConfig.premium_action_text
        : this.vipConfig.standard_action_text
    }
  },

  onLoad() {
    this.loadProfile()
    this.loadVipSettings()
    this.loadPoints()
    this.loadRewards()
  },

  onShow() {
    this.loadProfile()
    this.loadPoints()
    this.loadRewards()
  },

  methods: {
    loadProfile() {
      const profile = uni.getStorageSync('userProfile') || {}
      if (profile.nickname) this.nickname = profile.nickname
      if (profile.avatarUrl) this.avatarUrl = profile.avatarUrl
    },
    async loadVipSettings() {
      try {
        const payload = await fetchPublicVIPSettings()
        this.vipConfig = normalizeVIPCenterSettings(payload || {})
      } catch (error) {
        this.vipConfig = normalizeVIPCenterSettings(DEFAULT_VIP_CENTER_SETTINGS)
      }
      this.activeTab = this.resolveLevelIndex(this.points)
    },
    resolveLevelIndex(points) {
      const currentPoints = Number(points || 0)
      let resolved = 0
      this.vipLevels.forEach((level, index) => {
        if (currentPoints >= Number(level.threshold_value || 0)) resolved = index
      })
      return resolved
    },
    progressPercent(level) {
      const threshold = Number(level && level.threshold_value ? level.threshold_value : 0)
      if (!threshold) return '0%'
      const percent = Math.min(100, Math.max(0, (Number(this.points || 0) / threshold) * 100))
      return `${percent.toFixed(2)}%`
    },
    progressValueText(level) {
      const threshold = Number(level && level.threshold_value ? level.threshold_value : 0)
      const currentPoints = Math.max(0, Number(this.points || 0))
      if (!threshold) return `${currentPoints}/0`
      return `${Math.min(currentPoints, threshold)}/${threshold}`
    },
    nextThresholdText(index) {
      const nextLevel = this.vipLevels[index + 1]
      if (!nextLevel) return '已达当前配置的最高会员等级'
      return `下一档门槛：${nextLevel.threshold_label || `成长值 ${nextLevel.threshold_value}`}`
    },
    summarizeBenefits(benefits) {
      const list = Array.isArray(benefits) ? benefits : []
      return list.map((item) => item.title).filter(Boolean).join('、')
    },
    loadPoints() {
      const profile = uni.getStorageSync('userProfile') || {}
      const userId = profile.id || profile.userId || profile.phone || ''
      if (!userId) return
      fetchPointsBalance(userId).then((res) => {
        if (res && typeof res.balance === 'number') {
          this.points = res.balance
          uni.setStorageSync('pointsBalance', res.balance)
          if (!this.showRulesModal && !this.showModal) this.activeTab = this.resolveLevelIndex(res.balance)
        }
      }).catch(() => {})
    },
    loadRewards() {
      fetchPointsGoods().then((list) => {
        this.pointRewards = mapRewardList(list)
      }).catch(() => {
        this.pointRewards = []
      })
    },
    goBack() {
      uni.navigateBack()
    },
    showRules() {
      this.showRulesModal = true
    },
    closeRules() {
      this.showRulesModal = false
    },
    switchTab(index) {
      this.activeTab = index
      this.animateCard = true
      setTimeout(() => {
        this.animateCard = false
      }, 500)
    },
    openBenefitDetail(benefit) {
      this.selectedBenefit = benefit
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
      this.selectedBenefit = null
    },
    goPointsMall() {
      uni.navigateTo({ url: '/pages/profile/points-mall/index' })
    },
    exchangeReward() {
      this.goPointsMall()
    },
    contactService() {
      uni.navigateTo({ url: '/pages/profile/customer-service/index' })
    },
    handleTaskAction() {
      uni.switchTab({ url: '/pages/index/index' })
    },
    handleAction() {
      if (this.currentUserLevel.is_black_gold) {
        this.contactService()
        return
      }
      uni.switchTab({ url: '/pages/index/index' })
    }
  }
}
