<template>
  <div class="official-notifications-page-header">
    <div>
      <div class="official-notifications-page-title">官方通知</div>
      <div class="official-notifications-page-subtitle">发布与维护平台公告</div>
    </div>
    <div class="official-notifications-header-actions">
      <el-button :loading="loading" @click="loadNotifications">
        <el-icon><RefreshRight /></el-icon>
        刷新
      </el-button>
      <el-button type="primary" @click="createNotification">
        <el-icon><Plus /></el-icon>
        新建通知
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Plus, RefreshRight } from '@element-plus/icons-vue';

defineProps({
  createNotification: {
    type: Function,
    required: true,
  },
  loadNotifications: {
    type: Function,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});
</script>
