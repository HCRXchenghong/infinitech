<template>
  <view class="page-header">
    <view class="back-btn" @tap="handleBack">
      <text>‹</text>
    </view>
    <text class="page-title">{{ title }}</text>
    <view v-if="showSearch" class="search-btn" @tap="handleSearch">
      <image src="/static/icons/search.svg" mode="aspectFit" class="search-icon" />
    </view>
    <view v-else class="placeholder"></view>
  </view>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      default: ''
    },
    showSearch: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    handleBack() {
      this.$emit('back')
      uni.navigateBack()
    },
    handleSearch() {
      this.$emit('search')
    }
  }
}
</script>

<style scoped lang="scss">
.page-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: calc(env(safe-area-inset-top, 0px) + 40px);
  padding-bottom: 14px;
  padding-left: 12px;
  padding-right: 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #333;
  font-weight: bold;
}

.page-title {
  font-size: 17px;
  font-weight: 700;
  color: #1f2937;
}

.search-btn,
.placeholder {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-icon {
  width: 20px;
  height: 20px;
  opacity: 0.7;
}
</style>
