<template>
  <el-card class="workbench-panel">
    <template #header>
      <div class="workbench-panel-header">
        <span>服务健康</span>
        <el-tag size="small" :type="statusTagType(serviceStatus.overall)">
          {{ overallStatusLabel }}
        </el-tag>
      </div>
    </template>
    <div v-if="loading" class="workbench-skeleton-wrap">
      <el-skeleton :rows="6" animated />
    </div>
    <div v-else class="workbench-service-grid">
      <div v-for="item in serviceStatus.services" :key="item.key" class="workbench-service-item">
        <div class="workbench-service-top">
          <div>
            <div class="workbench-service-name">{{ item.label || item.key }}</div>
            <div class="workbench-service-target">{{ item.target || '-' }}</div>
          </div>
          <el-tag size="small" :type="statusTagType(item.status)">
            {{ serviceStatusLabel(item.status) }}
          </el-tag>
        </div>
        <div class="workbench-service-meta">
          <span v-if="item.probe">探针 {{ item.probe }}</span>
          <span v-if="item.httpStatus">HTTP {{ item.httpStatus }}</span>
          <span v-if="item.latencyMs !== null && item.latencyMs !== undefined">延迟 {{ item.latencyMs }}ms</span>
        </div>
        <div class="workbench-service-detail">
          {{ item.error ? `异常：${item.error}` : formatServiceDetail(item.detail) }}
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  serviceStatus: {
    type: Object,
    required: true,
  },
  overallStatusLabel: {
    type: String,
    default: '',
  },
  statusTagType: {
    type: Function,
    required: true,
  },
  serviceStatusLabel: {
    type: Function,
    required: true,
  },
  formatServiceDetail: {
    type: Function,
    required: true,
  },
});
</script>
