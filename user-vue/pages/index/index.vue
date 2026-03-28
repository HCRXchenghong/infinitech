<template>
  <view class="page home">
    <HomeHeader
      :address="currentAddress"
      :weather="weatherText"
      :placeholder="searchPlaceholder"
      @location="showLocationModal"
      @search="goSearch"
      @weather="showWeatherModal"
    />
    <CategoryGrid :categories="categories" @category-tap="goCategory" />
    <FeaturedSection
      :products="featuredProducts"
      @product-tap="goProductDetail"
      @more="goFeatured"
    />
    <view class="shop-list">
      <HomeShopCard
        v-for="shop in shops"
        :key="shop.id"
        :shop="shop"
        @shop-tap="goShopDetail"
      />
    </view>

    <LocationModal
      :show="showLocationModalFlag"
      @close="closeLocationModal"
      @relocated="onLocationRelocated"
    />
    <WeatherModal
      :show="showWeatherModalFlag"
      :weather="weather"
      :address="currentAddress"
      @close="closeWeatherModal"
    />
  </view>
</template>

<script>
import HomeHeader from '@/components/HomeHeader.vue'
import CategoryGrid from '@/components/CategoryGrid.vue'
import FeaturedSection from '@/components/FeaturedSection.vue'
import HomeShopCard from '@/components/HomeShopCard.vue'
import LocationModal from '@/components/LocationModal.vue'
import WeatherModal from '@/components/WeatherModal.vue'
import { fetchWeather, fetchHomeFeed, fetchShopCategories } from '@/shared-ui/api.js'
import { getCurrentLocation } from '@/shared-ui/location.js'
import { buildHomeCategories } from '@/shared-ui/home-categories.js'

function normalizeSelectedAddress(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return value.address || value.detail || value.name || value.label || ''
  }
  return ''
}

function normalizeFeaturedProduct(item = {}) {
  return {
    id: item.id || item.productId,
    legacyId: item.legacyId || item.productId || '',
    name: item.name || item.productName || item.title || '',
    shopId: item.shopId || item.shop_id || '',
    shopName: item.shopName || item.shop_name || '',
    price: item.price || 0,
    originalPrice: item.originalPrice || item.original_price || 0,
    image: item.image || item.productImage || item.imageUrl || item.image_url || '/static/images/default-food.svg',
    tag: item.tag || item.label || '',
    detail: item.detail || item.description || '',
    isPromoted: Boolean(item.isPromoted),
    promoteLabel: item.promoteLabel || '',
    positionSource: item.positionSource || 'featured'
  }
}

