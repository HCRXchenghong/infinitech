import { computed, onMounted, onUnmounted, ref } from 'vue';
import { extractErrorMessage } from '@infinitech/contracts';
import {
  buildPublicApiSummary,
  normalizePublicApiPermissionList,
  PUBLIC_API_PERMISSION_CATALOG,
  PUBLIC_API_PERMISSION_OPTIONS,
} from '@infinitech/admin-core';
import { useSettingsApiManagement } from './settingsApiManagementHelpers';

export function useApiPermissionsPage({ router, request, ElMessage, ElMessageBox }) {
  const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const permissionCatalog = PUBLIC_API_PERMISSION_CATALOG;
  const permissionOptions = PUBLIC_API_PERMISSION_OPTIONS;

  const {
    apiDialogVisible,
    apiForm,
    apiList,
    apiListError,
    apiListLoading,
    copyApiKey,
    deleteApi,
    editApi,
    editingApi,
    generateApiKey,
    generateMarkdownDoc,
    getPermissionLabel,
    handleApiPermissionChange,
    loadApiList,
    saveApi,
    savingApi,
    showAddApiDialog,
  } = useSettingsApiManagement({
    request,
    router,
    ElMessage,
    ElMessageBox,
  });

  const summary = computed(() => buildPublicApiSummary(apiList.value));

  function handleResize() {
    if (typeof window === 'undefined') {
      return;
    }
    isMobile.value = window.innerWidth <= 768;
  }

  function goToDocumentation() {
    router.push('/api-documentation');
  }

  function setApiDialogVisible(value) {
    apiDialogVisible.value = Boolean(value);
  }

  function downloadKeyDoc(row) {
    try {
      const content = generateMarkdownDoc(row);
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${row.name || 'api-key'}_说明.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      ElMessage.success('Key 说明已下载');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '下载失败'));
    }
  }

  onMounted(() => {
    loadApiList();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }
  });

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
    }
  });

  return {
    apiDialogVisible,
    apiForm,
    apiList,
    apiListError,
    apiListLoading,
    copyApiKey,
    deleteApi,
    downloadKeyDoc,
    editApi,
    editingApi,
    generateApiKey,
    getPermissionLabel,
    goToDocumentation,
    handleApiPermissionChange,
    isMobile,
    loadApiList,
    normalizePublicApiPermissionList,
    permissionCatalog,
    permissionOptions,
    saveApi,
    savingApi,
    setApiDialogVisible,
    showAddApiDialog,
    summary,
  };
}
