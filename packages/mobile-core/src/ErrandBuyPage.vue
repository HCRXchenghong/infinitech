<template>
  <view class="page errand-buy">
    <PageHeader title="帮我买" />

    <scroll-view scroll-y class="content">
      <view class="form-group">
        <view class="form-title">购买地址</view>
        <input v-model="form.buyAddress" class="form-input" placeholder="店铺名称或地址" />
      </view>

      <view class="form-group">
        <view class="form-title">送达地址</view>
        <input v-model="form.targetAddress" class="form-input" placeholder="收货地址" />
      </view>

      <view class="form-group">
        <view class="form-title">购买清单</view>
        <textarea
          v-model="form.desc"
          class="form-textarea"
          placeholder="需要买什么？写清楚品牌、规格、数量"
          :maxlength="200"
        />
      </view>

      <view class="form-group">
        <view class="form-title">预估商品金额（元）</view>
        <input v-model="form.itemPrice" class="form-input" type="digit" placeholder="0.00" />
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
          <text>商品预估</text>
          <text>¥{{ amountText }}</text>
        </view>
        <view class="fee-row">
          <text>跑腿费</text>
          <text>¥{{ deliveryFee.toFixed(2) }}</text>
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
import { createErrandBuyPage } from "./consumer-errand-pages.js";

export default createErrandBuyPage({
  createOrder,
  buildErrandOrderPayload,
  requireCurrentUserIdentity,
  ensureErrandServiceOpen,
  components: { PageHeader },
});
</script>

<style scoped lang="scss" src="./errand-form-pages.scss"></style>
<style scoped lang="scss">
.errand-buy {
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
