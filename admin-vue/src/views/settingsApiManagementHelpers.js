import { ref } from 'vue';
import { extractErrorMessage } from '@infinitech/contracts';
import {
  buildApiDocumentationText,
  buildApiKeyMarkdownText,
} from '@infinitech/admin-core';
import { usePublicApiManagement } from './publicApiManagementCore';

export function useSettingsApiManagement({ request, router, ElMessage, ElMessageBox }) {
  const apiManagement = usePublicApiManagement({
    request,
    ElMessage,
    ElMessageBox,
    messages: {
      loadError: '加载API配置失败，请稍后重试',
      missingName: '请填写调用方名称',
      createSuccess: 'API Key 添加成功',
      updateSuccess: 'API Key 更新成功',
      saveError: '保存API Key失败',
      deleteSuccess: 'API Key 删除成功',
      deleteError: '删除API Key失败',
      copySuccess: 'API Key 已复制到剪贴板',
      copyError: '复制失败，请手动复制',
      deleteConfirmMessage(target) {
        return `确定要删除 API Key "${target.name}" 吗？此操作不可恢复。`;
      },
    },
  });

  const downloadDialogVisible = ref(false);
  const downloadLanguage = ref('java');
  const downloadingApi = ref(false);
  const currentDownloadApi = ref(null);

  function showApiDocumentation() {
    router.push('/api-documentation');
  }

  function generateApiDocumentation() {
    return buildApiDocumentationText();
  }

  function showDownloadDialog(row) {
    currentDownloadApi.value = row;
    downloadLanguage.value = 'java';
    downloadDialogVisible.value = true;
  }

  function generateMarkdownDoc(api) {
    return buildApiKeyMarkdownText(api, apiManagement.getPermissionLabel);
  }

  async function downloadApiDoc() {
    if (!currentDownloadApi.value) {
      ElMessage.warning('请选择要下载的API接口');
      return;
    }

    downloadingApi.value = true;
    try {
      const content = generateMarkdownDoc(currentDownloadApi.value);
      const filename = `${currentDownloadApi.value.name}_API_Documentation.md`;

      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      ElMessage.success('API文档下载成功');
      downloadDialogVisible.value = false;
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '下载API文档失败'));
    } finally {
      downloadingApi.value = false;
    }
  }

  return {
    ...apiManagement,
    downloadDialogVisible,
    downloadLanguage,
    downloadingApi,
    currentDownloadApi,
    showApiDocumentation,
    generateApiDocumentation,
    showDownloadDialog,
    generateMarkdownDoc,
    downloadApiDoc,
  };
}
