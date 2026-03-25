<template>
  <view class="category-section">
    <view class="category-grid">
      <view
        v-for="cat in categories"
        :key="cat.name"
        class="category-item"
        @tap.stop="handleTap(cat)"
        @click.stop="handleTap(cat)"
      >
        <view class="category-icon" :style="{ backgroundColor: cat.bg }">
          <image class="cat-svg" :src="cat.image" mode="aspectFit" />
        </view>
        <text class="category-name">{{ cat.name }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    categories: {
      type: Array,
      required: true
    }
  },
  methods: {
    handleTap(cat) {
      // 使用自定义事件名称，避免与原生tap事件冲突
      this.$emit('category-tap', cat)
    }
  }
}
</script>

<style scoped lang="scss">
.category-section {
  position: relative;
  z-index: 101;
  margin: -30px 12px 0;
  padding: 16px 8px 8px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.category-grid {
  display: flex;
  flex-wrap: wrap;
}

.category-item {
  width: 20%;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: transform 0.2s;
}

.category-item:active {
  transform: scale(0.95);
  opacity: 0.8;
}

.category-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  pointer-events: none;
}

.cat-svg {
  width: 28px;
  height: 28px;
}

.category-name {
  font-size: 12px;
  color: #333;
  font-weight: 500;
  line-height: 1.2;
  pointer-events: none;
}
</style>
