<template>
  <view class="page errand-do">
    <PageHeader title="帮我办" />

    <scroll-view scroll-y class="content">
      <view class="form-group">
        <view class="form-title">服务地址</view>
        <input v-model="form.address" class="form-input" placeholder="楼栋号+门牌号" />
      </view>

      <view class="form-group">
        <view class="form-title">代办事项</view>
        <textarea
          v-model="form.desc"
          class="form-textarea"
          placeholder="需要帮你做什么？写清楚时间、地点"
          :maxlength="200"
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
          <text>服务费</text>
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
import { createErrandDoPage } from "./consumer-errand-pages.js";

export default createErrandDoPage({
  createOrder,
  buildErrandOrderPayload,
  requireCurrentUserIdentity,
  ensureErrandServiceOpen,
  components: { PageHeader },
});
</script>

<style scoped lang="scss" src="./errand-form-pages.scss"></style>
<style scoped lang="scss">
.errand-do {
  min-height: 100vh;
  background: #f5f5f5;
}

.form-textarea {
  min-height: 100px;
}

.tip-chip.active {
  border-color: #8b5cf6;
  color: #8b5cf6;
  background: #f5f3ff;
}

.footer-btn {
  background: #8b5cf6;
}
</style>
