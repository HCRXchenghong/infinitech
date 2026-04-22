<template>
  <el-card class="preview-card" v-loading="loading">
    <template #header>
      <div class="header-row">
        <span class="header-title">通知预览</span>
        <el-tag :type="getAdminNotificationStatusTagType(notification.is_published)">
          {{ formatAdminNotificationStatus(notification.is_published) }}
        </el-tag>
      </div>
    </template>

    <el-alert
      v-if="loadError"
      :title="loadError"
      type="error"
      show-icon
      :closable="false"
      class="state-alert"
    />

    <el-empty v-else-if="!loading && !notification.id" description="通知不存在或已被删除" />

    <NotificationPreviewArticle v-else :notification="notification" />
  </el-card>
</template>

<script setup>
import {
  formatAdminNotificationStatus,
  getAdminNotificationStatusTagType,
} from '@infinitech/admin-core';
import NotificationPreviewArticle from './NotificationPreviewArticle.vue';

defineProps({
  loadError: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  notification: {
    type: Object,
    required: true,
  },
});
</script>
