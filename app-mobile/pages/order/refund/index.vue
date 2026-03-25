<template>
  <view class="page refund-page">
    <!-- 顶部导航栏 -->
    <view class="page-header">
      <view class="nav-left" @tap="back">
        <image src="/static/icons/arrow-left.svg" mode="aspectFit" class="nav-icon" />
      </view>
      <view class="nav-title">
        <text>申请售后</text>
      </view>
      <view class="nav-right" />
    </view>

    <scroll-view scroll-y class="scroll-content">
      <!-- 订单信息卡片 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">订单信息</text>
        </view>
        <view class="order-brief">
          <image
            :src="order.shopLogo || '/static/images/default-shop.svg'"
            mode="aspectFill"
            class="shop-logo"
          />
          <view class="order-info">
            <text class="shop-name">{{ order.shopName }}</text>
            <text class="order-time">{{ order.time }}</text>
          </view>
        </view>
      </view>

      <!-- 选择售后类型 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">售后类型</text>
        </view>
        <view class="refund-types">
          <view
            v-for="type in refundTypes"
            :key="type.value"
            class="type-item"
            :class="{ active: selectedType === type.value }"
            @tap="selectType(type.value)"
          >
            <text class="type-name">{{ type.label }}</text>
            <view v-if="selectedType === type.value" class="check-icon">✓</view>
          </view>
        </view>
      </view>

      <!-- 选择商品 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">选择商品</text>
        </view>
        <view class="product-list">
          <view
            v-for="(item, idx) in order.productList"
            :key="idx"
            class="product-item"
            :class="{ selected: selectedProducts.includes(idx) }"
            @tap="toggleProduct(idx)"
          >
            <view class="product-checkbox">
              <view v-if="selectedProducts.includes(idx)" class="checkbox-checked">✓</view>
              <view v-else class="checkbox-unchecked"></view>
            </view>
            <image
              :src="item.image || '/static/images/default-food.svg'"
              mode="aspectFill"
              class="product-image"
            />
            <view class="product-info">
              <text class="product-name">{{ item.name }}</text>
              <text class="product-spec" v-if="item.spec">{{ item.spec }}</text>
              <text class="product-price">¥{{ formatPrice(item.price) }} × {{ item.count || 1 }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 申请退款金额 -->
      <view v-if="selectedType !== 'exchange'" class="info-card">
        <view class="card-header">
          <text class="card-title">申请退款金额</text>
          <text class="card-hint">单位：元</text>
        </view>
        <view class="refund-amount-row">
          <text class="refund-amount-prefix">¥</text>
          <input
            v-model="requestedRefundAmountYuan"
            class="refund-amount-input"
            type="digit"
            maxlength="12"
            placeholder="请输入本次申请退款金额"
            @input="onRefundAmountInput"
          />
        </view>
        <text class="refund-amount-tip">提交后由平台审核，管理端可执行退款或不退款处理。</text>
      </view>

      <!-- 问题描述 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">问题描述</text>
        </view>
        <textarea
          v-model="problemDesc"
          class="problem-textarea"
          placeholder="请详细描述遇到的问题，以便我们更好地为您处理"
          maxlength="200"
          :auto-height="true"
        />
        <view class="char-count">{{ problemDesc.length }}/200</view>
      </view>

      <!-- 上传凭证 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">上传凭证（选填）</text>
          <text class="card-hint">最多上传3张图片</text>
        </view>
        <view class="upload-section">
          <view
            v-for="(img, idx) in uploadedImages"
            :key="idx"
            class="image-item"
          >
            <image :src="img" mode="aspectFill" class="uploaded-image" />
            <view class="delete-btn" @tap="deleteImage(idx)">×</view>
          </view>
          <view
            v-if="uploadedImages.length < 3"
            class="upload-btn"
            @tap="chooseImage"
          >
            <text class="upload-icon">+</text>
            <text class="upload-text">上传图片</text>
          </view>
        </view>
      </view>

      <!-- 联系方式 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">联系方式</text>
        </view>
        <view class="contact-info">
          <view class="contact-item">
            <text class="contact-label">手机号</text>
            <input
              v-model="contactPhone"
              class="contact-input"
              type="number"
              placeholder="请输入手机号"
              maxlength="11"
            />
          </view>
        </view>
      </view>

      <!-- 底部提交按钮 -->
      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- 底部提交按钮 -->
    <view class="bottom-actions">
      <button class="submit-btn" :loading="submitting" @tap="handleSubmit">提交申请</button>
    </view>

    <!-- 成功弹窗 -->
    <SuccessModal
      :show="showSuccessModal"
      title="申请已提交"
      message="您的售后申请已成功提交，我们会在1-3个工作日内处理，请耐心等待"
      @close="showSuccessModal = false"
      @confirm="handleSuccessConfirm"
    />
  </view>
</template>

<script>
import { fetchOrderDetail, createAfterSales, uploadAfterSalesEvidence } from '@/shared-ui/api.js'
import SuccessModal from '@/components/SuccessModal.vue'

export default {
  components: {
    SuccessModal
  },
  data() {
    return {
      order: {
        id: '',
        shopName: '',
        shopLogo: '',
        time: '',
        bizType: 'takeout',
        status: 'pending',
        productList: []
      },
      refundTypes: [
        { label: '仅退款', value: 'refund' },
        { label: '退款退货', value: 'refund_return' },
        { label: '换货', value: 'exchange' }
      ],
      selectedType: 'refund',
      selectedProducts: [],
      problemDesc: '',
      requestedRefundAmountYuan: '',
      uploadedImages: [],
      contactPhone: '',
      showSuccessModal: false,
      submitting: false
    }
  },
  onLoad(query) {
    const profile = uni.getStorageSync('userProfile') || {}
    if (profile.phone) {
      this.contactPhone = String(profile.phone)
    }

    const id = query && query.id
    if (!id) {
      uni.showToast({ title: '订单ID不存在', icon: 'none' })
      return
    }

    fetchOrderDetail(id)
      .then((data) => {
        if (data && data.id) {
          this.order = this.formatOrderData(data)
          if (this.order.bizType === 'groupbuy' && this.order.status === 'redeemed') {
            uni.showToast({ title: '该团购券已核销，仅商户可发起退款', icon: 'none' })
            setTimeout(() => this.back(), 1200)
            return
          }
          if (!this.requestedRefundAmountYuan && Number(this.order.totalPrice || 0) > 0) {
            this.requestedRefundAmountYuan = this.order.totalPrice.toFixed(2)
          }
          if (Array.isArray(this.order.productList)) {
            this.selectedProducts = this.order.productList.map((_, idx) => idx)
          }
          return
        }
        uni.showToast({ title: '订单不存在', icon: 'none' })
      })
      .catch((error) => {
        console.error('加载订单详情失败:', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
      })
  },
  methods: {
    normalizeBizType(bizType) {
      const value = String(bizType || '').toLowerCase()
      if (value === 'groupbuy' || value.includes('团购')) return 'groupbuy'
      return 'takeout'
    },
    parseOrderStatus(status, bizType = 'takeout') {
      const s = String(status || '').toLowerCase()
      if (bizType === 'groupbuy') {
        if (['pending_payment', 'paid_unused', 'redeemed', 'refunding', 'refunded', 'expired', 'cancelled'].includes(s)) return s
        if (s.includes('核销')) return s.includes('已') ? 'redeemed' : 'paid_unused'
        if (s.includes('退款')) return s.includes('中') ? 'refunding' : 'refunded'
        if (s.includes('过期')) return 'expired'
        return 'paid_unused'
      }
      if (['pending', 'accepted', 'delivering', 'completed', 'cancelled'].includes(s)) return s
      return 'pending'
    },
    formatOrderData(data) {
      const bizType = this.normalizeBizType(data.bizType || data.biz_type)
      const status = this.parseOrderStatus(data.status, bizType)
      let productList = []
      if (Array.isArray(data.productList)) {
        productList = data.productList
      } else if (Array.isArray(data.items)) {
        productList = data.items
      } else if (typeof data.items === 'string' && data.items.trim()) {
        try {
          const parsed = JSON.parse(data.items)
          if (Array.isArray(parsed)) {
            productList = parsed
          } else {
            productList = [{
              name: data.items,
              price: data.product_price || data.productPrice || data.price || data.total_price || 0,
              count: 1
            }]
          }
        } catch (error) {
          productList = [{
            name: data.items,
            price: data.product_price || data.productPrice || data.price || data.total_price || 0,
            count: 1
          }]
        }
      }

      return {
        id: data.id,
        shopName: data.shopName || data.shop_name || data.shop?.name || '',
        shopLogo: data.shopLogo || data.shop?.logo || '',
        time: data.time || data.createdAt || data.created_at || '',
        bizType,
        status,
        productList,
        totalPrice: Number(data.totalPrice || data.total_price || data.price || data.product_price || 0) || 0
      }
    },
    selectType(type) {
      this.selectedType = type
      if (type === 'exchange') {
        this.requestedRefundAmountYuan = ''
      } else if (!this.requestedRefundAmountYuan && Number(this.order.totalPrice || 0) > 0) {
        this.requestedRefundAmountYuan = this.order.totalPrice.toFixed(2)
      }
    },
    toggleProduct(idx) {
      const index = this.selectedProducts.indexOf(idx)
      if (index > -1) {
        this.selectedProducts.splice(index, 1)
      } else {
        this.selectedProducts.push(idx)
      }
    },
    chooseImage() {
      uni.chooseImage({
        count: 3 - this.uploadedImages.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.uploadedImages = this.uploadedImages.concat(res.tempFilePaths || [])
        }
      })
    },
    deleteImage(idx) {
      this.uploadedImages.splice(idx, 1)
    },
    formatPrice(price) {
      const value = Number(price)
      if (Number.isNaN(value)) return '0'
      return value.toFixed(2).replace(/\.00$/, '')
    },
    normalizeMoneyInput(value) {
      const raw = String(value || '').replace(/[^\d.]/g, '')
      if (!raw) return ''
      const parts = raw.split('.')
      const integerPart = parts[0] || '0'
      const decimalPart = parts.length > 1 ? parts.slice(1).join('').slice(0, 2) : ''
      return decimalPart ? `${integerPart}.${decimalPart}` : integerPart
    },
    onRefundAmountInput(event) {
      const value = event && event.detail ? event.detail.value : this.requestedRefundAmountYuan
      const normalized = this.normalizeMoneyInput(value)
      if (normalized !== this.requestedRefundAmountYuan) {
        this.requestedRefundAmountYuan = normalized
      }
    },
    yuanToFen(value) {
      const text = String(value || '').trim()
      if (!text || !/^\d+(\.\d{1,2})?$/.test(text)) return 0
      return Math.round(Number(text) * 100)
    },
    buildSelectedProducts() {
      return this.selectedProducts
        .map((index) => {
          const item = this.order.productList[index]
          if (!item) return null
          return {
            name: item.name || item.title || `商品${index + 1}`,
            spec: item.spec || item.sku || '',
            price: item.price || 0,
            count: item.count || 1
          }
        })
        .filter(Boolean)
    },
    async uploadEvidenceImages() {
      if (!Array.isArray(this.uploadedImages) || this.uploadedImages.length === 0) {
        return []
      }
      const urls = []
      for (const filePath of this.uploadedImages) {
        if (!filePath) continue
        if (/^https?:\/\//i.test(filePath)) {
          urls.push(filePath)
          continue
        }
        const uploadResult = await uploadAfterSalesEvidence(filePath)
        if (uploadResult && uploadResult.url) {
          urls.push(uploadResult.url)
        }
      }
      return urls
    },
    async handleSubmit() {
      if (this.submitting) return
      if (this.order.bizType === 'groupbuy' && this.order.status === 'redeemed') {
        uni.showToast({ title: '该团购券已核销，仅商户可发起退款', icon: 'none' })
        return
      }
      if (this.selectedProducts.length === 0) {
        uni.showToast({ title: '请选择要申请售后的商品', icon: 'none' })
        return
      }
      if (!this.problemDesc.trim()) {
        uni.showToast({ title: '请描述遇到的问题', icon: 'none' })
        return
      }
      if (!this.contactPhone || !/^1\d{10}$/.test(this.contactPhone)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
        return
      }
      const requestedRefundAmount = this.selectedType === 'exchange'
        ? 0
        : this.yuanToFen(this.requestedRefundAmountYuan)
      if (this.selectedType !== 'exchange' && requestedRefundAmount <= 0) {
        uni.showToast({ title: '请填写有效的退款金额', icon: 'none' })
        return
      }

      const profile = uni.getStorageSync('userProfile') || {}
      const userId = String(profile.phone || profile.id || profile.userId || '').trim()
      if (!userId) {
        uni.showToast({ title: '用户信息异常，请重新登录', icon: 'none' })
        return
      }
      if (!this.order.id) {
        uni.showToast({ title: '订单信息异常', icon: 'none' })
        return
      }

      this.submitting = true
      uni.showLoading({ title: '提交中...' })
      try {
        const evidenceImages = await this.uploadEvidenceImages()
        await createAfterSales({
          orderId: String(this.order.id),
          userId,
          type: this.selectedType,
          selectedProducts: this.buildSelectedProducts(),
          problemDesc: this.problemDesc.trim(),
          contactPhone: this.contactPhone,
          requestedRefundAmount,
          evidenceImages
        })
        this.showSuccessModal = true
      } catch (error) {
        console.error('提交售后申请失败:', error)
        const message = error?.data?.error || error?.error || '提交失败，请稍后重试'
        uni.showToast({ title: message, icon: 'none' })
      } finally {
        uni.hideLoading()
        this.submitting = false
      }
    },
    handleSuccessConfirm() {
      uni.switchTab({
        url: '/pages/order/list/index',
        success: () => {
          setTimeout(() => {
            uni.$emit('switchToRefundTab')
          }, 300)
        }
      })
    },
    back() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
