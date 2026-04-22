<template>
  <el-card class="status-card">
    <div class="status-header">
      <div class="status-title-row">
        <span class="status-title">服务状态</span>
        <el-tag size="small" :type="serviceTagType(serviceStatus.overall)">
          {{ overallStatusText(serviceStatus.overall) }}
        </el-tag>
      </div>
      <span class="status-time">检查时间：{{ formatTime(serviceStatus.checkedAt) }}</span>
    </div>

    <div v-if="serviceStatus.services.length > 0" class="status-grid">
      <div v-for="item in serviceStatus.services" :key="item.key" class="status-item">
        <div class="status-item-top">
          <span class="service-name">{{ item.label || item.key }}</span>
          <el-tag size="small" :type="serviceTagType(item.status)">
            {{ serviceStatusText(item.status) }}
          </el-tag>
        </div>
        <div class="service-target">
          {{ item.target || '-' }}
          <span v-if="item.probe" class="service-probe">探针 {{ formatProbeType(item.probe) }}</span>
        </div>
        <div class="service-meta">
          <span v-if="item.httpStatus">HTTP {{ item.httpStatus }}</span>
          <span v-if="item.latencyMs !== null && item.latencyMs !== undefined">
            延迟 {{ item.latencyMs }}ms
          </span>
          <span v-if="item.error" class="service-error">{{ item.error }}</span>
        </div>
        <div v-if="getServiceSignals(item).length > 0" class="service-signals">
          <el-tag
            v-for="signal in getServiceSignals(item)"
            :key="`${item.key}-${signal.key}-${signal.rawValue}`"
            size="small"
            :type="signal.type"
            effect="plain"
            class="service-signal"
          >
            {{ signal.label }}{{ signal.value ? ` ${signal.value}` : '' }}
          </el-tag>
        </div>
        <div v-if="resolveServiceSummary(item)" class="service-detail">
          {{ resolveServiceSummary(item) }}
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无服务状态数据" :image-size="56" />
  </el-card>
</template>

<script setup>
defineProps({
  formatProbeType: {
    type: Function,
    required: true,
  },
  formatTime: {
    type: Function,
    required: true,
  },
  getServiceSignals: {
    type: Function,
    required: true,
  },
  overallStatusText: {
    type: Function,
    required: true,
  },
  resolveServiceSummary: {
    type: Function,
    required: true,
  },
  serviceStatus: {
    type: Object,
    required: true,
  },
  serviceStatusText: {
    type: Function,
    required: true,
  },
  serviceTagType: {
    type: Function,
    required: true,
  },
});
</script>
