<template>
  <view class="page remark">
    <textarea
      v-model="remark"
      class="input"
      placeholder="请输入口味、忌口、偏好等要求"
      maxlength="200"
      auto-height
    />
    <view class="tip">最多可输入 200 字</view>
    <button class="save-btn" @tap="saveRemark">完成</button>
  </view>
</template>

<script>
import { useUserOrderStore } from '@/shared-ui/userOrderStore.js'
import { createOrderRemarkPage } from '../../../../packages/mobile-core/src/order-support-pages.js'

export default createOrderRemarkPage({
  useUserOrderStore
})
</script>

<style scoped lang="scss">
.remark {
  min-height: 100vh;
  background: #f4f4f4;
  padding: 10px;
}

.input {
  width: 100%;
  min-height: 120px;
  padding: 10px;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  box-sizing: border-box;
}

.tip {
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.save-btn {
  margin-top: 20px;
  width: 100%;
  padding: 10px 0;
  border-radius: 999px;
  background: #009bf5;
  color: #fff;
  font-size: 15px;
}
</style>
