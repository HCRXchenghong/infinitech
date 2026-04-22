import { onMounted, ref } from 'vue';
import { normalizeAdminNotificationRecord } from '@infinitech/admin-core';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';

export function useNotificationPreviewPage({ route, router, request }) {
  const loading = ref(false);
  const loadError = ref('');
  const notification = ref({});

  onMounted(() => {
    void loadNotification();
  });

  async function loadNotification() {
    loading.value = true;
    loadError.value = '';
    try {
      const id = route.params.id;
      const { data } = await request.get(`/api/notifications/admin/${id}`);
      notification.value = normalizeAdminNotificationRecord(extractEnvelopeData(data) || {});
    } catch (error) {
      notification.value = {};
      loadError.value = extractErrorMessage(error, '加载通知失败');
    } finally {
      loading.value = false;
    }
  }

  function goBack() {
    router.push('/notifications');
  }

  function goEdit() {
    if (!notification.value?.id) {
      return;
    }
    router.push(`/notifications/edit/${notification.value.id}`);
  }

  return {
    goBack,
    goEdit,
    loadError,
    loading,
    notification,
  };
}
