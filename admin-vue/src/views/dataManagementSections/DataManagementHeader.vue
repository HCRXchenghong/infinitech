<template>
  <div class="title-row">
    <div>
      <span class="title">数据管理</span>
      <div class="page-subtitle">校验真实导入导出链路，备份核心业务数据与平台配置，并支持无损回灌</div>
    </div>
    <el-button size="small" :loading="loading" @click="refreshAll()">
      <el-icon><RefreshRight /></el-icon>
      刷新校验
    </el-button>
  </div>
</template>

<script setup>
import { RefreshRight } from '@element-plus/icons-vue';

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  refreshAll: {
    type: Function,
    required: true,
  },
});
</script>
