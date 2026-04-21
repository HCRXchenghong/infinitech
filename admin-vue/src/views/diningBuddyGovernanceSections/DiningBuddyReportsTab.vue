<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-title-row">
        <span>举报列表</span>
        <div class="inline-filters">
          <el-select v-model="reportFilters.status" clearable placeholder="状态" size="small" style="width: 140px;">
            <el-option
              v-for="option in reportStatusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-button size="small" :loading="reportsLoading" @click="loadReports(true)">查询</el-button>
        </div>
      </div>
    </template>

    <el-table :data="reports" v-loading="reportsLoading" size="small" border>
      <el-table-column prop="target_type" label="举报对象" width="110" />
      <el-table-column prop="target_id" label="对象 ID" width="170" />
      <el-table-column prop="reporter_name" label="举报人" width="120" />
      <el-table-column prop="reason" label="举报原因" min-width="180" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="created_at" label="提交时间" width="180" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" text type="success" @click="handleReport(row, 'resolve')">受理</el-button>
          <el-button size="small" text type="danger" @click="handleReport(row, 'reject')">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
defineProps({
  reportFilters: {
    type: Object,
    required: true,
  },
  reportStatusOptions: {
    type: Array,
    default: () => [],
  },
  reports: {
    type: Array,
    default: () => [],
  },
  reportsLoading: {
    type: Boolean,
    default: false,
  },
  loadReports: {
    type: Function,
    required: true,
  },
  handleReport: {
    type: Function,
    required: true,
  },
})
</script>
