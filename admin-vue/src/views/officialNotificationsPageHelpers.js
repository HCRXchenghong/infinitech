import { computed, onMounted, ref, watch } from 'vue';
import {
  buildAdminNotificationSummary,
  extractAdminNotificationPage,
  filterAdminNotifications,
  sortAdminNotificationsByUpdatedAt,
} from '@infinitech/admin-core';
import { extractErrorMessage } from '@infinitech/contracts';

export function useOfficialNotificationsPage({ router, request, ElMessage }) {
  const loading = ref(false);
  const loadError = ref('');
  const notifications = ref([]);
  const deletingId = ref(null);
  const keyword = ref('');
  const statusFilter = ref('all');
  const currentPage = ref(1);
  const pageSize = ref(10);

  const normalizedNotifications = computed(() => sortAdminNotificationsByUpdatedAt(notifications.value));
  const filteredNotifications = computed(() => {
    return filterAdminNotifications(normalizedNotifications.value, {
      keyword: keyword.value,
      status: statusFilter.value,
    });
  });
  const pagedNotifications = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredNotifications.value.slice(start, start + pageSize.value);
  });
  const notificationSummary = computed(() => buildAdminNotificationSummary(normalizedNotifications.value));
  const publishedCount = computed(() => notificationSummary.value.published);
  const draftCount = computed(() => notificationSummary.value.draft);

  watch([keyword, statusFilter], () => {
    currentPage.value = 1;
  });

  watch([filteredNotifications, pageSize], () => {
    const maxPage = Math.max(1, Math.ceil(filteredNotifications.value.length / pageSize.value));
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  });

  async function loadNotifications() {
    loadError.value = '';
    loading.value = true;
    try {
      const { data } = await request.get('/api/notifications/admin/all');
      notifications.value = extractAdminNotificationPage(data).items;
    } catch (error) {
      notifications.value = [];
      loadError.value = extractErrorMessage(error, '加载通知失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  function setKeyword(value) {
    keyword.value = String(value ?? '');
  }

  function setStatusFilter(value) {
    statusFilter.value = String(value ?? 'all') || 'all';
  }

  function setCurrentPage(value) {
    currentPage.value = Math.max(1, Number(value || 1));
  }

  function setPageSize(value) {
    pageSize.value = Math.max(1, Number(value || 10));
  }

  function createNotification() {
    router.push('/notifications/edit');
  }

  function editNotification(row) {
    router.push(`/notifications/edit/${row.id}`);
  }

  function previewNotification(row) {
    router.push(`/notifications/preview/${row.id}`);
  }

  async function deleteNotification(row) {
    if (deletingId.value) {
      return;
    }

    deletingId.value = row.id;
    try {
      await request.delete(`/api/notifications/admin/${row.id}`);
      ElMessage.success('删除成功');
      await loadNotifications();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '删除失败'));
    } finally {
      deletingId.value = null;
    }
  }

  onMounted(() => {
    void loadNotifications();
  });

  return {
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
  };
}
