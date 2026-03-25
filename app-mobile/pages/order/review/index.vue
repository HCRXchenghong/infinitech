<template>
  <view class="page review-page">
    <!-- 顶部导航栏 -->
    <view class="page-header">
      <view class="nav-left" @tap="back">
        <image src="/static/icons/arrow-left.svg" mode="aspectFit" class="nav-icon" />
      </view>
      <view class="nav-title">
        <text>评价订单</text>
      </view>
      <view class="nav-right" />
    </view>

    <scroll-view scroll-y class="scroll-content">
      <!-- 商家信息 -->
      <view class="shop-section">
        <image
          :src="order.shopLogo || '/static/images/default-shop.svg'"
          mode="aspectFill"
          class="shop-avatar"
        />
        <view class="shop-text">
          <text class="shop-name">{{ order.shopName || '商家' }}</text>
          <text class="order-time">{{ order.time || '' }}</text>
        </view>
        <view class="contact-shop-btn" @tap="handleContactShop">
          <image
            class="message-icon"
            src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%230095ff%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M21%2015a2%202%200%200%201-2%202H7l-4%204V5a2%202%200%200%201%202-2h14a2%202%200%200%201%202%202z%22%2F%3E%3C%2Fsvg%3E"
            mode="aspectFit"
          />
        </view>
      </view>

      <!-- 商家评价 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">商家评价</text>
          <view class="stars-row">
            <view
              v-for="star in 5"
              :key="star"
              class="star-btn"
              :class="{ active: star <= shopRating }"
              @tap="shopRating = star"
            >
              <text class="star">★</text>
            </view>
          </view>
        </view>

        <!-- 评价内容 -->
        <view class="comment-box">
          <textarea
            v-model="shopReview.content"
            class="comment-input"
            placeholder="说说你的用餐体验，帮助其他小伙伴~"
            maxlength="200"
            :auto-height="true"
          />
          <view class="char-limit">{{ shopReview.content.length }}/200</view>
        </view>

        <!-- 图片上传 -->
        <view class="photos-box">
          <view
            v-for="(img, idx) in shopReview.images"
            :key="idx"
            class="photo-item"
          >
            <image :src="img" mode="aspectFill" class="photo-img" />
            <view class="photo-remove" @tap="removeShopImage(idx)">×</view>
          </view>
          <view
            v-if="shopReview.images.length < 3"
            class="photo-add"
            @tap="selectShopImage"
          >
            <image
              class="add-icon"
              src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M21%2015v4a2%202%200%200%201-2%202H5a2%202%200%200%201-2-2v-4%22%2F%3E%3Cpolyline%20points%3D%2217%208%2012%203%207%208%22%2F%3E%3Cline%20x1%3D%2212%22%20y1%3D%223%22%20x2%3D%2212%22%20y2%3D%2215%22%2F%3E%3C%2Fsvg%3E"
              mode="aspectFit"
            />
            <text class="add-text">上传图片</text>
          </view>
        </view>
      </view>

      <!-- 骑手评价 -->
      <view v-if="hasRider" class="section">
        <view class="section-header">
          <text class="section-title">骑手评价</text>
          <view class="stars-row">
            <view
              v-for="star in 5"
              :key="star"
              class="star-btn"
              :class="{ active: star <= riderRating }"
              @tap="riderRating = star"
            >
              <text class="star">★</text>
            </view>
          </view>
        </view>

        <!-- 评价内容 -->
        <view class="comment-box">
          <textarea
            v-model="riderReview.content"
            class="comment-input"
            placeholder="说说你对配送服务的感受~"
            maxlength="200"
            :auto-height="true"
          />
          <view class="char-limit">{{ riderReview.content.length }}/200</view>
        </view>

        <!-- 图片上传 -->
        <view class="photos-box">
          <view
            v-for="(img, idx) in riderReview.images"
            :key="idx"
            class="photo-item"
          >
            <image :src="img" mode="aspectFill" class="photo-img" />
            <view class="photo-remove" @tap="removeRiderImage(idx)">×</view>
          </view>
          <view
            v-if="riderReview.images.length < 3"
            class="photo-add"
            @tap="selectRiderImage"
          >
            <image
              class="add-icon"
              src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M21%2015v4a2%202%200%200%201-2%202H5a2%202%200%200%201-2-2v-4%22%2F%3E%3Cpolyline%20points%3D%2217%208%2012%203%207%208%22%2F%3E%3Cline%20x1%3D%2212%22%20y1%3D%223%22%20x2%3D%2212%22%20y2%3D%2215%22%2F%3E%3C%2Fsvg%3E"
              mode="aspectFit"
            />
            <text class="add-text">上传图片</text>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 提交按钮 -->
    <view class="submit-bar">
      <button class="submit-btn" @tap="handleSubmit">提交评价</button>
    </view>
  </view>
</template>

<script>
import { fetchOrderDetail, request } from '@/shared-ui/api.js'

