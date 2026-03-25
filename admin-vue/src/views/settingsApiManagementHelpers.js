import { ref, reactive } from 'vue';
import { buildApiDocumentationText, buildApiKeyMarkdownText } from './settingsDocBuilders';

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

  async function loadApiList() {
    apiListError.value = '';
    apiListLoading.value = true;
    try {
      const { data } = await request.get('/api/public-apis');
      apiList.value = Array.isArray(data) ? data : [];
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
  }

  function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    apiForm.api_key = key;
  }

  function showAddApiDialog() {
    editingApi.value = null;
    resetApiForm();
    generateApiKey();
    apiDialogVisible.value = true;
  }

  function editApi(row) {
    editingApi.value = row;
    apiForm.name = row.name || '';
    apiForm.path = row.path || '';
    apiForm.permissions = Array.isArray(row.permissions) ? [...row.permissions] : [];
    apiForm.api_key = row.api_key || '';
    apiForm.description = row.description || '';
    apiForm.is_active = row.is_active !== undefined ? row.is_active : true;
    apiDialogVisible.value = true;
  }

  async function deleteApi(row) {
    try {
      await ElMessageBox.confirm(
        `确定要删除API接口"${row.name}"吗？此操作不可恢复。`,
        '确认删除',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      );

      await request.delete(`/api/public-apis/${row.id}`);
      ElMessage.success('API接口删除成功');
      loadApiList();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败: ' + (error?.response?.data?.error || error.message));
      }
    }
  }

  async function saveApi() {
    if (!apiForm.name) {
      ElMessage.warning('请填写接口名称');
      return;
    }

    if (apiForm.permissions.length === 0) {
      ElMessage.warning('请至少选择一种访问权限');
      return;
    }

    if (!apiForm.api_key) {
      ElMessage.warning('请生成API Key');
      return;
    }

    savingApi.value = true;
    try {
      const apiData = {
        name: apiForm.name,
        path: apiForm.path,
        permissions: apiForm.permissions,
        api_key: apiForm.api_key,
        description: apiForm.description || '',
        is_active: apiForm.is_active ? 1 : 0
      };

      if (editingApi.value) {
        await request.put(`/api/public-apis/${editingApi.value.id}`, apiData);
        ElMessage.success('API接口更新成功');
      } else {
        await request.post('/api/public-apis', apiData);
        ElMessage.success('API接口添加成功');
      }

      apiDialogVisible.value = false;
      loadApiList();
    } catch (error) {
      ElMessage.error('保存失败: ' + (error?.response?.data?.error || error.message));
    } finally {
      savingApi.value = false;
    }
  }

  function copyApiKey(key) {
    navigator.clipboard.writeText(key).then(() => {
      ElMessage.success('API Key已复制到剪贴板');
    }).catch(() => {
      ElMessage.error('复制失败');
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
    const allPermissions = ['orders', 'users', 'riders', 'merchants', 'products', 'categories', 'dashboard'];
    if (value.includes('all')) {
      apiForm.permissions = [...allPermissions, 'all'];
    } else if (apiForm.permissions.length === allPermissions.length && !value.includes('all')) {
      apiForm.permissions = [...value, 'all'];
    }
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
