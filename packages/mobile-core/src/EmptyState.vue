<template>
  <view class="empty-state">
    <text class="empty-icon">{{ icon }}</text>
    <text class="empty-text">{{ text }}</text>
    <text class="empty-desc">{{ desc }}</text>
  </view>
</template>

<script>
import { createEmptyStateComponent } from "./consumer-shop-components.js";

export default createEmptyStateComponent();
</script>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: #6b7280;
}

.empty-desc {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 6px;
}
</style>
