<template>
  <div class="workbench-summary-grid">
    <el-card class="workbench-summary-card">
      <span class="workbench-summary-label">核心服务</span>
      <strong>{{ serviceStatus.services.length }}</strong>
      <small>{{ upServiceCount }} 个在线，{{ downServiceCount }} 个异常</small>
    </el-card>
    <el-card class="workbench-summary-card">
      <span class="workbench-summary-label">业务旅程</span>
      <strong>{{ journeyCounts.ok }}</strong>
      <small>{{ journeyCounts.degraded }} 个降级，{{ journeyCounts.down }} 个阻断</small>
    </el-card>
    <el-card class="workbench-summary-card">
      <span class="workbench-summary-label">支付网关</span>
      <strong>{{ gatewayReadyCount }}/3</strong>
      <small>{{ gatewayModeLabel }}</small>
    </el-card>
    <el-card class="workbench-summary-card">
      <span class="workbench-summary-label">保证金概览</span>
      <strong>{{ riderDepositOverview.total || 0 }}</strong>
      <small>可提现 {{ riderDepositOverview.withdrawable || 0 }}，提现中 {{ riderDepositOverview.withdrawing || 0 }}</small>
    </el-card>
  </div>
</template>

<script setup>
defineProps({
  serviceStatus: {
    type: Object,
    required: true,
  },
  upServiceCount: {
    type: Number,
    default: 0,
  },
  downServiceCount: {
    type: Number,
    default: 0,
  },
  journeyCounts: {
    type: Object,
    required: true,
  },
  gatewayReadyCount: {
    type: Number,
    default: 0,
  },
  gatewayModeLabel: {
    type: String,
    default: '',
  },
  riderDepositOverview: {
    type: Object,
    required: true,
  },
});
</script>
