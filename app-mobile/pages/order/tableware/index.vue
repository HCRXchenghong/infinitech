<template>
  <view class="page tableware">
    <view class="card">
      <view
        v-for="item in options"
        :key="item.value"
        class="row"
        @tap="select(item.value)"
      >
        <text class="label">{{ item.label }}</text>
        <view class="radio" :class="{ active: value === item.value }" />
      </view>
    </view>
  </view>
</template>

<script>
import { useUserOrderStore } from '@/shared-ui/userOrderStore.js'
import { createOrderTablewarePage } from '../../../../packages/mobile-core/src/order-support-pages.js'

export default createOrderTablewarePage({
  useUserOrderStore
})
</script>

<style scoped lang="scss">
.tableware {
  min-height: 100vh;
  background: #f4f4f4;
  padding: 10px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 4px 0;
}

.row {
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f3f4f6;
}

.row:last-child {
  border-bottom-width: 0;
}

.label {
  font-size: 14px;
  color: #374151;
}

.radio {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
}

.radio.active {
  border-color: #009bf5;
  background: #009bf5;
}
</style>
