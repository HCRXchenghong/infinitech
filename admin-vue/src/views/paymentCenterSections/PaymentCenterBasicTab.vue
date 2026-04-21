<template>
  <div>
    <div class="payment-center-two-col">
      <el-card class="payment-center-panel">
        <template #header>运行环境</template>
        <el-form label-width="120px">
          <el-form-item label="生产模式">
            <el-switch v-model="state.pay_mode.isProd" />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="payment-center-panel">
        <template #header>银行卡提现</template>
        <el-form label-width="120px">
          <el-form-item label="到账时效">
            <el-input v-model="state.bank_card_config.arrival_text" placeholder="24小时-48小时" />
          </el-form-item>
          <el-form-item label="侧车地址">
            <el-input v-model="state.bank_card_config.sidecar_url" placeholder="http://bank-payout-sidecar:10302" />
          </el-form-item>
          <el-form-item label="供应商地址">
            <el-input v-model="state.bank_card_config.provider_url" placeholder="https://bank-provider.example.com" />
          </el-form-item>
          <el-form-item label="商户号">
            <el-input v-model="state.bank_card_config.merchant_id" />
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="state.bank_card_config.api_key" show-password />
          </el-form-item>
          <el-form-item label="回调地址">
            <el-input v-model="state.bank_card_config.notify_url" />
          </el-form-item>
          <div class="payment-center-hint">仅商户端和骑手端开放银行卡提现，用户端不展示该选项。</div>
          <div class="payment-center-hint">推荐银行卡回调地址：`/api/payment/callback/bank-card/payout`，第三方出款回调与后台补单统一走这条链路。</div>
          <div class="payment-center-hint">如果暂时无法直连真实出款渠道，可先走管理端人工打款流程；只有在开发环境显式设置 `BANK_PAYOUT_ALLOW_STUB=true` 时，才允许启用 Stub 链路。</div>
        </el-form>
      </el-card>
    </div>

    <div class="payment-center-two-col">
      <el-card class="payment-center-panel">
        <template #header>微信支付配置</template>
        <el-form label-width="120px">
          <el-form-item label="AppID">
            <el-input v-model="state.wxpay_config.appId" />
          </el-form-item>
          <el-form-item label="商户号">
            <el-input v-model="state.wxpay_config.mchId" />
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="state.wxpay_config.apiKey" />
          </el-form-item>
          <el-form-item label="API V3 Key">
            <el-input v-model="state.wxpay_config.apiV3Key" />
          </el-form-item>
          <el-form-item label="证书序列号">
            <el-input v-model="state.wxpay_config.serialNo" />
          </el-form-item>
          <el-form-item label="回调地址">
            <el-input v-model="state.wxpay_config.notifyUrl" />
          </el-form-item>
          <el-form-item label="退款回调">
            <el-input v-model="state.wxpay_config.refundNotifyUrl" />
          </el-form-item>
          <el-form-item label="出款回调">
            <el-input v-model="state.wxpay_config.payoutNotifyUrl" />
          </el-form-item>
          <el-form-item label="出款场景 ID">
            <el-input v-model="state.wxpay_config.payoutSceneId" placeholder="留空则使用商户默认场景" />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="payment-center-panel">
        <template #header>支付宝配置</template>
        <el-form label-width="120px">
          <el-form-item label="AppID">
            <el-input v-model="state.alipay_config.appId" />
          </el-form-item>
          <el-form-item label="私钥">
            <el-input v-model="state.alipay_config.privateKey" type="textarea" :rows="4" />
          </el-form-item>
          <el-form-item label="支付宝公钥">
            <el-input v-model="state.alipay_config.alipayPublicKey" type="textarea" :rows="4" />
          </el-form-item>
          <el-form-item label="回调地址">
            <el-input v-model="state.alipay_config.notifyUrl" />
          </el-form-item>
          <el-form-item label="出款回调">
            <el-input v-model="state.alipay_config.payoutNotifyUrl" />
          </el-form-item>
          <el-form-item label="侧车地址">
            <el-input v-model="state.alipay_config.sidecarUrl" />
          </el-form-item>
          <el-form-item label="沙箱模式">
            <el-switch v-model="state.alipay_config.sandbox" />
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
defineProps({
  state: {
    type: Object,
    required: true,
  },
})
</script>
