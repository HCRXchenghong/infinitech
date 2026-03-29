import { request, addUserFavorite, deleteUserFavorite, fetchUserFavoriteStatus, recordPhoneContactClick } from '@/shared-ui/api.js'
import { createPhoneContactHelper } from '../../../../shared/mobile-common/phone-contact.js'

const phoneContactHelper = createPhoneContactHelper({ recordPhoneContactClick })

function buildShopPhoneAuditPayload(shop = {}) {
  return {
    targetRole: 'merchant',
    targetId: String(shop.id || ''),
    targetPhone: String(shop.phone || ''),
    entryPoint: 'shop_detail',
    scene: 'shop_contact',
    pagePath: '/pages/shop/detail/index',
    metadata: {
      shopId: String(shop.id || ''),
      shopName: String(shop.name || ''),
      bizType: String(shop.bizType || shop.biz_type || ''),
    }
  }
}

export function createShopDetailState() {
  return {
    shop: {},
    activeTab: 'reviews',
    reviews: [],
    reviewTotal: 0,
    reviewGoodCount: 0,
    reviewBadCount: 0,
    reviewAvgRating: 0,
    reviewFilter: 'all',
    isCollected: false,
    favoriteLoading: false,
    loading: true,
    activeCoupons: []
  }
}

export const shopDetailComputed = {
  perCapita() {
    const value = Number(this.shop.perCapita)
    if (Number.isFinite(value) && value > 0) return value.toFixed(0)
    return '--'
  },
  reviewCount() {
    return this.reviewTotal
  },
  goodReviewCount() {
    return this.reviewGoodCount
  },
  badReviewCount() {
    return this.reviewBadCount
  },
  displayRating() {
    return this.reviewAvgRating
  },
  goodRateValue() {
    if (this.reviewTotal <= 0) return 0
    return this.reviewGoodCount / this.reviewTotal
  },
  badRateValue() {
    if (this.reviewTotal <= 0) return 0
    return this.reviewBadCount / this.reviewTotal
  },
  goodRateBarWidth() {
    const width = Math.max(0, Math.min(100, Math.round(this.goodRateValue * 100)))
    return width + '%'
  },
  badRateBarWidth() {
    const width = Math.max(0, Math.min(100, Math.round(this.badRateValue * 100)))
    return width + '%'
  },
  goodRateText() {
    return `${Math.round(this.goodRateValue * 100)}%`
  },
  badRateText() {
    return `${Math.round(this.badRateValue * 100)}%`
  },
  filteredReviews() {
    if (this.reviewFilter === 'good') return this.reviews.filter(r => r.rating >= 4)
    if (this.reviewFilter === 'bad') return this.reviews.filter(r => r.rating < 3)
    if (this.reviewFilter === 'latest') {
      return [...this.reviews]
        .sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')))
        .slice(0, 10)
    }
    return this.reviews
  }
}

