import Vue from 'vue'
import riderOrderStore, {
  toggleOnlineStatus,
  grabOrder,
  loadAvailableOrders,
  loadRiderData
} from '../../shared-ui/riderOrderStore'
import { getCurrentLocation } from '../../shared-ui/location'
import IconHeadphones from '../../components/svg-icons/icon-headphones.vue'
import IconBell from '../../components/svg-icons/icon-bell.vue'

export default Vue.extend({
  components: {
    IconHeadphones,
    IconBell
  },
  data() {
    return {
      statusBarHeight: 44,
      headerHeight: 0,
      filterBarHeight: 0,
      layoutReady: false,
      showStationPicker: false,
      currentFilter: 0,
      filters: ['全部', '顺路单', '近距离', '高价单'],
      refreshing: false,
      isNavigating: false,
      currentLocation: '定位中...',
      showStartWorkModal: false,
      showStopWorkModal: false,
      showThanksModal: false,
      agreeTerms: false
    }
  },
  computed: {
    isOnline() {
      return riderOrderStore.isOnline
    },
    todayEarnings() {
      return riderOrderStore.todayEarnings
    },
    newOrders() {
      return riderOrderStore.newOrders
    },
    displayOrders() {
      const orders = riderOrderStore.newOrders
      if (this.currentFilter === 1) return orders.filter((o: any) => o.isRouteFriendly)
      if (this.currentFilter === 2) return orders.filter((o: any) => o.isNearDistance)
      if (this.currentFilter === 3) return orders.filter((o: any) => o.isHighPrice)
      return orders
    },
    hasUnfinishedOrders() {
      return riderOrderStore.myOrders.length > 0
    },
    filterBarStyle() {
      if (!this.layoutReady) return {}
      return {
        top: `${this.headerHeight}px`
      }
    },
    orderListStyle() {
      const topOffset = this.layoutReady
        ? this.headerHeight + this.filterBarHeight
        : 280
      return {
        marginTop: `${topOffset}px`,
        height: `calc(100vh - ${topOffset}px)`
      }
    }
  },
  onLoad() {
    const systemInfo = uni.getSystemInfoSync()
    this.statusBarHeight = systemInfo.statusBarHeight || 44
    this.startOrderCountdown()
    this.getLocation()
  },
  onReady() {
    this.measureLayout()
  },
  async onShow() {
    uni.$off('realtime:refresh:orders', this.onRealtimeOrdersRefresh)
    uni.$on('realtime:refresh:orders', this.onRealtimeOrdersRefresh)
    this.getLocation()
    // 页面展示前先从服务端同步在线状态，避免默认休息中的假象
    await loadRiderData()
    if (this.isOnline) {
      await loadAvailableOrders()
    }
  },
  async onPullDownRefresh() {
    await this.refreshOrders('page')
  },
  onUnload() {
    uni.$off('realtime:refresh:orders', this.onRealtimeOrdersRefresh)
  },
  methods: {
    onRealtimeOrdersRefresh() {
      void this.refreshOrders('scroll')
    },
    measureLayout() {
      this.$nextTick(() => {
        const query = uni.createSelectorQuery().in(this)
        query.select('.header-wrapper').boundingClientRect()
        query.select('.filter-bar').boundingClientRect()
        query.exec((res) => {
          const headerRect = res && res[0] ? res[0] : null
          const filterRect = res && res[1] ? res[1] : null
          const headerHeight = headerRect && headerRect.height ? headerRect.height : 0
          const filterHeight = filterRect && filterRect.height ? filterRect.height : 0
          if (headerHeight) this.headerHeight = headerHeight
          if (filterHeight) this.filterBarHeight = filterHeight
          this.layoutReady = headerHeight > 0
        })
      })
    },
    async handleToggleWork() {
      if (!this.isOnline) {
        this.showStartWorkModal = true
      } else {
        this.showStopWorkModal = true
      }
    },

    goService() {
      if (this.isNavigating) return
      this.isNavigating = true
      uni.navigateTo({ url: '/pages/service/index' })
      setTimeout(() => {
        this.isNavigating = false
      }, 300)
    },

    async confirmStartWork() {
      if (!this.agreeTerms) return
      this.showStartWorkModal = false
      this.agreeTerms = false
      await toggleOnlineStatus()
    },

    async confirmStopWork() {
      this.showStopWorkModal = false
      await toggleOnlineStatus()
      this.showThanksModal = true
    },

    async handleGrabOrder(order: any) {
      if (this.isNavigating) return

      uni.showLoading({ title: '抢单中...' })

      try {
        await grabOrder(order.id)
        uni.hideLoading()
        uni.showToast({ title: '抢单成功！', icon: 'success' })

        this.isNavigating = true
        setTimeout(() => {
          uni.switchTab({ url: '/pages/tasks/index' })
          setTimeout(() => { this.isNavigating = false }, 300)
        }, 500)
      } catch (err) {
        uni.hideLoading()
        uni.showToast({ title: '抢单失败', icon: 'error' })
      }
    },

    async refreshOrders(source: 'scroll' | 'page' = 'scroll') {
      if (this.refreshing) {
        if (source === 'page') {
          uni.stopPullDownRefresh()
        }
        return
      }
      this.refreshing = true
      try {
        if (this.isOnline) {
          await loadAvailableOrders()
        }
      } catch (err) {
        console.error('刷新失败:', err)
      } finally {
        this.refreshing = false
        if (source === 'page') {
          uni.stopPullDownRefresh()
        }
      }
    },

    async onRefresh() {
      await this.refreshOrders('scroll')
    },

    startOrderCountdown() {
      setInterval(() => {
        riderOrderStore.newOrders.forEach(order => {
          if (order.countdown > 0) {
            order.countdown--
          }
        })
      }, 1000)
    },

    async getLocation() {
      this.currentLocation = '定位中...'
      try {
        const { latitude, longitude, address, city, district, province } = await getCurrentLocation()
        const locationText = String(address || '').trim()
        const fallbackText = [province, city, district].filter(Boolean).join('')
        this.currentLocation =
          locationText ||
          fallbackText ||
          `当前位置 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`

        uni.setStorageSync('riderCurrentLocation', {
          lat: latitude,
          lng: longitude,
          address: locationText || fallbackText || '',
          city: city || '',
          district: district || '',
          province: province || '',
          updatedAt: Date.now()
        })
      } catch (err) {
        const cached = uni.getStorageSync('riderCurrentLocation') || {}
        const cachedAddress = String(cached.address || '').trim()
        if (cachedAddress) {
          this.currentLocation = cachedAddress
          return
        }
        const cachedLat = Number(cached.lat)
        const cachedLng = Number(cached.lng)
        if (Number.isFinite(cachedLat) && Number.isFinite(cachedLng)) {
          this.currentLocation = `当前位置 ${cachedLat.toFixed(4)}, ${cachedLng.toFixed(4)}`
          return
        }
        this.currentLocation = '定位失败'
      }
    }
  }
})
