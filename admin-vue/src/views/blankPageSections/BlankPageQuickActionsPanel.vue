<template>
  <el-card class="workbench-panel">
    <template #header>快捷入口</template>
    <div class="workbench-action-grid">
      <button class="workbench-action-item" @click="go('/dashboard')">
        <span>仪表盘</span>
        <small>回到经营概览和核心统计</small>
      </button>
      <button class="workbench-action-item" @click="go('/transaction-logs')">
        <span>财务日志</span>
        <small>检查充值、提现、退款和补单流水</small>
      </button>
      <button class="workbench-action-item" @click="go('/payment-center')">
        <span>支付中心</span>
        <small>维护渠道、分账、保证金和提现费</small>
      </button>
      <button class="workbench-action-item" @click="go('/monitor-chat')">
        <span>平台监控</span>
        <small>查看消息、RTC 和实时运行态</small>
      </button>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  go: {
    type: Function,
    required: true,
  },
});
</script>
