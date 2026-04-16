import { ref, reactive } from 'vue';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  buildPublicApiPayload,
  createPublicApiFormState,
  generatePublicApiKey,
  getPublicApiPermissionLabel,
  normalizePublicApiList,
  normalizePublicApiPermissionList,
  normalizePublicApiRecord,
  resolvePublicApiPermissionSelection,
} from '@infinitech/admin-core';
import { buildApiDocumentationText, buildApiKeyMarkdownText } from './settingsDocBuilders';

async function copyTextToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('clipboard_unavailable');
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'readonly');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error('clipboard_unavailable');
  }
}

export function useSettingsApiManagement({ request, router, ElMessage, ElMessageBox }) {
  const apiListError = ref('');
  const apiList = ref([]);
  const apiListLoading = ref(false);
  const apiDialogVisible = ref(false);
  const editingApi = ref(null);
  const apiForm = reactive(createPublicApiFormState());
  const savingApi = ref(false);

  const downloadDialogVisible = ref(false);
  const downloadLanguage = ref('java');
  const downloadingApi = ref(false);
  const currentDownloadApi = ref(null);
  let lastPermissionSelection = [];

  function syncPermissionSelection(value = apiForm.permissions) {
    const normalized = normalizePublicApiPermissionList(value);
    lastPermissionSelection = [...normalized];
    apiForm.permissions = [...normalized];
  }

  async function loadApiList() {
    apiListError.value = '';
    apiListLoading.value = true;
    try {
      const { data } = await request.get('/api/public-apis');
      const payload = extractEnvelopeData(data);
      apiList.value = normalizePublicApiList(payload);
    } catch (error) {
      apiList.value = [];
      apiListError.value = extractErrorMessage(error, '加载API配置失败，请稍后重试');
    } finally {
      apiListLoading.value = false;
    }
  }

  function resetApiForm() {
    Object.assign(apiForm, createPublicApiFormState());
    lastPermissionSelection = [];
  }

  function generateApiKey() {
    apiForm.api_key = generatePublicApiKey();
  }

  function showAddApiDialog() {
    editingApi.value = null;
    resetApiForm();
    generateApiKey();
    apiDialogVisible.value = true;
  }

  function editApi(row) {
    const normalizedRow = normalizePublicApiRecord(row);
    editingApi.value = normalizedRow;
    Object.assign(apiForm, createPublicApiFormState(normalizedRow));
    syncPermissionSelection(apiForm.permissions);
    apiDialogVisible.value = true;
  }

  async function deleteApi(row) {
    const target = normalizePublicApiRecord(row);
    try {
      await ElMessageBox.confirm(
        `确定要删除 API Key "${target.name}" 吗？此操作不可恢复。`,
        '确认删除',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      );

      await request.delete(`/api/public-apis/${target.id}`);
      ElMessage.success('API Key 删除成功');
      await loadApiList();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(extractErrorMessage(error, '删除API Key失败'));
      }
    }
  }

  async function saveApi() {
    const apiData = buildPublicApiPayload(apiForm);

    if (!apiData.name) {
      ElMessage.warning('请填写调用方名称');
      return;
    }

    if (apiData.permissions.length === 0) {
      ElMessage.warning('请至少选择一种访问权限');
      return;
    }

    if (!apiData.api_key) {
      ElMessage.warning('请生成API Key');
      return;
    }

    savingApi.value = true;
    try {
      if (editingApi.value) {
        await request.put(`/api/public-apis/${editingApi.value.id}`, apiData);
        ElMessage.success('API Key 更新成功');
      } else {
        await request.post('/api/public-apis', apiData);
        ElMessage.success('API Key 添加成功');
      }

      apiDialogVisible.value = false;
      await loadApiList();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存API Key失败'));
    } finally {
      savingApi.value = false;
    }
  }

  function copyApiKey(key) {
    copyTextToClipboard(String(key || '').trim()).then(() => {
      ElMessage.success('API Key 已复制到剪贴板');
    }).catch(() => {
      ElMessage.error('复制失败，请手动复制');
    });
  }

  const getPermissionLabel = getPublicApiPermissionLabel;

  function handleApiPermissionChange(value) {
    const nextSelection = resolvePublicApiPermissionSelection(
      value,
      lastPermissionSelection,
    );
    lastPermissionSelection = [...nextSelection];
    apiForm.permissions = [...nextSelection];
  }

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
    return buildApiKeyMarkdownText(api, getPublicApiPermissionLabel);
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
    apiListError,
    apiList,
    apiListLoading,
    apiDialogVisible,
    editingApi,
    apiForm,
    savingApi,
    downloadDialogVisible,
    downloadLanguage,
    downloadingApi,
    currentDownloadApi,
    loadApiList,
    showAddApiDialog,
    editApi,
    deleteApi,
    saveApi,
    resetApiForm,
    generateApiKey,
    copyApiKey,
    getPermissionLabel,
    handleApiPermissionChange,
    showApiDocumentation,
    generateApiDocumentation,
    showDownloadDialog,
    generateMarkdownDoc,
    downloadApiDoc,
  };
}
