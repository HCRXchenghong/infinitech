<template>
  <el-card class="workbench-panel">
    <template #header>关键业务旅程</template>
    <div class="workbench-journey-grid">
      <div v-for="journey in journeys" :key="journey.key" class="workbench-journey-item">
        <div class="workbench-journey-top">
          <span class="workbench-journey-name">{{ journey.label }}</span>
          <el-tag size="small" :type="statusTagType(journey.status)">
            {{ journeyStatusLabel(journey.status) }}
          </el-tag>
        </div>
        <p class="workbench-journey-detail">{{ journey.detail || '暂无说明' }}</p>
      </div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  journeys: {
    type: Array,
    default: () => [],
  },
  journeyStatusLabel: {
    type: Function,
    required: true,
  },
  statusTagType: {
    type: Function,
    required: true,
  },
});
</script>
