<template>
  <view class="page">
    <view class="header">
      <text class="shop-name">{{ currentShop?.name || '未绑定店铺' }}</text>
      <text class="shop-hint">店铺切换请前往「店铺」页</text>
    </view>

    <view class="content-wrap">
      <scroll-view scroll-y class="category-side">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="category-item"
          :class="{ active: selectedCategoryId === String(cat.id) }"
          @tap="selectedCategoryId = String(cat.id)"
          @longpress="confirmDeleteCategory(cat)"
        >
          <text class="category-name">{{ cat.name }}</text>
          <text v-if="selectedCategoryId === String(cat.id)" class="active-line" />
        </view>
        <view class="category-item create-category" @tap="createNewCategory">
          <text class="category-name">+ 新增分类</text>
        </view>
      </scroll-view>

      <scroll-view scroll-y class="product-main">
        <view v-if="filteredProducts.length === 0" class="empty">该分类暂无商品</view>

        <view v-for="item in filteredProducts" :key="item.id" class="product-card">
          <view class="product-top">
            <text class="product-name">{{ item.name }}</text>
            <text class="status-tag" :class="item.isActive ? 'on' : 'off'">{{ item.isActive ? '上架中' : '已下架' }}</text>
          </view>

          <text class="product-desc">{{ item.description || '暂无描述' }}</text>

          <view class="product-bottom">
            <view>
              <text class="price">¥{{ Number(item.price || 0).toFixed(2) }}</text>
              <text class="meta">库存 {{ item.stock ?? 0 }} · 月售 {{ item.monthlySales ?? 0 }}</text>
            </view>

            <view class="actions">
              <button class="action-btn" @tap="goEditProduct(item.id)">编辑</button>
              <button class="action-btn" @tap="toggleActive(item)">{{ item.isActive ? '下架' : '上架' }}</button>
            </view>
          </view>
        </view>

        <view class="bottom-space" />
      </scroll-view>
    </view>

    <view class="fab-add" :class="{ disabled: !currentShop }" @tap="goAddProduct">
      <text class="fab-plus">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { createCategory, deleteCategory, fetchCategories, fetchProducts, updateProduct } from '@/shared-ui/api'
import { ensureMerchantShops, getCurrentShopId } from '@/shared-ui/merchantContext'

const shops = ref<any[]>([])
const currentShop = ref<any>(null)

const categories = ref<any[]>([])
const products = ref<any[]>([])
const selectedCategoryId = ref('')

const filteredProducts = computed(() => {
  if (!selectedCategoryId.value) return products.value
  return products.value.filter(
    (item: any) => String(item.categoryId || item.category_id || '') === selectedCategoryId.value
  )
})

async function loadData(force = false) {
  const context = await ensureMerchantShops(force)
  shops.value = context.shops || []

  const currentShopId = getCurrentShopId()
  currentShop.value = shops.value.find((shop: any) => String(shop.id) === String(currentShopId)) || context.currentShop || null
  if (!currentShop.value) {
    categories.value = []
    products.value = []
    return
  }

  const shopId = String(currentShop.value.id)
  const [catRes, productRes]: any[] = await Promise.all([
    fetchCategories(shopId),
    fetchProducts({ shopId }),
  ])

  categories.value = Array.isArray(catRes) ? catRes : []
  products.value = Array.isArray(productRes) ? productRes : []

  if (!selectedCategoryId.value && categories.value.length > 0) {
    selectedCategoryId.value = String(categories.value[0].id)
  }

  if (selectedCategoryId.value && !categories.value.find((cat: any) => String(cat.id) === selectedCategoryId.value)) {
    selectedCategoryId.value = categories.value[0] ? String(categories.value[0].id) : ''
  }
}

function goAddProduct() {
  if (!currentShop.value) return
  const categoryId = selectedCategoryId.value || ''
  uni.navigateTo({
    url: `/pages/menu/add?shopId=${currentShop.value.id}&categoryId=${categoryId}`,
  })
}

function goEditProduct(id: string | number) {
  uni.navigateTo({ url: `/pages/menu/edit?id=${id}` })
}

