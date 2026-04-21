<template>
  <el-dialog
    :model-value="visible"
    :title="kpiDialogData.label"
    width="400px"
    align-center
    @update:model-value="emit('update:visible', $event)"
  >
    <el-descriptions :column="1" border size="small">
      <el-descriptions-item label="数值">{{ kpiDialogData.value }}</el-descriptions-item>
      <el-descriptions-item label="说明">{{ kpiDialogData.desc }}</el-descriptions-item>
      <el-descriptions-item label="统计周期">
        {{ formatFinanceDate(overview.periodStart) }} ~
        {{ formatFinanceDate(overview.periodEnd) }}
      </el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  kpiDialogData: {
    type: Object,
    default: () => ({}),
  },
  overview: {
    type: Object,
    default: () => ({}),
  },
  formatFinanceDate: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])
</script>
