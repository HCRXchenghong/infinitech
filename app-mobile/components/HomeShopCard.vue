<template>
  <view class="shop-card" @tap="handleTap">
    <view class="shop-logo">
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
          stroke="#F97316"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="#FFF7ED"
        />
        <path
          d="M9 22V12H15V22"
          stroke="#F97316"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <view v-if="shop.isPromoted" class="promote-badge">
        <text>{{ shop.promoteLabel || '推广' }}</text>
      </view>
    </view>
    <view class="shop-info">
      <text class="shop-name">{{ shop.name }}</text>
      <view class="shop-meta">
        <text class="shop-rating">{{ formatRating(shop.rating) }}</text>
        <text class="shop-sales">月售 {{ shop.monthlySales || 0 }}</text>
      </view>
      <view class="shop-delivery">
        <text>起送 ¥{{ formatPrice(shop.minPrice) }}</text>
        <text class="divider">|</text>
        <text>配送 ¥{{ formatPrice(shop.deliveryPrice) }}</text>
        <text class="divider">|</text>
        <text class="time">{{ shop.deliveryTime || '30分钟' }}</text>
        <text class="distance">{{ shop.distance || '' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    shop: {
      type: Object,
      required: true,
    },
  },
  methods: {
    formatPrice(value) {
      const num = Number(value || 0)
      return Number.isInteger(num) ? String(num) : num.toFixed(1)
    },
    formatRating(value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num) || num <= 0) return '暂无评分'
      return `★ ${num.toFixed(1)}`
    },
    handleTap() {
      this.$emit('shop-tap', this.shop.id)
    },
  },
}
</script>

<style scoped lang="scss">
.shop-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.shop-logo {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  margin-right: 12px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff7ed;
}

.shop-logo svg {
  width: 100%;
  height: 100%;
}

.promote-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #fff;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}

.shop-info {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.shop-name {
  font-size: 16px;
  font-weight: 700;
  color: #111;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shop-meta {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #666;
  margin-bottom: 8px;
}

.shop-rating {
  color: #ff6b00;
  font-weight: 700;
  margin-right: 8px;
}

.shop-delivery {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #666;
  flex-wrap: wrap;
}

.divider {
  margin: 0 6px;
  color: #ddd;
}

.time {
  color: #009bf5;
  margin-right: 6px;
}

.distance {
  color: #888;
}
</style>
