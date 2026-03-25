<template>
  <view class="product-item" @tap="handleTap">
    <view class="product-image-wrap">
      <image class="product-image" :src="item.image" mode="aspectFill" />
      <view v-if="item.tag" class="product-tag">{{ item.tag }}</view>
    </view>
    <view class="product-info">
      <text class="product-name">{{ item.name }}</text>
      <text v-if="item.desc" class="product-desc">{{ item.desc }}</text>
      <view class="product-meta">
        <text>月售{{ item.sales }}</text>
        <text v-if="item.likeRate" class="like-rate">好评{{ item.likeRate }}%</text>
      </view>
      <view class="product-footer">
        <view class="price-area">
          <text class="price-symbol">¥</text>
          <text class="price">{{ item.price }}</text>
          <text v-if="item.originalPrice" class="original-price">¥{{ item.originalPrice }}</text>
        </view>
        <view class="cart-actions" @tap.stop>
          <view v-if="count > 0" class="minus-btn" @tap.stop="handleMinus">
            <text>−</text>
          </view>
          <text v-if="count > 0" class="item-count">{{ count }}</text>
          <view class="plus-btn" @tap.stop="handlePlus">
            <text>+</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    item: Object,
    count: {
      type: Number,
      default: 0
    }
  },
  methods: {
    handleTap() {
      this.$emit('tap', this.item)
    },
    handlePlus() {
      this.$emit('plus', this.item)
    },
    handleMinus() {
      this.$emit('minus', this.item)
    }
  }
}
</script>

<style scoped lang="scss">
.product-item {
  display: flex;
  padding: 14px 0;
  border-bottom: 1px solid #f5f5f5;
}

.product-image-wrap {
  position: relative;
  flex-shrink: 0;
  margin-right: 12px;
}

.product-image {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  background: #f5f5f5;
}

.product-tag {
  position: absolute;
  top: 4px;
  left: 4px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.product-desc {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 8px;

  text {
    margin-right: 10px;
  }
}

.like-rate {
  color: #f59e0b;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-area {
  display: flex;
  align-items: baseline;
}

.price-symbol {
  font-size: 12px;
  color: #ef4444;
  font-weight: 700;
}

.price {
  font-size: 18px;
  color: #ef4444;
  font-weight: 700;
  margin-right: 6px;
}

.original-price {
  font-size: 12px;
  color: #ccc;
  text-decoration: line-through;
}

.cart-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.minus-btn,
.plus-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}

.minus-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.plus-btn {
  background: #009bf5;
  color: #fff;
}

.item-count {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}
</style>
