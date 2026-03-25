<template>
  <view class="errand-legacy">
    <text class="legacy-text">正在跳转到新版跑腿页...</text>
  </view>
</template>

<script>
export default {
  onLoad() {
    uni.redirectTo({ url: '/pages/errand/home/index' })
  }
}
</script>

<style scoped lang="scss">
.errand-legacy {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.legacy-text {
  font-size: 14px;
  color: #6b7280;
}
</style>