export const shopDetailMethods = {
  getCurrentUserId() {
    const profile = uni.getStorageSync('userProfile') || {}
    const raw = profile.id || profile.userId
    return String(raw || '').trim()
  },
  async loadFavoriteStatus(shopId) {
    const userId = this.getCurrentUserId()
    if (!userId || !shopId) {
      this.isCollected = false
      return
    }

    try {
      const res = await fetchUserFavoriteStatus(userId, shopId)
      const payload = res && res.data ? res.data : (res || {})
      this.isCollected = Boolean(payload.isFavorite || payload.isCollected || payload.isFavorited)
    } catch (error) {
      console.error('加载收藏状态失败:', error)
      this.isCollected = false
    }
  },
  async loadShopDetail(id) {
    this.loading = true
    try {
      const res = await request({
        url: `/api/shops/${id}`,
        method: 'GET'
      })

      if (res && (res.id || res.data)) {
        this.shop = res.data || res

        if (!this.shop.coverImage) {
          this.shop.coverImage = '/static/images/shop-default-cover.jpg'
        }
        if (!this.shop.backgroundImage) {
          this.shop.backgroundImage = this.shop.coverImage
        }
        if (!this.shop.logo) {
          this.shop.logo = '/static/images/shop-default-logo.png'
        }
        if (this.shop.rating === null || this.shop.rating === undefined || this.shop.rating === '') {
          this.shop.rating = 0
        }
        if (!this.shop.monthlySales) {
          this.shop.monthlySales = 0
        }
        if (!this.shop.discounts) {
          this.shop.discounts = []
        }
        if (!this.shop.tags) {
          this.shop.tags = []
        }
        if (typeof this.shop.discounts === 'string') {
          try {
            this.shop.discounts = JSON.parse(this.shop.discounts)
          } catch (e) {
            this.shop.discounts = []
          }
        }
        if (typeof this.shop.tags === 'string') {
          try {
            this.shop.tags = JSON.parse(this.shop.tags)
          } catch (e) {
            this.shop.tags = []
          }
        }
        this.shop.merchantQualification =
          this.shop.merchantQualification ||
          this.shop.merchantQualificationImage ||
          this.shop.businessLicense ||
          this.shop.businessLicenseImage ||
          ''
        this.shop.foodBusinessLicense =
          this.shop.foodBusinessLicense ||
          this.shop.foodBusinessLicenseImage ||
          this.shop.foodLicense ||
          this.shop.foodLicenseImage ||
          ''
      } else {
        uni.showToast({ title: '商家不存在', icon: 'none' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      }
    } catch (err) {
      console.error('加载商家详情失败:', err)
      uni.showToast({ title: '加载失败，请重试', icon: 'none' })
    } finally {
      this.loading = false
    }
  },
  async loadReviews(id) {
    try {
      const res = await request({
        url: `/api/shops/${id}/reviews`,
        method: 'GET',
        data: {
          page: 1,
          pageSize: 20
        }
      })

      const payload = res && res.data ? res.data : (res || {})
      const list = Array.isArray(payload.list) ? payload.list : []

      this.reviewTotal = Number(payload.total || list.length || 0)
      this.reviewGoodCount = Number(payload.goodCount || list.filter(item => Number(item.rating || 0) >= 4).length || 0)
      this.reviewBadCount = Number(payload.badCount || list.filter(item => Number(item.rating || 0) < 3).length || 0)
      const apiAvgRating = Number(payload.avgRating)
      const listAvgRating = list.length > 0
        ? (list.reduce((sum, item) => sum + Number(item.rating || 0), 0) / list.length)
        : 0
      this.reviewAvgRating = Number((Number.isFinite(apiAvgRating) ? apiAvgRating : listAvgRating).toFixed(2))
      this.reviews = list.map(review => ({
        id: review.id,
        avatar: review.userAvatar || '/static/images/default-avatar.png',
        username: review.userName || '匿名用户',
        time: this.formatTime(review.created_at || review.createdAt),
        rating: Number(review.rating || 0),
        content: review.content || '',
        images: this.normalizeImages(review.images),
        reply: review.reply || ''
      }))
    } catch (err) {
      console.error('加载评价失败:', err)
      this.reviewTotal = 0
      this.reviewGoodCount = 0
      this.reviewBadCount = 0
      this.reviewAvgRating = 0
      this.reviews = []
    }
  },
  normalizeImages(images) {
    if (Array.isArray(images)) return images
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images)
        return Array.isArray(parsed) ? parsed : []
      } catch (e) {
        return images ? [images] : []
      }
    }
    return []
  },
  formatRating(value) {
    return Number(value || 0).toFixed(1)
  },
  formatTime(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    if (days < 30) return `${Math.floor(days / 7)}周前`
    if (days < 365) return `${Math.floor(days / 30)}个月前`
    return `${Math.floor(days / 365)}年前`
  },
  goBack() {
    uni.navigateBack()
  },
  goToMenu() {
    uni.navigateTo({
      url: '/pages/shop/menu/index?id=' + this.shop.id
    })
  },
  async loadActiveCoupons(shopId) {
    try {
      const res = await request({
        url: `/api/shops/${shopId}/coupons/active`,
        method: 'GET'
      })

      if (res && Array.isArray(res.data)) {
        this.activeCoupons = res.data
      }
    } catch (err) {
      console.error('加载优惠券失败:', err)
    }
  },
  async receiveCoupon(coupon) {
    try {
      const profile = uni.getStorageSync('userProfile') || {}
      const userId = profile.phone || profile.id || profile.userId
      if (!userId) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      uni.showLoading({ title: '领取中...' })

      await request({
        url: `/api/coupons/${coupon.id}/receive`,
        method: 'POST',
        data: { userId: String(userId) }
      })

      uni.hideLoading()
      uni.showToast({ title: '领取成功', icon: 'success' })
    } catch (err) {
      uni.hideLoading()
      console.error('领取优惠券失败:', err)
      uni.showToast({
        title: (err.response && err.response.data && err.response.data.error) || '领取失败',
        icon: 'none'
      })
    }
  },
  getCouponAmount(coupon) {
    if (coupon.type === 'fixed') {
      return `¥${coupon.amount.toFixed(0)}`
    } else {
      return `${(100 - coupon.amount).toFixed(0)}折`
    }
  },
  getCouponDesc(coupon) {
    if (coupon.minAmount > 0) {
      return `满${coupon.minAmount}元`
    }
    return '无门槛'
  },
  getDiscountAmount(discount) {
    const match = discount.match(/\d+/)
    return match ? match[0] : ''
  },
  getDiscountDesc(discount) {
    const match = discount.match(/减(\d+)/)
    if (match) {
      return '减' + match[1]
    }
    return discount.replace(/\d+/, '')
  },
  callPhone() {
    if (this.shop.phone) {
      phoneContactHelper.makePhoneCall(buildShopPhoneAuditPayload(this.shop)).catch(() => {
        uni.showToast({ title: '无法拨打电话，请稍后重试', icon: 'none' })
      })
    }
  },
  previewLicense(type) {
    const imageUrl = type === 'foodBusinessLicense'
      ? this.shop.foodBusinessLicense
      : this.shop.merchantQualification
    if (!imageUrl) {
      uni.showToast({ title: '暂未上传证照', icon: 'none' })
      return
    }
    uni.previewImage({
      current: imageUrl,
      urls: [imageUrl]
    })
  },
  async toggleCollect() {
    if (this.favoriteLoading) return

    const shopId = String(this.shop.id || '').trim()
    if (!shopId) return

    const userId = this.getCurrentUserId()
    if (!userId) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.favoriteLoading = true
    try {
      if (this.isCollected) {
        await deleteUserFavorite(userId, shopId)
        this.isCollected = false
        uni.showToast({ title: '已取消收藏', icon: 'none' })
      } else {
        await addUserFavorite(userId, shopId)
        this.isCollected = true
        uni.showToast({ title: '已收藏', icon: 'none' })
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      uni.showToast({ title: (error && error.error) || '操作失败', icon: 'none' })
    } finally {
      this.favoriteLoading = false
    }
  }
}
