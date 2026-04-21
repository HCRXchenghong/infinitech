<template>
  <div class="title-row">
    <span class="title">财务中心</span>
    <div class="finance-center-header-actions">
      <el-radio-group :model-value="periodType" size="small" @change="handlePeriodTypeChange">
        <el-radio-button value="daily">日</el-radio-button>
        <el-radio-button value="weekly">周</el-radio-button>
        <el-radio-button value="monthly">月</el-radio-button>
        <el-radio-button value="quarterly">季</el-radio-button>
        <el-radio-button value="yearly">年</el-radio-button>
      </el-radio-group>
      <el-date-picker
        :model-value="statDate"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="选择日期"
        size="small"
        style="width: 140px"
        @change="handleStatDateChange"
      />
      <el-button size="small" type="primary" :loading="exporting" @click="doExport">下载报表</el-button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  periodType: {
    type: String,
    default: 'daily',
  },
  statDate: {
    type: String,
    default: '',
  },
  exporting: {
    type: Boolean,
    default: false,
  },
  loadAll: {
    type: Function,
    required: true,
  },
  doExport: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:periodType', 'update:statDate'])

function handlePeriodTypeChange(value) {
  emit('update:periodType', value)
  props.loadAll()
}

function handleStatDateChange(value) {
  emit('update:statDate', value || '')
  props.loadAll()
}
</script>

<style scoped>
.finance-center-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
