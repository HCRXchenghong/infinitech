<template>
  <div class="official-notifications-page">
    <OfficialNotificationsHeader
      :create-notification="createNotification"
      :load-notifications="loadNotifications"
      :loading="loading"
    />
    <PageStateAlert :message="loadError" />
    <OfficialNotificationsTableSection
      :current-page="currentPage"
      :delete-notification="deleteNotification"
      :deleting-id="deletingId"
      :draft-count="draftCount"
      :edit-notification="editNotification"
      :filtered-notifications="filteredNotifications"
      :keyword="keyword"
      :load-error="loadError"
      :loading="loading"
      :normalized-notifications="normalizedNotifications"
      :page-size="pageSize"
      :paged-notifications="pagedNotifications"
      :preview-notification="previewNotification"
      :published-count="publishedCount"
      :set-current-page="setCurrentPage"
      :set-keyword="setKeyword"
      :set-page-size="setPageSize"
      :set-status-filter="setStatusFilter"
      :status-filter="statusFilter"
    />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '@/utils/request';
import './OfficialNotificationsPage.css';
import PageStateAlert from '@/components/PageStateAlert.vue';
import OfficialNotificationsHeader from './officialNotificationsSections/OfficialNotificationsHeader.vue';
import OfficialNotificationsTableSection from './officialNotificationsSections/OfficialNotificationsTableSection.vue';
import { useOfficialNotificationsPage } from './officialNotificationsPageHelpers';

const router = useRouter();
const {
  createNotification,
  currentPage,
  deleteNotification,
  deletingId,
  draftCount,
  editNotification,
  filteredNotifications,
  keyword,
  loadError,
  loadNotifications,
  loading,
  normalizedNotifications,
  pageSize,
  pagedNotifications,
  previewNotification,
  publishedCount,
  setCurrentPage,
  setKeyword,
  setPageSize,
  setStatusFilter,
  statusFilter,
} = useOfficialNotificationsPage({
  router,
  request,
  ElMessage,
});
</script>
