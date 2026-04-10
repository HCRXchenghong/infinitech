import { ref, reactive } from 'vue';
import { buildApiDocumentationText, buildApiKeyMarkdownText } from './settingsDocBuilders';

const RESOURCE_PERMISSIONS = ['orders', 'users', 'riders', 'merchants', 'products', 'categories', 'dashboard'];

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(text)) {
      return true;
    }
    if (['0', 'false', 'no', 'off', ''].includes(text)) {
      return false;
    }
  }
  return fallback;
}

function normalizePermissionList(value) {
  let source = [];

  if (Array.isArray(value)) {
    source = value;
  } else if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return [];
    }

    try {
      const parsed = JSON.parse(text);
      source = Array.isArray(parsed) ? parsed : [text];
    } catch (_error) {
      source = text.split(',').map((item) => item.trim());
    }
  }

  const selected = new Set(
    source
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  );
  const normalized = RESOURCE_PERMISSIONS.filter((permission) => selected.has(permission));

  if (selected.has('all') || normalized.length === RESOURCE_PERMISSIONS.length) {
    return [...RESOURCE_PERMISSIONS, 'all'];
  }

  return normalized;
}

function normalizeApiRecord(item = {}) {
  return {
    ...item,
    name: String(item?.name || '').trim(),
    path: String(item?.path || '').trim(),
    permissions: normalizePermissionList(item?.permissions),
    api_key: String(item?.api_key || '').trim(),
    description: String(item?.description || '').trim(),
    is_active: normalizeBoolean(item?.is_active, true),
  };
}

function generateRandomApiKey(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
  }

  let key = '';
  for (let i = 0; i < length; i += 1) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

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

export function useSettingsApiManagement({ request, router, ElMessage, ElMessageBox, extractErrorMessage }) {
  const apiListError = ref('');
  const apiList = ref([]);
  const apiListLoading = ref(false);
  const apiDialogVisible = ref(false);
  const editingApi = ref(null);
  const apiForm = reactive({
    name: '',
    path: '',
    permissions: [],
    api_key: '',
    description: '',
    is_active: true
  });
  const savingApi = ref(false);

  const downloadDialogVisible = ref(false);
  const downloadLanguage = ref('java');
  const downloadingApi = ref(false);
  const currentDownloadApi = ref(null);
  let lastPermissionSelection = [];

  function syncPermissionSelection(value = apiForm.permissions) {
    const normalized = normalizePermissionList(value);
    lastPermissionSelection = [...normalized];
    apiForm.permissions = [...normalized];
  }

  async function loadApiList() {
    apiListError.value = '';
    apiListLoading.value = true;
    try {
      const { data } = await request.get('/api/public-apis');
      const rows = Array.isArray(data) ? data : [];
      apiList.value = rows.map((row) => normalizeApiRecord(row));
    } catch (error) {
      apiList.value = [];
      apiListError.value = extractErrorMessage
        ? extractErrorMessage(error, '加载API配置失败，请稍后重试')
        : (error?.response?.data?.error || error?.message || '加载API配置失败，请稍后重试');
    } finally {
      apiListLoading.value = false;
    }
  }

  function resetApiForm() {
    apiForm.name = '';
    apiForm.path = '';
    apiForm.permissions = [];
    apiForm.api_key = '';
    apiForm.description = '';
    apiForm.is_active = true;
    syncPermissionSelection([]);
  }

  function generateApiKey() {
    apiForm.api_key = generateRandomApiKey();
  }

  function showAddApiDialog() {
    editingApi.value = null;
    resetApiForm();
    generateApiKey();
    apiDialogVisible.value = true;
  }

  function editApi(row) {
    const normalizedRow = normalizeApiRecord(row);
    editingApi.value = normalizedRow;
    apiForm.name = normalizedRow.name;
    apiForm.path = normalizedRow.path;
    apiForm.permissions = [...normalizedRow.permissions];
    apiForm.api_key = normalizedRow.api_key;
    apiForm.description = normalizedRow.description;
    apiForm.is_active = normalizedRow.is_active;
    syncPermissionSelection(apiForm.permissions);
    apiDialogVisible.value = true;
  }

  async function deleteApi(row) {
    const target = normalizeApiRecord(row);
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
        ElMessage.error('删除失败: ' + (error?.response?.data?.error || error.message));
      }
    }
  }

  async function saveApi() {
    const name = String(apiForm.name || '').trim();
    const path = String(apiForm.path || '').trim();
    const permissions = normalizePermissionList(apiForm.permissions);
    const apiKey = String(apiForm.api_key || '').trim();
    const description = String(apiForm.description || '').trim();

    if (!name) {
      ElMessage.warning('请填写调用方名称');
      return;
    }

    if (permissions.length === 0) {
      ElMessage.warning('请至少选择一种访问权限');
      return;
    }

    if (!apiKey) {
      ElMessage.warning('请生成API Key');
      return;
    }

    savingApi.value = true;
    try {
      const apiData = {
        name,
        path,
        permissions,
        api_key: apiKey,
        description,
        is_active: Boolean(apiForm.is_active)
      };

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
      ElMessage.error('保存失败: ' + (error?.response?.data?.error || error.message));
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

  function getPermissionLabel(perm) {
    const labels = {
      orders: '订单',
      users: '用户',
      riders: '骑手',
      merchants: '商户',
      products: '商品',
      categories: '分类',
      dashboard: '仪表盘',
      all: '全部'
    };
    return labels[perm] || perm;
  }

  function handleApiPermissionChange(value) {
    const selected = Array.isArray(value)
      ? value.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    const prevHadAll = lastPermissionSelection.includes('all');
    const currentHadAll = selected.includes('all');
    const selectedResources = RESOURCE_PERMISSIONS.filter((permission) => selected.includes(permission));
    let nextSelection = [...selectedResources];

    if (currentHadAll && !prevHadAll) {
      nextSelection = [...RESOURCE_PERMISSIONS, 'all'];
    } else if (currentHadAll && prevHadAll && selectedResources.length < RESOURCE_PERMISSIONS.length) {
      nextSelection = [...selectedResources];
    } else if (!currentHadAll && selectedResources.length === RESOURCE_PERMISSIONS.length) {
      nextSelection = [...RESOURCE_PERMISSIONS, 'all'];
    }

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
    return buildApiKeyMarkdownText(api, getPermissionLabel);
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
      ElMessage.error('下载失败: ' + (error?.response?.data?.error || error.message));
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
