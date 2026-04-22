<template>
  <div class="rider-ranks-panel-header">
    <div class="rider-ranks-panel-title">
      <el-button
        type="primary"
        link
        class="rider-ranks-back-button"
        @click="goBack"
      >
        返回
      </el-button>
      <span>骑手配送排名</span>
    </div>

    <div class="rider-ranks-panel-actions">
      <el-radio-group
        :model-value="period"
        size="small"
        @update:model-value="emit('update:period', $event)"
        @change="handlePeriodChange"
      >
        <el-radio-button value="week">周榜</el-radio-button>
        <el-radio-button value="month">月榜</el-radio-button>
      </el-radio-group>
      <el-button size="small" :loading="loading" @click="refreshRanks">刷新</el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  goBack: {
    type: Function,
    required: true,
  },
  handlePeriodChange: {
    type: Function,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  period: {
    type: String,
    default: 'week',
  },
  refreshRanks: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:period'])
</script>
