<template>
  <div class="notification-preview-page">
    <NotificationPreviewTopbar
      :go-back="goBack"
      :go-edit="goEdit"
      :notification-id="notification.id"
    />
    <NotificationPreviewCard
      :load-error="loadError"
      :loading="loading"
      :notification="notification"
    />
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import request from '@/utils/request';
import './NotificationPreviewPage.css';
import NotificationPreviewCard from './notificationPreviewSections/NotificationPreviewCard.vue';
import NotificationPreviewTopbar from './notificationPreviewSections/NotificationPreviewTopbar.vue';
import { useNotificationPreviewPage } from './notificationPreviewPageHelpers';

const route = useRoute();
const router = useRouter();

const {
  goBack,
  goEdit,
  loadError,
  loading,
  notification,
} = useNotificationPreviewPage({
  route,
  router,
  request,
});
</script>
