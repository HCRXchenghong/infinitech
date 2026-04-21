<template>
  <div class="workbench-hero">
    <div>
      <p class="workbench-eyebrow">联调工作台</p>
      <h1>服务健康、支付配置和提现队列都收在这里</h1>
      <p class="workbench-subtitle">
        这个入口继续保留在原来的导航位置，不再是空白页。现在它直接承接系统健康巡检、
        支付链路就绪度排查、保证金与提现队列的日常联调工作。
      </p>
      <div class="workbench-hero-meta">
        <span>最近检查：{{ formatTime(serviceStatus.checkedAt) }}</span>
        <span>整体状态：{{ overallStatusLabel }}</span>
        <span>待处理提现：{{ pendingWithdrawCount }}</span>
        <span>待自动重试：{{ autoRetryPendingCount }}</span>
      </div>
    </div>
    <div class="workbench-hero-actions">
      <el-button :loading="loading" @click="loadWorkbench">刷新工作台</el-button>
      <el-button type="primary" @click="go('/payment-center')">打开支付中心</el-button>
      <el-button @click="go('/system-logs')">查看系统日志</el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  serviceStatus: {
    type: Object,
    required: true,
  },
  overallStatusLabel: {
    type: String,
    default: '',
  },
  pendingWithdrawCount: {
    type: Number,
    default: 0,
  },
  autoRetryPendingCount: {
    type: Number,
    default: 0,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadWorkbench: {
    type: Function,
    required: true,
  },
  go: {
    type: Function,
    required: true,
  },
  formatTime: {
    type: Function,
    required: true,
  },
});
</script>