async function toggleActive(item: any) {
  try {
    await updateProduct(item.id, {
      shopId: String(currentShop.value.id || '').trim(),
      categoryId: String(item.categoryId || '').trim(),
      isActive: !item.isActive,
    })
    item.isActive = !item.isActive
    uni.showToast({ title: item.isActive ? '已上架' : '已下架', icon: 'success' })
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '操作失败', icon: 'none' })
  }
}

async function createNewCategory() {
  if (!currentShop.value) return
  uni.showModal({
    title: '新增分类',
    editable: true,
    placeholderText: '输入分类名称',
    success: async (res: any) => {
      if (!res.confirm) return
      const name = String(res.content || '').trim()
      if (!name) return
      try {
        await createCategory({
          shopId: String(currentShop.value.id || '').trim(),
          name,
          sortOrder: categories.value.length + 1,
          isActive: true,
        })
        uni.showToast({ title: '新增成功', icon: 'success' })
        await loadData(true)
      } catch (err: any) {
        uni.showToast({ title: err?.error || err?.message || '新增失败', icon: 'none' })
      }
    },
  })
}

function confirmDeleteCategory(cat: any) {
  uni.showModal({
    title: '删除分类',
    content: `确定删除分类“${cat.name}”？`,
    success: async (res: any) => {
      if (!res.confirm || !currentShop.value) return
      try {
        await deleteCategory(cat.id, currentShop.value.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        await loadData(true)
      } catch (err: any) {
        uni.showToast({ title: err?.error || err?.message || '删除失败', icon: 'none' })
      }
    },
  })
}

onShow(async () => {
  try {
    await loadData()
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '加载失败', icon: 'none' })
  }
})
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background: #f4f7fb;
  display: flex;
  flex-direction: column;
}

.header {
  background: #ffffff;
  padding: calc(var(--status-bar-height) + 16rpx) 20rpx 12rpx;
  border-bottom: 1rpx solid #eaf1f8;
}

.shop-name {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #102d49;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shop-hint {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #6d88a4;
}

.content-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
}

.category-side {
  width: 188rpx;
  background: #f0f4f9;
  border-right: 1rpx solid #e3ebf4;
}

.category-item {
  position: relative;
  padding: 24rpx 12rpx;
  text-align: center;
  color: #5b738f;
  font-size: 24rpx;

  &.active {
    background: #ffffff;
    color: #0f5fa6;
    font-weight: 600;
  }
}

.category-name {
  display: block;
}

.create-category {
  color: #0f5fa6;
  background: #e8f2fe;
  font-weight: 600;
}

.active-line {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 34rpx;
  border-radius: 0 4rpx 4rpx 0;
  background: #009bf5;
}

.product-main {
  flex: 1;
  min-height: 0;
  padding: 14rpx;
  box-sizing: border-box;
}

.empty {
  text-align: center;
  color: #8fa3b8;
  font-size: 24rpx;
  padding: 100rpx 0;
}

.product-card {
  background: #fff;
  border: 1rpx solid #e6eef7;
  border-radius: 16rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
}

.product-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-name {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  font-weight: 700;
  color: #10304d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-tag {
  margin-left: 12rpx;
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;

  &.on {
    background: #ecfdf5;
    color: #16a34a;
  }

  &.off {
    background: #f1f5f9;
    color: #64748b;
  }
}

.product-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  color: #627d99;
}

.product-bottom {
  margin-top: 12rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.price {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #102d49;
}

.meta {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #7a90a8;
}

.actions {
  display: flex;
  gap: 8rpx;
}

.action-btn {
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 10rpx;
  border: 1rpx solid #cfe2f6;
  background: #eef6ff;
  color: #0f5fa6;
  font-size: 22rpx;
  padding: 0 16rpx;
}

.bottom-space {
  height: calc(130rpx + env(safe-area-inset-bottom));
}

.fab-add {
  position: fixed;
  right: 28rpx;
  bottom: calc(146rpx + env(safe-area-inset-bottom));
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(140deg, #009bf5, #0076c3);
  box-shadow: 0 16rpx 26rpx rgba(0, 122, 201, 0.33);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;

  &.disabled {
    opacity: 0.5;
  }
}

.fab-plus {
  color: #ffffff;
  font-size: 56rpx;
  font-weight: 500;
  line-height: 1;
}
</style>
