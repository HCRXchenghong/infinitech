<template>
    <view class="page">
    <view class="header">
      <text class="shop-name">{{ currentShopName }}</text>
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
              <text class="meta">库存 {{ displayMetric(item.stock) }} · 月售 {{ displayMetric(item.monthlySales) }}</text>
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

<script lang="ts">
import { defineComponent } from 'vue'
import { useMerchantMenuPage } from '@/shared-ui/merchantMenuPage'

export default defineComponent({
  setup() {
    return useMerchantMenuPage()
  },
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
