<template>
  <view class="menu-nav">
    <view class="back-btn" @tap="handleBack">
      <text>‹</text>
    </view>
    <view class="shop-brief">
      <view class="mini-logo">
        <text>{{ shopName ? shopName.slice(0, 1) : '' }}</text>
      </view>
      <text class="shop-name">{{ shopName }}</text>
    </view>
    <view class="nav-right">
      <text class="search-icon">🔍</text>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    shopName: String
  },
  methods: {
    handleBack() {
      this.$emit('back')
    }
  }
}
</script>

<style scoped lang="scss">
.menu-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: calc(env(safe-area-inset-top, 0px) + 40px);
  padding-bottom: 10px;
  padding-left: 12px;
  padding-right: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
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

.shop-brief {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.mini-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #009bf5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  margin-right: 8px;
}

.shop-name {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.nav-right {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-icon {
  font-size: 18px;
}
</style>
