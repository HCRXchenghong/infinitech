<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-title-row">
        <span>审计日志</span>
        <el-button size="small" :loading="auditLoading" @click="loadAuditLogs(true)">刷新</el-button>
      </div>
    </template>

    <el-table :data="auditLogs" v-loading="auditLoading" size="small" border>
      <el-table-column prop="action" label="动作" width="180" />
      <el-table-column prop="target_type" label="对象类型" width="120" />
      <el-table-column prop="target_id" label="对象 ID" width="180" />
      <el-table-column prop="operator_name" label="操作人" width="120" />
      <el-table-column prop="summary" label="摘要" min-width="220" />
      <el-table-column prop="created_at" label="操作时间" width="180" />
    </el-table>
  </el-card>
</template>

<script setup>
defineProps({
  auditLogs: {
    type: Array,
    default: () => [],
  },
  auditLoading: {
    type: Boolean,
    default: false,
  },
  loadAuditLogs: {
    type: Function,
    required: true,
  },
})
</script>
