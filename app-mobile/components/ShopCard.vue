<template>
  <view class="shop-card" @tap.stop="handleTap" @click.stop="handleTap">
    <view class="shop-logo">
      <svg width="70" height="70" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="#FFF7ED"/>
        <path d="M9 22V12H15V22" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </view>
    <view class="shop-info">
      <view class="shop-title-row">
        <text class="shop-name">{{ shop.name }}</text>
        <view v-if="shop.isBrand" class="brand-tag">品牌</view>
      </view>
      <view class="shop-meta">
        <text class="rating">★ {{ shop.rating }}</text>
        <text class="sales">月售{{ shop.monthlySales }}</text>
        <text class="distance">{{ shop.distance }}</text>
      </view>
      <view class="shop-delivery">
        <text>¥{{ shop.minPrice }}起送</text>
        <text class="dot">·</text>
        <text>配送¥{{ shop.deliveryPrice }}</text>
        <text class="dot">·</text>
        <text class="time">{{ shop.deliveryTime }}</text>
      </view>
      <view class="shop-tags" v-if="shop.discounts && shop.discounts.length">
        <text
          v-for="(discount, idx) in shop.discounts.slice(0, 2)"
          :key="idx"
          class="discount-tag"
        >{{ discount }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    shop: {
      type: Object,
      required: true
    },
    logoColor: {
      type: String,
      default: 'linear-gradient(135deg, #f97316, #ea580c)'
    }
  },
  methods: {
    handleTap() {
      this.$emit('shop-tap', this.shop.id)
    }
  }
}
</script>

<style scoped lang="scss">
.shop-card {
  background: #fff;
  border-radius: 14px;
  padding: 14px;
  display: flex;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  user-select: none;
  transition: transform 0.2s;
}

.shop-card:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.shop-logo {
  width: 70px;
  height: 70px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFF7ED;
  flex-shrink: 0;
  pointer-events: none;
}

.shop-logo svg {
  width: 100%;
  height: 100%;
}

.shop-info {
  flex: 1;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

.shop-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.shop-name {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.brand-tag {
  background: #009bf5;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.shop-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
  display: flex;
  gap: 10px;
}

.rating {
  color: #f59e0b;
  font-weight: 600;
}

.shop-delivery {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
  display: flex;
  align-items: center;
}

.dot {
  margin: 0 6px;
  color: #d1d5db;
}

.time {
  color: #009bf5;
}

.shop-tags {
  margin-top: 8px;
  display: flex;
  gap: 6px;
}

.discount-tag {
  font-size: 10px;
  color: #ef4444;
  background: #fef2f2;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #fecaca;
}
</style>
