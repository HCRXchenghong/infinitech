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

function createPublicApiManagementMessages(overrides = {}) {
  return {
    loadError: '加载API接口列表失败，请稍后重试',
    missingName: '请填写接口名称',
    missingPermissions: '请至少选择一种访问权限',
    missingApiKey: '请生成API Key',
    createSuccess: 'API接口添加成功',
    updateSuccess: 'API接口更新成功',
    saveError: '保存API接口失败',
    deleteSuccess: 'API接口删除成功',
    deleteError: '删除API接口失败',
    copySuccess: 'API Key已复制到剪贴板',
    copyError: '复制失败',
    deleteConfirmTitle: '确认删除',
    deleteConfirmButtonText: '确定删除',
    deleteCancelButtonText: '取消',
    deleteConfirmMessage(target) {
      return `确定要删除API接口"${target.name}"吗？此操作不可恢复。`;
    },
    ...overrides,
  };
}

export function usePublicApiManagement({
  request,
  ElMessage,
  ElMessageBox,
  cache = false,
  messages: messageOverrides = {},
}) {
  const messages = createPublicApiManagementMessages(messageOverrides);
  const apiListError = ref('');
  const apiList = ref([]);
  const apiListLoading = ref(false);
  const apiDialogVisible = ref(false);
  const editingApi = ref(null);
  const apiForm = reactive(createPublicApiFormState());
  const savingApi = ref(false);
  const apiListCache = cache ? ref(null) : null;
  let lastPermissionSelection = [];

  function syncPermissionSelection(value = apiForm.permissions) {
    const normalized = normalizePublicApiPermissionList(value);
    lastPermissionSelection = [...normalized];
    apiForm.permissions = [...normalized];
  }

  function invalidateApiListCache() {
    if (apiListCache) {
      apiListCache.value = null;
    }
  }

  async function loadApiList(forceRefresh = false) {
    if (apiListCache && !forceRefresh && apiListCache.value) {
      apiListError.value = '';
      apiList.value = [...apiListCache.value];
      return;
    }

    apiListError.value = '';
    apiListLoading.value = true;
    try {
      const { data } = await request.get('/api/public-apis');
      const payload = extractEnvelopeData(data);
      const normalized = normalizePublicApiList(payload);
      apiList.value = normalized;
      if (apiListCache) {
        apiListCache.value = [...normalized];
      }
    } catch (error) {
      apiList.value = [];
      invalidateApiListCache();
      apiListError.value = extractErrorMessage(error, messages.loadError);
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
        messages.deleteConfirmMessage(target),
        messages.deleteConfirmTitle,
        {
          confirmButtonText: messages.deleteConfirmButtonText,
          cancelButtonText: messages.deleteCancelButtonText,
          type: 'warning',
        }
      );

      await request.delete(`/api/public-apis/${target.id}`);
      ElMessage.success(messages.deleteSuccess);
      invalidateApiListCache();
      await loadApiList(true);
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(extractErrorMessage(error, messages.deleteError));
      }
    }
  }

  async function saveApi() {
    const apiData = buildPublicApiPayload(apiForm);

    if (!apiData.name) {
      ElMessage.warning(messages.missingName);
      return;
    }

    if (apiData.permissions.length === 0) {
      ElMessage.warning(messages.missingPermissions);
      return;
    }

    if (!apiData.api_key) {
      ElMessage.warning(messages.missingApiKey);
      return;
    }

    savingApi.value = true;
    try {
      if (editingApi.value) {
        await request.put(`/api/public-apis/${editingApi.value.id}`, apiData);
        ElMessage.success(messages.updateSuccess);
      } else {
        await request.post('/api/public-apis', apiData);
        ElMessage.success(messages.createSuccess);
      }

      apiDialogVisible.value = false;
      invalidateApiListCache();
      await loadApiList(true);
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, messages.saveError));
    } finally {
      savingApi.value = false;
    }
  }

  function copyApiKey(key) {
    copyTextToClipboard(String(key || '').trim()).then(() => {
      ElMessage.success(messages.copySuccess);
    }).catch(() => {
      ElMessage.error(messages.copyError);
    });
  }

  function handleApiPermissionChange(value) {
    const nextSelection = resolvePublicApiPermissionSelection(
      value,
      lastPermissionSelection,
    );
    lastPermissionSelection = [...nextSelection];
    apiForm.permissions = [...nextSelection];
  }

  return {
    apiListError,
    apiList,
    apiListLoading,
    apiDialogVisible,
    editingApi,
    apiForm,
    savingApi,
    loadApiList,
    resetApiForm,
    generateApiKey,
    showAddApiDialog,
    editApi,
    deleteApi,
    saveApi,
    copyApiKey,
    getPermissionLabel: getPublicApiPermissionLabel,
    handleApiPermissionChange,
    invalidateApiListCache,
  };
}
