<template>
  <view class="page reviews-page">
    <view class="summary-card">
      <view>
        <text class="summary-title">我的评价</text>
        <text class="summary-sub">累计 {{ total }} 条</text>
      </view>
      <view class="score-box">
        <text class="score-value">{{ avgRatingDisplay }}</text>
        <text class="score-label">平均分</text>
      </view>
    </view>

    <view class="filter-row">
      <view
        class="filter-chip"
        :class="{ active: activeFilter === 'all' }"
        @tap="activeFilter = 'all'"
      >
        <text>全部 {{ total }}</text>
      </view>
      <view
        class="filter-chip"
        :class="{ active: activeFilter === 'with_images' }"
        @tap="activeFilter = 'with_images'"
      >
        <text>有图 {{ withImagesCount }}</text>
      </view>
      <view
        class="filter-chip"
        :class="{ active: activeFilter === 'with_reply' }"
        @tap="activeFilter = 'with_reply'"
      >
        <text>有回复 {{ withReplyCount }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view v-if="loading && !reviews.length" class="state-wrap">
        <text class="state-text">加载中...</text>
      </view>

      <view v-else-if="!reviews.length" class="state-wrap">
        <text class="state-title">还没有评价记录</text>
        <text class="state-text">完成订单后可以在这里查看历史评价</text>
      </view>

      <view v-else class="review-list">
        <view v-if="!filteredReviews.length" class="state-wrap in-list">
          <text class="state-title">当前筛选暂无记录</text>
          <text class="state-text">切换筛选查看其他评价</text>
        </view>

        <view
          v-for="item in filteredReviews"
          :key="item.id"
          class="review-card"
        >
          <view class="shop-row" @tap="goShop(item.shopId)">
            <image
              class="shop-logo"
              :src="item.shopLogo || item.shopCoverImage || '/static/images/default-shop.svg'"
              mode="aspectFill"
            />
            <view class="shop-info">
              <text class="shop-name">{{ item.shopName || '商家' }}</text>
              <text class="review-time">{{ formatDate(item.createdAt || item.created_at) }}</text>
            </view>
            <text class="shop-enter">查看店铺 ›</text>
          </view>

          <view class="rating-row">
            <text class="rating-label">评分</text>
            <text class="rating-stars">{{ renderStars(item.rating) }}</text>
            <text class="rating-value">{{ formatRating(item.rating) }}</text>
          </view>

          <text class="review-content">{{ item.content || '未填写文字评价' }}</text>

          <view v-if="normalizeImages(item.images).length" class="image-grid">
            <image
              v-for="(img, index) in normalizeImages(item.images)"
              :key="index"
              :src="img"
              mode="aspectFill"
              class="review-image"
              @tap="previewImage(item.images, index)"
            />
          </view>

          <view v-if="item.reply" class="reply-box">
            <text class="reply-title">商家回复</text>
            <text class="reply-content">{{ item.reply }}</text>
          </view>
        </view>

        <view class="footer-tip">
          <text v-if="loadingMore">加载中...</text>
          <text v-else-if="finished">没有更多了</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchUserReviews } from '@/shared-ui/api.js'

