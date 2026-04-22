<template>
  <el-card class="workbench-panel">
    <template #header>
      <div class="workbench-panel-header">
        <span>支付配置摘要</span>
        <el-button link type="primary" @click="go('/payment-center')">去维护</el-button>
      </div>
    </template>
    <div class="workbench-gateway-grid">
      <div class="workbench-gateway-item">
        <div class="workbench-gateway-top">
          <span class="workbench-gateway-name">微信支付</span>
          <el-tag size="small" :type="gatewaySummary.wechat?.ready ? 'success' : 'danger'">
            {{ gatewaySummary.wechat?.ready ? '已就绪' : '未完成' }}
          </el-tag>
        </div>
        <ul class="workbench-gateway-list">
          <li>商户号：{{ yesNo(gatewaySummary.wechat?.mchIdConfigured) }}</li>
          <li>API V3 Key：{{ yesNo(gatewaySummary.wechat?.apiV3KeyConfigured) }}</li>
          <li>证书序列号：{{ yesNo(gatewaySummary.wechat?.serialNoConfigured) }}</li>
          <li>回调地址：{{ yesNo(gatewaySummary.wechat?.notifyUrlConfigured) }}</li>
        </ul>
      </div>
      <div class="workbench-gateway-item">
        <div class="workbench-gateway-top">
          <span class="workbench-gateway-name">支付宝</span>
          <el-tag size="small" :type="gatewaySummary.alipay?.ready ? 'success' : 'danger'">
            {{ gatewaySummary.alipay?.ready ? '已就绪' : '未完成' }}
          </el-tag>
        </div>
        <ul class="workbench-gateway-list">
          <li>AppID：{{ yesNo(gatewaySummary.alipay?.appIdConfigured) }}</li>
          <li>私钥：{{ yesNo(gatewaySummary.alipay?.privateKeyConfigured) }}</li>
          <li>公钥：{{ yesNo(gatewaySummary.alipay?.publicKeyConfigured) }}</li>
          <li>侧车地址：{{ yesNo(gatewaySummary.alipay?.sidecarUrlConfigured) }}</li>
          <li>接入策略：仅正式官方侧车</li>
        </ul>
      </div>
      <div class="workbench-gateway-item">
        <div class="workbench-gateway-top">
          <span class="workbench-gateway-name">银行卡出款</span>
          <el-tag size="small" :type="gatewaySummary.bankCard?.ready ? 'success' : 'danger'">
            {{ gatewaySummary.bankCard?.ready ? '已就绪' : '未完成' }}
          </el-tag>
        </div>
        <ul class="workbench-gateway-list">
          <li>到账时效：{{ gatewaySummary.bankCard?.arrivalText || '24小时-48小时' }}</li>
          <li>侧车地址：{{ yesNo(gatewaySummary.bankCard?.sidecarUrlConfigured) }}</li>
          <li>供应商地址：{{ yesNo(gatewaySummary.bankCard?.providerUrlConfigured) }}</li>
          <li>商户号：{{ yesNo(gatewaySummary.bankCard?.merchantIdConfigured) }}</li>
          <li>API Key：{{ yesNo(gatewaySummary.bankCard?.apiKeyConfigured) }}</li>
          <li>回调地址：{{ yesNo(gatewaySummary.bankCard?.notifyUrlConfigured) }}</li>
          <li>未就绪时：人工出款流程</li>
        </ul>
      </div>
    </div>
    <div class="workbench-mode-note">
      当前运行模式：{{ gatewayModeLabel }}
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  gatewaySummary: {
    type: Object,
    required: true,
  },
  gatewayModeLabel: {
    type: String,
    default: '',
  },
  yesNo: {
    type: Function,
    required: true,
  },
  go: {
    type: Function,
    required: true,
  },
});
</script>
