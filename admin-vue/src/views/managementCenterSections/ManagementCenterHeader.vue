<template>
  <div class="management-page-header">
    <div class="management-title-wrap">
      <span class="management-page-title">管理员账号管理</span>
      <span class="management-page-subtitle">管理中心仅保留管理员账号维护</span>
    </div>
    <div class="management-header-actions">
      <el-button size="small" :loading="loading" @click="loadAll">
        <el-icon><RefreshRight /></el-icon>
        刷新
      </el-button>
      <el-button type="primary" size="small" @click="showAddAdminDialog">
        <el-icon><Plus /></el-icon>
        添加管理员
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Plus, RefreshRight } from '@element-plus/icons-vue';

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  loadAll: {
    type: Function,
    required: true,
  },
  showAddAdminDialog: {
    type: Function,
    required: true,
  },
});
</script>
