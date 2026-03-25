<template>
  <scroll-view scroll-y class="category-sidebar">
    <view
      v-for="(cat, index) in categories"
      :key="cat.id"
      class="category-item"
      :class="{ active: activeIndex === index }"
      @tap="handleSwitch(index)"
    >
      <view v-if="activeIndex === index" class="active-indicator"></view>
      <text class="cat-name">{{ cat.name }}</text>
      <view v-if="getCategoryCount(cat.id) > 0" class="cat-badge">
        {{ getCategoryCount(cat.id) }}
      </view>
    </view>
  </scroll-view>
</template>

<script>
export default {
  props: {
    categories: Array,
    activeIndex: Number,
    cartItems: Array
  },
  methods: {
    handleSwitch(index) {
      this.$emit('switch', index)
    },
    getCategoryCount(catId) {
      if (!this.cartItems || !this.cartItems.length) return 0
      return this.cartItems
        .filter(item => item.categoryId === catId)
        .reduce((sum, item) => sum + item.count, 0)
    }
  }
}
</script>

<style scoped lang="scss">
.category-sidebar {
  width: 88px;
  background: #f5f6f7;
  height: 100%;
}

.category-item {
  position: relative;
  padding: 18px 8px;
  text-align: center;
  transition: all 0.2s;
}

.category-item.active {
  background: #fff;
}

.active-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: #009bf5;
  border-radius: 0 2px 2px 0;
}

.cat-name {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.category-item.active .cat-name {
  color: #1f2937;
  font-weight: 700;
}

.cat-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
