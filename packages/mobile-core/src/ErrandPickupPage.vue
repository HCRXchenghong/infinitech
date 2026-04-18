<template>
  <view class="page errand-pickup">
    <PageHeader title="帮我取" />

    <scroll-view scroll-y class="content">
      <view class="form-group">
        <view class="form-title">取件码/单号</view>
        <input v-model="form.code" class="form-input" placeholder="输入取件码" />
      </view>

      <view class="form-group">
        <view class="form-title">送达地址</view>
        <input v-model="form.address" class="form-input" placeholder="楼栋号+门牌号" />
      </view>

      <view class="form-group">
        <view class="form-title">配送方式</view>
        <view class="type-tabs">
          <view
            class="type-tab"
            :class="{ active: form.type === 'now' }"
            @tap="form.type = 'now'"
          >
            <text class="tab-name">即时送</text>
            <text class="tab-price">¥14</text>
          </view>
          <view
            class="type-tab"
            :class="{ active: form.type === 'today' }"
            @tap="form.type = 'today'"
          >
            <text class="tab-name">当日达</text>
            <text class="tab-price">¥5</text>
          </view>
        </view>
      </view>

      <view class="fee-summary">
        <view class="fee-row">
          <text>跑腿费</text>
          <text>¥{{ totalPrice }}</text>
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
import { createErrandPickupPage } from "./consumer-errand-pages.js";

export default createErrandPickupPage({
  createOrder,
  buildErrandOrderPayload,
  requireCurrentUserIdentity,
  ensureErrandServiceOpen,
  components: { PageHeader },
});
</script>

<style scoped lang="scss" src="./errand-form-pages.scss"></style>
<style scoped lang="scss">
.errand-pickup {
  min-height: 100vh;
  background: #f5f5f5;
}

.type-tabs {
  display: flex;
  gap: 8px;
}

.type-tab {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  text-align: center;
}

.type-tab.active {
  border-color: #ff6b00;
  background: #fff5f0;
}

.tab-name {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.tab-price {
  display: block;
  font-size: 16px;
  color: #ff6b00;
  font-weight: 600;
}

.footer-btn {
  background: #ff6b00;
}
</style>
