<template>
  <el-card class="overview-panel">
    <div class="overview-head">
      <div>
        <div class="section-title">导出校验概览</div>
        <div class="section-tip">刷新会请求真实后台接口，并更新当前可导出的业务数据与配置数量。</div>
      </div>
      <div class="overview-time">上次校验：{{ lastCheckedAt || '未校验' }}</div>
    </div>
    <div class="overview-grid">
      <div v-for="item in summaryCards" :key="item.label" class="overview-card">
        <div class="overview-value">{{ item.value }}</div>
        <div class="overview-label">{{ item.label }}</div>
        <div class="overview-tip">{{ item.tip }}</div>
      </div>
    </div>
  </el-card>

  <el-alert
    type="info"
    :closable="false"
    show-icon
    title="当前页面会同时校验业务数据与平台配置的真实导入导出链路。单项导出支持单项回灌，完整平台备份包也会一并恢复业务数据和系统/内容/API/支付配置。"
  />
</template>

<script setup>
defineProps({
  lastCheckedAt: {
    type: String,
    default: '',
  },
  summaryCards: {
    type: Array,
    default: () => [],
  },
});
</script>
