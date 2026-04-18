<template>
  <view class="page errand-deliver">
    <PageHeader title="帮我送" />

    <scroll-view scroll-y class="content">
      <view class="form-group">
        <view class="form-title">取件地址</view>
        <input v-model="form.pickup" class="form-input" placeholder="从哪里取" />
      </view>

      <view class="form-group">
        <view class="form-title">送达地址</view>
        <input v-model="form.dropoff" class="form-input" placeholder="送到哪里" />
      </view>

      <view class="form-group">
        <view class="form-title">物品说明</view>
        <textarea
          v-model="form.item"
          class="form-textarea"
          placeholder="物品类型、大小、重量"
          :maxlength="100"
        />
      </view>

      <view class="form-group">
        <view class="form-title">打赏骑手</view>
        <view class="tip-chips">
          <view
            v-for="t in tipOptions"
            :key="t.value"
            class="tip-chip"
            :class="{ active: Number(form.tipAmount) === t.value }"
            @tap="form.tipAmount = t.value"
          >
            {{ t.label }}
          </view>
        </view>
      </view>

      <view class="fee-summary">
        <view class="fee-row">
          <text>跑腿费</text>
          <text>¥{{ serviceFee.toFixed(2) }}</text>
        </view>
        <view class="fee-row" v-if="Number(form.tipAmount) > 0">
          <text>打赏</text>
          <text>¥{{ Number(form.tipAmount).toFixed(2) }}</text>
        </view>
        <view class="fee-row total">
          <text>合计</text>
          <text class="price">¥{{ totalPrice }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="footer">
      <view class="footer-price">¥{{ totalPrice }}</view>
      <view class="footer-btn" :class="{ disabled: !canSubmit || submitting }" @tap="submitOrder">
        {{ submitting ? "提交中..." : "下单" }}
      </view>
    </view>
  </view>
</template>

<script>
import { createOrder } from "@/shared-ui/api.js";
import {
  buildErrandOrderPayload,
  requireCurrentUserIdentity,
} from "@/shared-ui/errand.js";
import { ensureErrandServiceOpen } from "@/shared-ui/errand-runtime.js";
import PageHeader from "./PageHeader.vue";
import { createErrandDeliverPage } from "./consumer-errand-pages.js";

export default createErrandDeliverPage({
  createOrder,
  buildErrandOrderPayload,
  requireCurrentUserIdentity,
  ensureErrandServiceOpen,
  components: { PageHeader },
});
</script>

<style scoped lang="scss" src="./errand-form-pages.scss"></style>
<style scoped lang="scss">
.errand-deliver {
  min-height: 100vh;
  background: #f5f5f5;
}

.tip-chip.active {
  border-color: #009bf5;
  color: #009bf5;
  background: #f0f9ff;
}

.footer-btn {
  background: #009bf5;
}
</style>
