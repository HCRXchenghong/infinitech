import Vue from 'vue'
import riderOrderStore from '../../shared-ui/riderOrderStore'
import { getRiderRank, fetchRiderStats } from '../../shared-ui/api'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from '../../shared-ui/support-runtime'
import {
  findRiderRankLevel,
  getCachedPlatformRuntimeSettings,
  loadPlatformRuntimeSettings
} from '../../shared-ui/platform-runtime'
import { formatRoleId } from '../../shared-ui/utils'

const RANK_NAME_MAP: Record<number, string> = {
  1: '青铜骑士',
  2: '白银骑士',
  3: '黄金骑士',
  4: '钻石骑士',
  5: '王者骑士',
  6: '传奇骑士'
}

export default Vue.extend({
  data() {
    return {
      statusBarHeight: 44,
      isNavigating: false,
      avatarUrl: '/static/images/logo.png',
      riderName: '骑手',
      riderId: '',
      riderLevel: 1,
      rankName: '青铜骑士',
      rankLevels: getCachedPlatformRuntimeSettings().riderRankSettings?.levels || [],
      supportChatTitle: getCachedSupportRuntimeSettings().title,
      riderRating: 5,
      riderRatingCount: 0,
      onlineHours: 0,
      onTimeRate: 0,
      performance: '暂无',
      chartData: [16, 32, 64, 96, 48, 24, 40, 72]
    }
  },
  computed: {
    todayEarnings() {
      return riderOrderStore.todayEarnings
    },
    completedCount() {
      return riderOrderStore.completedCount
    },
    earningsLog() {
      return riderOrderStore.earningsLog
    }
  },
  onLoad() {
    const systemInfo = uni.getSystemInfoSync()
    this.statusBarHeight = systemInfo.statusBarHeight || 44

    const profile = uni.getStorageSync('riderProfile')
    if (profile && profile.avatar) {
      this.avatarUrl = profile.avatar
    }

    const riderId = uni.getStorageSync('riderId')
    if (riderId) {
      this.riderId = formatRoleId(riderId, 'rider')
      this.loadRiderData()
    }

    const riderName = uni.getStorageSync('riderName')
    if (riderName) {
      this.riderName = riderName
    }

    this.loadSupportRuntimeConfig()
    this.loadPlatformRuntimeConfig()
  },
  onShow() {
    const profile = uni.getStorageSync('riderProfile')
    if (profile && profile.avatar) {
      this.avatarUrl = profile.avatar
    }

    const riderId = uni.getStorageSync('riderId')
    if (riderId) {
      this.loadRiderData()
    }

    this.loadSupportRuntimeConfig()
    this.loadPlatformRuntimeConfig()
  },
  methods: {
    resolveRankName(level: number) {
      const runtimeLevel = findRiderRankLevel({
        riderRankSettings: {
          levels: Array.isArray(this.rankLevels) ? this.rankLevels : []
        }
      }, level)
      return runtimeLevel?.name || RANK_NAME_MAP[level] || RANK_NAME_MAP[1]
    },

    async loadPlatformRuntimeConfig() {
      try {
        const runtime = await loadPlatformRuntimeSettings()
        this.rankLevels = Array.isArray(runtime?.riderRankSettings?.levels) ? runtime.riderRankSettings.levels : []
        this.rankName = this.resolveRankName(Number(this.riderLevel || 1))
      } catch (error) {
        console.error('加载骑手等级 runtime 失败:', error)
        this.rankName = this.resolveRankName(Number(this.riderLevel || 1))
      }
    },

    async loadSupportRuntimeConfig() {
      const supportRuntime = await loadSupportRuntimeSettings()
      this.supportChatTitle = supportRuntime.title
    },

    async loadRiderData() {
      try {
        const [rankRes, statsRes]: any[] = await Promise.all([
          getRiderRank(),
          fetchRiderStats()
        ])

        if (rankRes && rankRes.success) {
          const level = Number(rankRes.data.level || 1)
          this.riderLevel = level
          this.riderRating = Number(rankRes.data.rating || 5)
          this.riderRatingCount = Number(rankRes.data.ratingCount || rankRes.data.rating_count || 0)
          this.rankName = this.resolveRankName(level)
        }

        if (statsRes) {
          const todayEarnings = String(statsRes.todayEarnings || statsRes.today_earnings || '0')
          const completedCount = Number(statsRes.completedCount || statsRes.completed_count || 0)

          this.onlineHours = Number(statsRes.onlineHours || 0)
          this.onTimeRate = Number(statsRes.onTimeRate || 0)
          this.performance = String(statsRes.performance || '暂无')

          riderOrderStore.todayEarnings = todayEarnings
          riderOrderStore.completedCount = completedCount
        }
      } catch (err) {
        console.error(err)
      }
    },

    withNavigateLock(callback: () => void) {
      if (this.isNavigating) return
      this.isNavigating = true
      callback()
      setTimeout(() => {
        this.isNavigating = false
      }, 300)
    },

    changeAvatar() {
      uni.navigateTo({ url: '/pages/profile/avatar-upload' })
    },

    goToPersonalInfo() {
      uni.navigateTo({ url: '/pages/profile/personal-info' })
    },

    goToWallet() {
      this.withNavigateLock(() => {
        uni.navigateTo({ url: '/pages/profile/wallet' })
      })
    },

    goToRiderHome() {
      this.withNavigateLock(() => {
        uni.navigateTo({ url: '/pages/profile/rider-home' })
      })
    },

    goToEarnings() {
      this.withNavigateLock(() => {
        uni.navigateTo({ url: '/pages/profile/earnings' })
      })
    },

    goToHistory() {
      this.withNavigateLock(() => {
        uni.navigateTo({ url: '/pages/profile/history' })
      })
    },

    goToAppeal() {
      this.withNavigateLock(() => {
        uni.navigateTo({ url: '/pages/profile/appeal' })
      })
    },

    goToService() {
      this.withNavigateLock(() => {
        uni.navigateTo({ url: '/pages/service/index' })
      })
    },

    goToSettings() {
      this.withNavigateLock(() => {
        uni.navigateTo({ url: '/pages/profile/settings' })
      })
    }
  }
})
