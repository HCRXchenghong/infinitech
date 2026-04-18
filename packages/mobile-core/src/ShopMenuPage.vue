<template>
  <view class="page menu-page">
    <!-- 顶部导航栏 -->
    <view class="menu-nav">
      <view class="back-btn" @tap="goBack">
        <text>‹</text>
      </view>
      <view class="shop-brief">
        <view class="mini-logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="#FFF7ED"/>
            <path d="M9 22V12H15V22" stroke="#F97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </view>
        <text class="shop-name">{{ shop.name }}</text>
      </view>
      <view class="nav-right">
        <image class="search-icon" src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%239ca3af%22%3E%3Cpath%20d%3D%22M15.5%2014h-.79l-.28-.27A6.471%206.471%200%200%200%2016%209.5%206.5%206.5%200%201%200%209.5%2016c1.61%200%203.09-.59%204.23-1.57l.27.28v.79l5%204.99L20.49%2019l-4.99-5zm-6%200C7.01%2014%205%2011.99%205%209.5S7.01%205%209.5%205%2014%207.01%2014%209.5%2011.99%2014%209.5%2014z%22%2F%3E%3C%2Fsvg%3E" mode="aspectFit" />
      </view>
    </view>

    <!-- 主体内容区 -->
    <view class="menu-body">
      <!-- 左侧分类导航 -->
      <scroll-view scroll-y class="category-sidebar">
        <view
          v-for="(cat, index) in categories"
          :key="cat.id"
          class="category-item"
          :class="{ active: activeIndex === index }"
          @tap="switchCategory(index)"
        >
          <view v-if="activeIndex === index" class="active-indicator"></view>
          <text class="cat-name">{{ cat.name }}</text>
          <view v-if="getCategoryCount(cat.id) > 0" class="cat-badge">
            {{ getCategoryCount(cat.id) }}
          </view>
        </view>
      </scroll-view>

      <!-- 右侧商品列表 -->
      <scroll-view
        scroll-y
        class="product-list"
        :scroll-into-view="scrollToId"
        @scroll="onProductScroll"
      >
        <view
          v-for="(cat, catIndex) in categories"
          :key="cat.id"
          :id="'cat-' + cat.id"
          class="product-section"
        >
          <view class="section-header">
            <text class="section-title">{{ cat.name }}</text>
            <text v-if="cat.desc" class="section-desc">{{ cat.desc }}</text>
          </view>

          <view
            v-for="item in getProductsByCategory(cat.id)"
            :key="item.id"
            class="product-item"
            @tap="openProductDetail(item)"
          >
            <!-- 商品图片 -->
            <view class="product-image-wrap">
              <image class="product-image" :src="item.image" mode="aspectFill" />
              <view v-if="item.tag" class="product-tag">{{ item.tag }}</view>
            </view>

            <!-- 商品信息 -->
            <view class="product-info">
              <text class="product-name">{{ item.name }}</text>
              <text v-if="item.desc" class="product-desc">{{ item.desc }}</text>

              <!-- 销量和好评 -->
              <view class="product-meta">
                <text>月售{{ item.sales }}</text>
                <text v-if="item.likeRate" class="like-rate">好评{{ item.likeRate }}%</text>
              </view>

              <!-- 价格和操作 -->
              <view class="product-footer">
                <view class="price-area">
                  <text class="price-symbol">¥</text>
                  <text class="price">{{ item.price }}</text>
                  <text v-if="item.originalPrice" class="original-price">
                    ¥{{ item.originalPrice }}
                  </text>
                </view>

                <!-- 加减按钮 -->
                <view class="cart-actions" @tap.stop>
                  <view
                    v-if="getItemCount(item.id) > 0"
                    class="minus-btn"
                    @tap.stop="updateCart(item, -1)"
                  >
                    <text>−</text>
                  </view>
                  <text v-if="getItemCount(item.id) > 0" class="item-count">
                    {{ getItemCount(item.id) }}
                  </text>
                  <view class="plus-btn" @tap.stop="updateCart(item, 1)">
                    <text>+</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="list-bottom"></view>
      </scroll-view>
    </view>

    <!-- 底部购物车栏 -->
    <view class="cart-bar" :class="{ 'has-items': totalCount > 0 }">
      <view class="cart-left" @tap="toggleCartPopup">
        <view class="cart-icon-wrap" :class="{ active: totalCount > 0 }">
          <image 
            class="cart-icon" 
            src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M9%202H7a2%202%200%200%200-2%202v14a2%202%200%200%200%202%202h10a2%202%200%200%200%202-2V4a2%202%200%200%200-2-2h-2%22%2F%3E%3Cpath%20d%3D%22M9%202a2%202%200%200%201%202%202h2a2%202%200%200%201%202%202%22%2F%3E%3Cpath%20d%3D%22M9%2010h6M9%2014h6%22%2F%3E%3C%2Fsvg%3E" 
            mode="aspectFit"
          />
          <view v-if="totalCount > 0" class="cart-badge">{{ totalCount > 99 ? '99+' : totalCount }}</view>
        </view>
        <view class="cart-info">
          <text v-if="totalPrice > 0" class="cart-total">¥{{ totalPrice.toFixed(2) }}</text>
          <text v-else class="cart-empty">未选购商品</text>
          <text class="delivery-fee">另需配送费 ¥{{ shop.deliveryPrice || 0 }}</text>
        </view>
      </view>

      <button
        class="checkout-btn"
        :class="{ disabled: totalPrice < (shop.minPrice || 0) }"
        :disabled="totalPrice < (shop.minPrice || 0)"
        @tap="handleCheckout"
      >
        <text v-if="totalPrice >= (shop.minPrice || 0)">去结算</text>
        <text v-else>¥{{ shop.minPrice || 0 }}起送</text>
      </button>
    </view>

    <!-- 购物车弹窗 -->
    <CartModal
      :show="showCartModal"
      :cartItems="cartItems"
      :totalPrice="totalPrice"
      @close="showCartModal = false"
      @plus="handleCartPlus"
      @minus="handleCartMinus"
      @clear="handleCartClear"
      @checkout="handleCheckout"
    />
  </view>
