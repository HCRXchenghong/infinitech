<template>
  <view class="featured-section">
    <view class="section-header">
      <text class="section-title">今日推荐</text>
      <view class="see-more" @tap.stop="handleMore" @click.stop="handleMore">
        <text>查看全部</text>
        <text class="arrow">></text>
      </view>
    </view>
    <scroll-view scroll-x class="featured-scroll" @scrolltolower="handleMore" lower-threshold="50">
      <view class="featured-list">
        <view
          v-for="item in products"
          :key="item.id"
          class="featured-card"
          @tap.stop="handleTap(item)"
          @click.stop="handleTap(item)"
        >
          <image class="featured-image" :src="item.image" mode="aspectFill" />
          <view v-if="item.isPromoted" class="promote-badge">
            <text>{{ item.promoteLabel || '推广' }}</text>
          </view>
          <view v-else-if="item.tag" class="featured-tag">
            <text>{{ item.tag }}</text>
          </view>
          <view class="featured-info">
            <text class="featured-name">{{ item.name }}</text>
            <text class="featured-shop">{{ item.shopName }}</text>
            <view class="featured-price-row">
              <text class="featured-price">¥{{ formatPrice(item.price) }}</text>
            </view>
          </view>
        </view>
        <view class="featured-card see-more-card" @tap.stop="handleMore" @click.stop="handleMore">
          <view class="see-more-content">
            <text class="circle-icon">+</text>
            <text class="text">查看更多</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  props: {
    products: {
      type: Array,
      required: true,
    },
  },
  methods: {
    formatPrice(value) {
      const num = Number(value || 0)
      return Number.isInteger(num) ? String(num) : num.toFixed(1)
    },
    handleTap(item) {
      this.$emit('product-tap', item)
    },
    handleMore() {
      this.$emit('more')
    },
  },
}
</script>

<style scoped lang="scss">
.featured-section {
  margin: 12px 12px 0;
  padding: 16px;
  background: #fff;
  border-radius: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 800;
  color: #111827;
  line-height: 1;
}

.see-more {
  font-size: 12px;
  color: #6b7280;
  display: flex;
  align-items: center;
  user-select: none;
}

.arrow {
  margin-left: 4px;
}

.featured-scroll {
  width: 100%;
  white-space: nowrap;
}

.featured-list {
  display: inline-flex;
  padding-bottom: 4px;
}

.featured-card {
  width: 110px;
  margin-right: 10px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.02);
  display: inline-block;
  vertical-align: top;
  position: relative;
}

.featured-image {
  width: 110px;
  height: 80px;
  background: #f3f4f6;
}

.featured-tag,
.promote-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.featured-tag {
  background: #ef4444;
}

.promote-badge {
  background: linear-gradient(135deg, #f97316, #ea580c);
}

.featured-info {
  padding: 8px 10px 10px;
}

.featured-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.featured-shop {
  font-size: 10px;
  color: #999;
  margin-bottom: 6px;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.featured-price-row {
  display: flex;
  align-items: baseline;
}

.featured-price {
  color: #ff4d4f;
  font-size: 16px;
  font-weight: 700;
}

.see-more-card {
  height: 136px;
  background: #f9fafb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #e5e7eb;
  box-shadow: none;
}

.see-more-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.circle-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-bottom: 8px;
  font-weight: 700;
}

.see-more-card .text {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}
</style>
