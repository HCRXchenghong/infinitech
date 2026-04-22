import { computed, ref } from 'vue';
import {
  API_DOCUMENTATION_AUTH_HEADER_EXAMPLE,
  API_DOCUMENTATION_ENDPOINT_GROUPS,
  API_DOCUMENTATION_ERROR_CODES,
  API_DOCUMENTATION_NOTES,
  API_DOCUMENTATION_PERMISSION_ROWS,
  API_DOCUMENTATION_RESOURCE_TYPES,
  buildApiDocumentationMarkdown,
  buildApiDocumentationQuickStartCurl,
  buildApiDocumentationRequestExamples,
} from '@infinitech/admin-core';
import {
  Box,
  Collection,
  Shop,
  ShoppingBag,
  User,
  UserFilled,
} from '@element-plus/icons-vue';

const iconMap = {
  ShoppingBag,
  User,
  UserFilled,
  Shop,
  Box,
  Collection,
};

export function useApiDocumentationPage({ ElMessage }) {
  const downloading = ref(false);
  const authHeaderExample = API_DOCUMENTATION_AUTH_HEADER_EXAMPLE;
  const permissionRows = API_DOCUMENTATION_PERMISSION_ROWS;
  const resourceTypes = API_DOCUMENTATION_RESOURCE_TYPES;
  const endpointGroups = API_DOCUMENTATION_ENDPOINT_GROUPS;
  const errorCodes = API_DOCUMENTATION_ERROR_CODES;
  const notes = API_DOCUMENTATION_NOTES;

  const apiBaseUrl = computed(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return window.location.origin;
  });

  const quickStartCurl = computed(() => buildApiDocumentationQuickStartCurl(apiBaseUrl.value));
  const requestExamples = computed(() => buildApiDocumentationRequestExamples(apiBaseUrl.value));

  async function copyText(text) {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('clipboard unavailable');
      }
      await navigator.clipboard.writeText(text);
      ElMessage.success('已复制到剪贴板');
    } catch (_error) {
      ElMessage.error('复制失败');
    }
  }

  function refreshDocumentation() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  function downloadFullDocumentation() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    downloading.value = true;
    try {
      const blob = new Blob(
        [
          buildApiDocumentationMarkdown({
            apiBaseUrl: apiBaseUrl.value,
            generatedAtText: new Date().toLocaleString('zh-CN', { hour12: false }),
          }),
        ],
        { type: 'text/markdown;charset=utf-8' },
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `API开发文档_${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      ElMessage.success('文档下载成功');
    } catch (error) {
      ElMessage.error(`下载失败: ${error?.message || '未知错误'}`);
    } finally {
      downloading.value = false;
    }
  }

  return {
    apiBaseUrl,
    authHeaderExample,
    copyText,
    downloading,
    downloadFullDocumentation,
    endpointGroups,
    errorCodes,
    iconMap,
    notes,
    permissionRows,
    quickStartCurl,
    refreshDocumentation,
    requestExamples,
    resourceTypes,
  };
}