</template>

<script>
import { fetchShopDetail, fetchCategories, fetchProducts, fetchBanners } from '@/shared-ui/api.js'
import CartModal from '@/components/CartModal.vue'

export default {
  components: {
    CartModal
  },
  data() {
    return {
      shop: {},
      categories: [],
      products: [],
      banners: [],
      activeIndex: 0,
      scrollToId: '',
      cart: {},
      updateTimer: null,
      showCartModal: false,
      loading: true
    }
  },
  computed: {
    totalCount() {
      return Object.values(this.cart).reduce((sum, count) => sum + count, 0)
    },
    totalPrice() {
      let sum = 0
      Object.keys(this.cart).forEach(id => {
        const product = this.products.find(p => String(p.id) === String(id))
        if (product) {
          sum += product.price * this.cart[id]
        }
      })
      return sum
    },
    cartItems() {
      const items = []
      Object.keys(this.cart).forEach(id => {
        const product = this.products.find(p => String(p.id) === String(id))
        if (product && this.cart[id] > 0) {
          items.push({
            ...product,
            count: this.cart[id]
          })
        }
      })
      return items
    }
  },
  async onLoad(query) {
    try {
      const id = String((query && query.id) || '').trim()
      if (!id) {
        uni.showToast({ title: '参数错误', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 1500)
        return
      }

      this.loading = true
      uni.showLoading({ title: '加载中...' })

      // 并行加载商家信息、分类、商品和轮播图
      const [shopData, categoriesData, productsData, bannersData] = await Promise.all([
        fetchShopDetail(id).catch(err => {
          console.error('加载商家信息失败:', err)
          return null
        }),
        fetchCategories(id).catch(err => {
          console.error('加载分类失败:', err)
          return []
        }),
        fetchProducts(id).catch(err => {
          console.error('加载商品失败:', err)
          return []
        }),
        fetchBanners(id).catch(err => {
          console.error('加载轮播图失败:', err)
          return []
        })
      ])

      if (!shopData) {
        uni.hideLoading()
        uni.showToast({ title: '商家不存在', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 1500)
        return
      }

      this.shop = shopData
      this.categories = Array.isArray(categoriesData) ? categoriesData : []
      this.products = Array.isArray(productsData) ? productsData : []
      this.banners = Array.isArray(bannersData) ? bannersData : []
      this.loadCart()

      uni.hideLoading()
      this.loading = false
    } catch (e) {
      console.error('加载菜单失败:', e)
      uni.hideLoading()
      this.loading = false
      uni.showToast({ title: '加载失败', icon: 'none' })
    }
  },
  onShow() {
    this.loadCart()
    uni.$off('cartUpdated', this.onCartUpdated)
    uni.$on('cartUpdated', this.onCartUpdated)
  },
  onUnload() {
    uni.$off('cartUpdated', this.onCartUpdated)
    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
      this.updateTimer = null
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },

    getProductsByCategory(categoryId) {
      // 根据categoryId过滤商品
      return this.products.filter(p => String(p.categoryId) === String(categoryId))
    },

    getCategoryCount(categoryId) {
      let count = 0
      const products = this.getProductsByCategory(categoryId)
      products.forEach(p => {
        count += this.cart[p.id] || 0
      })
      return count
    },

    getItemCount(productId) {
      return this.cart[productId] || 0
    },

    switchCategory(index) {
      this.activeIndex = index
      const cat = this.categories[index]
      this.scrollToId = 'cat-' + cat.id
    },

    onProductScroll(e) {
      // 可以根据滚动位置更新左侧分类高亮
    },

    loadCart() {
      try {
        const cartStr = uni.getStorageSync(`cart_${this.shop.id}`) || '{}'
        this.cart = JSON.parse(cartStr)
      } catch (e) {
        this.cart = {}
      }
    },
    saveCart() {
      if (this.updateTimer) {
        clearTimeout(this.updateTimer)
      }
      this.updateTimer = setTimeout(() => {
        try {
          uni.setStorageSync(`cart_${this.shop.id}`, JSON.stringify(this.cart))
        } catch (e) {
          console.error('保存购物车失败:', e)
        }
      }, 300)
    },
    onCartUpdated(data) {
      if (data && String(data.shopId) === String(this.shop.id)) {
        this.loadCart()
      }
    },
    updateCart(item, delta) {
      if (uni.getStorageSync('authMode') !== 'user') {
        uni.showToast({ title: '请先登录后下单', icon: 'none' })
        uni.navigateTo({ url: '/pages/auth/login/index' })
        return
      }
      try {
        const current = this.cart[item.id] || 0
        const next = current + delta
        if (next <= 0) {
          const copy = { ...this.cart }
          delete copy[item.id]
          this.cart = copy
        } else {
          this.cart = { ...this.cart, [item.id]: next }
        }
        this.saveCart()
      } catch (e) {
        console.error('更新购物车失败:', e)
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    openProductDetail(item) {
      uni.navigateTo({
        url: `/pages/product/popup-detail/index?id=${item.id}&shopId=${this.shop.id}`
      })
    },
    toggleCartPopup() {
      if (this.totalCount > 0) {
        if (uni.getStorageSync('authMode') !== 'user') {
          uni.showToast({ title: '请先登录后下单', icon: 'none' })
          uni.navigateTo({ url: '/pages/auth/login/index' })
          return
        }
        this.showCartModal = true
      }
    },
    handleCartPlus(item) {
      this.updateCart(item, 1)
    },
    handleCartMinus(item) {
      this.updateCart(item, -1)
      if (this.totalCount === 0) {
        this.showCartModal = false
      }
    },
    handleCartClear() {
      this.cart = {}
      this.saveCart()
      this.showCartModal = false
      uni.$emit('cartUpdated', { shopId: this.shop.id })
    },

    handleCheckout() {
      if (uni.getStorageSync('authMode') !== 'user') {
        uni.showToast({ title: '请先登录后下单', icon: 'none' })
        uni.navigateTo({ url: '/pages/auth/login/index' })
        return
      }
      if (this.totalCount === 0 || this.totalPrice < (this.shop.minPrice || 0)) {
        uni.showToast({ title: `¥${this.shop.minPrice || 0}起送`, icon: 'none' })
        return
      }
      try {
        const cartStr = encodeURIComponent(JSON.stringify(this.cart))
        uni.navigateTo({
          url: '/pages/order/confirm/index?shopId=' + this.shop.id + '&cart=' + cartStr
        })
      } catch (e) {
        console.error('跳转结算失败:', e)
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped lang="scss" src="./shop-menu-page.scss"></style>