export default {
  data() {
    return {
      userId: '',
      userIdCandidates: [],
      reviews: [],
      activeFilter: 'all',
      total: 0,
      avgRating: 0,
      page: 1,
      pageSize: 20,
      loading: false,
      loadingMore: false,
      finished: false
    }
  },
  computed: {
    avgRatingDisplay() {
      const num = Number(this.avgRating || 0)
      if (!Number.isFinite(num)) return '0.0'
      return num.toFixed(1)
    },
    withImagesCount() {
      return this.reviews.filter(item => this.hasImages(item)).length
    },
    withReplyCount() {
      return this.reviews.filter(item => this.hasReply(item)).length
    },
    filteredReviews() {
      if (this.activeFilter === 'with_images') {
        return this.reviews.filter(item => this.hasImages(item))
      }
      if (this.activeFilter === 'with_reply') {
        return this.reviews.filter(item => this.hasReply(item))
      }
      return this.reviews
    }
  },
  onShow() {
    this.initData()
  },
  methods: {
    resolveUserIds() {
      const profile = uni.getStorageSync('userProfile') || {}
      const rawCandidates = [profile.id, profile.userId, profile.phone, uni.getStorageSync('userId')]
      const normalized = rawCandidates
        .map(value => String(value || '').trim())
        .filter(value => value)

      return Array.from(new Set(normalized))
    },
    initData() {
      const userIds = this.resolveUserIds()
      if (!userIds.length) {
        this.userId = ''
        this.userIdCandidates = []
        this.reviews = []
        this.total = 0
        this.avgRating = 0
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      this.userIdCandidates = userIds
      this.userId = userIds[0]
      this.loadReviews(true)
    },
    async requestReviewPage(userId, page, pageSize) {
      const res = await fetchUserReviews(userId, { page, pageSize })
      return res && res.data ? res.data : (res || {})
    },
    applyReviewPayload(payload, reset) {
      const list = Array.isArray(payload.list) ? payload.list : []

      this.total = Number(payload.total || 0)
      this.avgRating = Number(payload.avgRating || 0)

      if (reset) {
        this.reviews = list
      } else {
        this.reviews = this.reviews.concat(list)
      }

      const loadedCount = this.reviews.length
      this.finished = list.length < this.pageSize || (this.total > 0 && loadedCount >= this.total)
      if (!this.finished) {
        this.page += 1
      }
    },
    async loadReviews(reset = false) {
      if (!this.userId) return
      if (this.loading || this.loadingMore) return
      if (!reset && this.finished) return

      if (reset) {
        this.loading = true
        this.page = 1
        this.finished = false
      } else {
        this.loadingMore = true
      }

      try {
        if (reset) {
          const candidates = this.userIdCandidates.length ? this.userIdCandidates : [this.userId]
          let selected = candidates[0]
          let selectedPayload = null
          let firstError = null

          for (let i = 0; i < candidates.length; i += 1) {
            const candidateId = candidates[i]
            try {
              const payload = await this.requestReviewPage(candidateId, this.page, this.pageSize)
              const list = Array.isArray(payload.list) ? payload.list : []
              const total = Number(payload.total || 0)

              selected = candidateId
              selectedPayload = payload

              if (list.length > 0 || total > 0 || i === candidates.length - 1) {
                break
              }
            } catch (error) {
              if (Number(error && error.statusCode) === 401) {
                throw error
              }
              if (!firstError) firstError = error
              if (i === candidates.length - 1) {
                throw firstError || error
              }
            }
          }

          this.userId = selected
          this.applyReviewPayload(selectedPayload || {}, true)
        } else {
          const payload = await this.requestReviewPage(this.userId, this.page, this.pageSize)
          this.applyReviewPayload(payload, false)
        }
      } catch (error) {
        console.error('加载评价失败:', error)
        if (reset) {
          this.reviews = []
          this.total = 0
          this.avgRating = 0
        }
        if (Number(error && error.statusCode) === 401) {
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
          return
        }
        uni.showToast({ title: (error && error.error) || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    },
    loadMore() {
      this.loadReviews(false)
    },
    normalizeImages(images) {
      if (Array.isArray(images)) return images
      if (typeof images === 'string') {
        try {
          const parsed = JSON.parse(images)
          return Array.isArray(parsed) ? parsed : []
        } catch (error) {
          return images ? [images] : []
        }
      }
      return []
    },
    hasImages(item) {
      return this.normalizeImages(item && item.images).length > 0
    },
    hasReply(item) {
      return Boolean(item && String(item.reply || '').trim())
    },
    previewImage(images, index) {
      const list = this.normalizeImages(images)
      if (!list.length) return
      uni.previewImage({ urls: list, current: list[index] || list[0] })
    },
    renderStars(rating) {
      const score = Math.max(0, Math.min(5, Math.round(Number(rating || 0))))
      return '★'.repeat(score) + '☆'.repeat(5 - score)
    },
    formatRating(value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num)) return '0.0'
      return num.toFixed(1)
    },
    formatDate(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },
    goShop(shopId) {
      const id = String(shopId || '').trim()
      if (!id) return
      uni.navigateTo({ url: `/pages/shop/detail/index?id=${id}` })
    }
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