export default {
  components: {
    HomeHeader,
    CategoryGrid,
    FeaturedSection,
    HomeShopCard,
    LocationModal,
    WeatherModal
  },
  data() {
    return {
      shops: [],
      categories: buildHomeCategories(),
      featuredProducts: [],
      currentAddress: '定位中...',
      weather: { temp: 26, condition: '多云' },
      searchPlaceholder: '一点点奶茶',
      weatherTimer: null,
      weatherRefreshMinutes: 10,
      weatherRequesting: false,
      lastWeatherRefreshAt: 0,
      showLocationModalFlag: false,
      showWeatherModalFlag: false
    }
  },
  computed: {
    weatherText() {
      return `${this.weather.temp}° ${this.weather.condition}`
    }
  },
  onLoad() {
    this.getLocation()
    this.loadCategories()
    this.loadHomeFeed()
    this.refreshWeather()
    this.ensureWeatherTimer()
  },
  onShow() {
    const selectedAddress = normalizeSelectedAddress(uni.getStorageSync('selectedAddress'))
    if (selectedAddress) {
      this.currentAddress = selectedAddress
    }
    this.ensureWeatherTimer()
    if (this.shouldRefreshWeatherNow()) {
      this.refreshWeather()
    }
    uni.$off('locationUpdated', this.onLocationUpdated)
    uni.$on('locationUpdated', this.onLocationUpdated)
    uni.$off('addressSelected', this.onAddressSelected)
    uni.$on('addressSelected', this.onAddressSelected)
  },
  onHide() {
    this.clearWeatherTimer()
  },
  onUnload() {
    uni.$off('locationUpdated', this.onLocationUpdated)
    uni.$off('addressSelected', this.onAddressSelected)
    this.clearWeatherTimer()
  },
  methods: {
    normalizeWeatherRefreshMinutes(raw) {
      const parsed = Number(raw)
      if (!Number.isFinite(parsed)) return 10
      return Math.min(1440, Math.max(1, Math.floor(parsed)))
    },
    ensureWeatherTimer() {
      if (this.weatherTimer) return
      this.resetWeatherTimer()
    },
    clearWeatherTimer() {
      if (this.weatherTimer) {
        clearInterval(this.weatherTimer)
        this.weatherTimer = null
      }
    },
    resetWeatherTimer() {
      this.clearWeatherTimer()
      const intervalMs = this.normalizeWeatherRefreshMinutes(this.weatherRefreshMinutes) * 60 * 1000
      this.weatherTimer = setInterval(() => {
        this.refreshWeather()
      }, intervalMs)
    },
    shouldRefreshWeatherNow() {
      if (!this.lastWeatherRefreshAt) return true
      const intervalMs = this.normalizeWeatherRefreshMinutes(this.weatherRefreshMinutes) * 60 * 1000
      return Date.now() - this.lastWeatherRefreshAt >= intervalMs
    },
    async refreshWeather() {
      if (this.weatherRequesting) return
      this.weatherRequesting = true
      try {
        const weather = await fetchWeather()
        if (weather) {
          this.weather = weather
          this.lastWeatherRefreshAt = Date.now()
          const rawRefreshMinutes = Number(weather.refreshIntervalMinutes)
          if (Number.isFinite(rawRefreshMinutes)) {
            const nextRefreshMinutes = this.normalizeWeatherRefreshMinutes(rawRefreshMinutes)
            if (nextRefreshMinutes !== this.weatherRefreshMinutes) {
              this.weatherRefreshMinutes = nextRefreshMinutes
              this.resetWeatherTimer()
            }
          }
        }
      } catch (_) {
      } finally {
        this.weatherRequesting = false
      }
    },
    onLocationUpdated() {
      const selectedAddress = normalizeSelectedAddress(uni.getStorageSync('selectedAddress'))
      if (selectedAddress) {
        this.currentAddress = selectedAddress
      }
    },
    onAddressSelected() {
      const selectedAddress = normalizeSelectedAddress(uni.getStorageSync('selectedAddress'))
      if (selectedAddress) {
        this.currentAddress = selectedAddress
      }
    },
    showLocationModal() {
      this.showLocationModalFlag = true
    },
    closeLocationModal() {
      this.showLocationModalFlag = false
    },
    showWeatherModal() {
      this.showWeatherModalFlag = true
    },
    closeWeatherModal() {
      this.showWeatherModalFlag = false
    },
    onLocationRelocated(address) {
      this.currentAddress = address
      this.closeLocationModal()
    },
    goCategory(cat) {
      if (!cat || !cat.name) {
        uni.showToast({ title: '分类信息错误', icon: 'none' })
        return
      }

      if (cat.name === '跑腿代购') {
        uni.navigateTo({ url: '/pages/errand/home/index' })
        return
      }
      if (cat.name === '看病买药') {
        uni.navigateTo({ url: '/pages/medicine/home' })
        return
      }
      if (cat.name === '同频饭友') {
        uni.navigateTo({ url: '/pages/dining-buddy/index' })
        return
      }
      if (cat.name === '悦享公益') {
        uni.navigateTo({ url: '/pages/charity/index' })
        return
      }

      const directMap = {
        美食: '/pages/category/food/index',
        甜点饮品: '/pages/category/dessert/index',
        超市便利: '/pages/category/market/index'
      }
      const direct = directMap[cat.name]
      if (direct) {
        uni.navigateTo({ url: direct })
        return
      }

      uni.navigateTo({ url: `/pages/category/index/index?category=${encodeURIComponent(cat.name)}` })
    },
    goProductDetail(item) {
      if (!item || !item.id) {
        uni.showToast({ title: '商品信息错误', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: `/pages/product/detail/index?id=${item.id}&shopId=${item.shopId || ''}`
      })
    },
    goFeatured() {
      uni.navigateTo({ url: '/pages/product/featured/index' })
    },
    goSearch() {
      uni.navigateTo({ url: '/pages/search/index/index' })
    },
    getLocation() {
      this.currentAddress = '定位中...'
      getCurrentLocation()
        .then((data) => {
          const { latitude, longitude, address } = data
          const displayAddress = address || `${latitude.toFixed(6)},${longitude.toFixed(6)}`
          this.currentAddress = displayAddress
          uni.setStorageSync('currentLocation', { lat: latitude, lng: longitude })
        })
        .catch((err) => {
          console.error('定位失败:', err)
          const errMsg = String((err && err.errMsg) || (err && err.message) || '')
          const isPermissionIssue =
            errMsg.includes('geolocation:12') ||
            errMsg.includes('permission') ||
            errMsg.includes('权限')
          const selectedAddress = normalizeSelectedAddress(uni.getStorageSync('selectedAddress'))
          this.currentAddress = selectedAddress || '请手动选择地址'
          uni.showToast({
            title: isPermissionIssue ? '定位权限异常，请手动选址' : '定位失败，请手动选址',
            icon: 'none'
          })
        })
    },
    async loadCategories() {
      try {
        const data = await fetchShopCategories()
        if (Array.isArray(data) && data.length > 0) {
          this.categories = buildHomeCategories(data)
          return
        }
      } catch (error) {
        console.error('加载首页分类失败:', error)
      }

      this.categories = buildHomeCategories()
    },
    async loadHomeFeed() {
      try {
        const data = await fetchHomeFeed()
        this.shops = Array.isArray(data.shops) ? data.shops : []
        this.featuredProducts = Array.isArray(data.products)
          ? data.products.map((item) => normalizeFeaturedProduct(item))
          : []
      } catch (error) {
        console.error('加载首页编排失败:', error)
      }
    },
    goShopDetail(id) {
      uni.navigateTo({ url: `/pages/shop/detail/index?id=${id}` })
    }
  }
}
</script>

<style scoped lang="scss">
.page.home {
  min-height: 100vh;
  background: #f5f6f7;
  padding-bottom: env(safe-area-inset-bottom);
}

.shop-list {
  padding: 12px;
}
</style>
