<template>
  <view class="page tableware">
    <view class="card">
      <view
        v-for="n in options"
        :key="n.value"
        class="row"
        @tap="select(n.value)"
      >
        <text class="label">{{ n.label }}</text>
        <view class="radio" :class="{ active: value === n.value }" />
      </view>
    </view>
  </view>
</template>

<script>
import { useUserOrderStore } from '@/shared-ui/userOrderStore.js'

export default {
  data() {
    return {
      value: useUserOrderStore().state.tableware,
      options: [
  { value: 0, label: '不需要餐具' },
  { value: 1, label: '1 套' },
  { value: 2, label: '2 套' },
  { value: 3, label: '3 套以上' }
      ]
    }
  },
  onShow() {
    this.value = useUserOrderStore().state.tableware
  },
  methods: {
    select(v) {
      this.value = v
      useUserOrderStore().setTableware(v)
      uni.navigateBack()
    }
  }
}
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