export default {
  data() {
    return {
      order: {
        id: '',
        shopName: '',
        shopLogo: '',
        time: '',
        shopId: '',
        userId: '',
        riderId: '',
        isReviewed: false
      },
      shopRating: 5,
      riderRating: 5,
      shopReview: {
        content: '',
        images: []
      },
      riderReview: {
        content: '',
        images: []
      }
    }
  },
  computed: {
    hasRider() {
      const riderId = String(this.order.riderId || '').trim()
      return Boolean(riderId && riderId !== '0')
    }
  },
  onLoad(query) {
    const id = query && query.id
    if (id) {
      fetchOrderDetail(id)
        .then((data) => {
          if (data && data.id) {
            const formatted = this.formatOrderData(data)
            if (formatted.isReviewed) {
              uni.showToast({ title: '该订单已评价', icon: 'none' })
              setTimeout(() => {
                uni.navigateBack()
              }, 1200)
              return
            }
            this.order = formatted
          } else {
            uni.showToast({ title: '订单不存在', icon: 'none' })
          }
        })
        .catch((error) => {
          console.error('加载订单详情失败:', error)
          uni.showToast({ title: '加载失败', icon: 'none' })
        })
    } else {
      uni.showToast({ title: '订单ID不存在', icon: 'none' })
    }
  },
  methods: {
    formatOrderData(data) {
      const shop = data.shop || {}
      return {
        id: String(data.id || ''),
        shopId: String(data.shopId || data.shop_id || shop.id || ''),
        shopName: data.shopName || shop.name || '',
        shopLogo: data.shopLogo || shop.logo || '',
        time: data.time || data.createdAt || '',
        userId: String(data.userId || data.user_id || ''),
        riderId: String(data.riderId || data.rider_id || ''),
        isReviewed: data.isReviewed === true || data.is_reviewed === true || data.isReviewed === 1 || data.is_reviewed === 1 || data.isReviewed === '1' || data.is_reviewed === '1' || data.isReviewed === 'true' || data.is_reviewed === 'true'
      }
    },
    selectShopImage() {
      const currentImages = this.shopReview.images
      uni.chooseImage({
        count: 3 - currentImages.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.shopReview.images = currentImages.concat(res.tempFilePaths)
        }
      })
    },
    removeShopImage(idx) {
      this.shopReview.images.splice(idx, 1)
    },
    selectRiderImage() {
      const currentImages = this.riderReview.images
      uni.chooseImage({
        count: 3 - currentImages.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.riderReview.images = currentImages.concat(res.tempFilePaths)
        }
      })
    },
    removeRiderImage(idx) {
      this.riderReview.images.splice(idx, 1)
    },
    async handleSubmit() {
      if (this.shopRating === 0) {
        uni.showToast({ title: '请完成商家评价', icon: 'none' })
        return
      }
      
      if (this.hasRider && this.riderRating === 0) {
        uni.showToast({ title: '请完成骑手评价', icon: 'none' })
        return
      }

      const shopId = String(this.order.shopId || '').trim()
      if (!shopId) {
        uni.showToast({ title: '店铺信息缺失，无法提交', icon: 'none' })
        return
      }

      const orderId = String(this.order.id || '').trim()
      const profile = uni.getStorageSync('userProfile') || {}
      const rawUserId = profile.id || profile.userId || this.order.userId || profile.phone
      const userId = String(rawUserId || '').trim()
      const userName = profile.nickname || profile.name || profile.username || '匿名用户'
      const userAvatar = profile.avatar || profile.avatarUrl || ''

      const shopPayload = {
        shopId,
        orderId,
        userId,
        rating: Number(this.shopRating || 0),
        content: this.shopReview.content || '',
        images: this.shopReview.images || [],
        userName,
        userAvatar
      }

      try {
        uni.showLoading({ title: '提交中...' })
        await request({
          url: '/api/reviews',
          method: 'POST',
          data: shopPayload
        })

        const riderId = String(this.order.riderId || '').trim()
        if (riderId && riderId !== '0') {
          const riderPayload = {
            riderId,
            orderId,
            userId,
            rating: Number(this.riderRating || 0),
            content: this.riderReview.content || '',
            images: this.riderReview.images || [],
            userName,
            userAvatar
          }
          await request({
            url: '/api/rider-reviews/submit',
            method: 'POST',
            data: riderPayload
          })
        }

        if (orderId) {
          await request({
            url: `/api/orders/${orderId}/reviewed`,
            method: 'POST'
          })
        }

        uni.hideLoading()
        uni.showToast({ title: '评价提交成功', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1200)
      } catch (error) {
        uni.hideLoading()
        console.error('提交评价失败:', error)
        uni.showToast({
          title: error?.data?.error || error?.error || '评价提交失败',
          icon: 'none'
        })
      }
    },
    handleContactShop() {
      if (!this.order.shopId && !this.order.id) {
        uni.showToast({ title: '商家信息不存在', icon: 'none' })
        return
      }
      
      const shopId = this.order.shopId || this.order.id
      const shopName = this.order.shopName || '商家'
      const shopLogo = this.order.shopLogo || '/static/images/default-shop.svg'
      
      uni.navigateTo({
        url: `/pages/message/chat/index?id=${encodeURIComponent(`shop_${shopId}`)}&name=${encodeURIComponent(shopName)}&role=shop&avatar=${encodeURIComponent(shopLogo)}`
      })
    },
    back() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
