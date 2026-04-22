<template>
  <div class="title-row">
    <span class="title">系统日志</span>
    <div class="title-actions">
      <el-button type="danger" plain size="small" :disabled="loading" @click="openClearDialog">
        一键清空
      </el-button>
      <el-button size="small" :loading="loading" @click="loadLogs">刷新</el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loadLogs: {
    type: Function,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  openClearDialog: {
    type: Function,
    required: true,
  },
});
</script>
