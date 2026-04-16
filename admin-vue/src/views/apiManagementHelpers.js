import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  buildWeatherConfigPayload,
  createDefaultWeatherConfig,
  normalizeWeatherConfig,
} from '@infinitech/admin-core';
import request from '@/utils/request';
import { DEFAULT_SMS_CONFIG, normalizeSMSConfig, buildSMSConfigPayload } from './smsConfigHelpers';

const DEFAULT_WEATHER_CONFIG = createDefaultWeatherConfig();

export function useApiManagementPage(options = {}) {
  const router = useRouter();
  const includeExternalApiManagement = options.includeExternalApiManagement !== false;

  const isMobile = ref(window.innerWidth <= 768);
  const handleResize = () => {
    isMobile.value = window.innerWidth <= 768;
  };

  const loading = ref(false);
  const saving = ref(false);
  const settingsError = ref('');
  const apiListError = ref('');
  const pageError = computed(() => settingsError.value || apiListError.value || '');
  const sms = ref({ ...DEFAULT_SMS_CONFIG });
  const weather = ref(createDefaultWeatherConfig());

  const apiList = ref([]);
  const apiListLoading = ref(false);
  const apiDialogVisible = ref(false);
  const apiListCache = ref(null);
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

  function mergeWeatherConfig(payload = {}) {
    weather.value = normalizeWeatherConfig(payload);
  }

  onMounted(() => {
    loadAll();
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
  });

  async function loadAll(forceRefresh = false) {
    settingsError.value = '';
    loading.value = true;
    try {
      const [smsResp, weaResp] = await Promise.allSettled([
        request.get('/api/sms-config'),
        request.get('/api/weather-config')
      ]);
      let firstError = '';

      if (smsResp.status === 'fulfilled' && smsResp.value?.data) {
        sms.value = normalizeSMSConfig(extractEnvelopeData(smsResp.value.data) || {});
      } else if (smsResp.status === 'rejected') {
        firstError = extractErrorMessage(smsResp.reason, '加载短信配置失败，请稍后重试');
      }

      if (weaResp.status === 'fulfilled' && weaResp.value?.data) {
        mergeWeatherConfig(extractEnvelopeData(weaResp.value.data) || {});
      } else if (weaResp.status === 'rejected' && !firstError) {
        firstError = extractErrorMessage(weaResp.reason, '加载天气配置失败，请稍后重试');
      }

      if (firstError) {
        settingsError.value = firstError;
      }
    } catch (error) {
      settingsError.value = extractErrorMessage(error, '加载系统配置失败，请稍后重试');
    } finally {
      loading.value = false;
    }

    if (includeExternalApiManagement) {
      loadApiList(forceRefresh);
    }
  }

  async function saveSms() {
    saving.value = true;
    try {
      await request.post('/api/sms-config', buildSMSConfigPayload(sms.value));
      ElMessage.success('短信配置保存成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存短信配置失败'));
    } finally {
      saving.value = false;
    }
  }

  async function saveWeather() {
    saving.value = true;
    try {
      const payload = buildWeatherConfigPayload(weather.value);
      await request.post('/api/weather-config', payload);
      weather.value = normalizeWeatherConfig(payload);
      ElMessage.success('天气配置保存成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存天气配置失败'));
    } finally {
      saving.value = false;
    }
  }

  async function loadApiList(forceRefresh = false) {
    if (!forceRefresh && apiListCache.value) {
      apiListError.value = '';
      apiList.value = apiListCache.value;
      return;
    }

    apiListError.value = '';
    apiListLoading.value = true;
    try {
      const { data } = await request.get('/api/public-apis');
      const payload = extractEnvelopeData(data);
      apiList.value = Array.isArray(payload) ? payload : [];
      apiListCache.value = [...apiList.value];
    } catch (error) {
      apiList.value = [];
      apiListError.value = extractErrorMessage(error, '加载API接口列表失败，请稍后重试');
    } finally {
      apiListLoading.value = false;
    }
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
      apiListCache.value = null;
      loadApiList(true);
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(extractErrorMessage(error, '删除API接口失败'));
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
      apiListCache.value = null;
      loadApiList(true);
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存API接口失败'));
    } finally {
      savingApi.value = false;
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
      dashboard: '仪表盘',
      all: '全部'
    };
    return labels[perm] || perm;
  }

  function handleApiPermissionChange(value) {
    if (value.includes('all')) {
      apiForm.permissions = ['orders', 'users', 'riders', 'dashboard', 'all'];
    } else if (apiForm.permissions.length === 4 && !value.includes('all')) {
      apiForm.permissions = [...value, 'all'];
    }
  }

  function goToApiPermissions() {
    router.push('/api-permissions');
  }

  function showDownloadDialog(row) {
    currentDownloadApi.value = row;
    downloadLanguage.value = 'java';
    downloadDialogVisible.value = true;
  }

  function generateRpcSignature(params, apiKey, timestamp) {
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys.map((key) => `${key}=${params[key]}`).join('&');
    const fullStr = `${signStr}&api_key=${apiKey}&timestamp=${timestamp}`;

    let hash = 0;
    for (let i = 0; i < fullStr.length; i++) {
      const char = fullStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash;
    }
    return Math.abs(hash).toString(16);
  }

  function generateMarkdownDoc(api) {
    const timestamp = Date.now();
    const signature = generateRpcSignature({}, api.api_key, timestamp);

    return `# ${api.name} - API 接口文档

## 接口信息
- **接口名称**: ${api.name}
- **接口路径**: ${api.path}
- **请求方式**: POST
- **协议**: HTTPS
- **数据格式**: JSON
- **认证方式**: RPC签名

## 接口描述
${api.description || '无描述'}

## 访问权限
${api.permissions.map((p) => `- ${getPermissionLabel(p)}`).join('\n')}

## 请求说明

### 请求头
\`\`\`
Content-Type: application/json
X-API-Key: ${api.api_key}
X-Timestamp: [时间戳]
X-Signature: [签名]
\`\`\`

## RPC签名说明

### 签名算法
1. 将所有请求参数（不包括sign）按key进行字典序排序
2. 将排序后的参数拼接成字符串：key1=value1&key2=value2&api_key=YOUR_API_KEY&timestamp=TIMESTAMP
3. 对拼接后的字符串进行MD5加密
4. 将加密后的字符串作为sign参数

## 状态
${api.is_active ? '✅ 已启用' : '❌ 已禁用'}

## 示例签名
- timestamp: ${timestamp}
- signature: ${signature}
`;
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
    isMobile,
    loading,
    saving,
    pageError,
    sms,
    weather,
    apiList,
    apiListLoading,
    apiDialogVisible,
    editingApi,
    apiForm,
    savingApi,
    downloadDialogVisible,
    downloadLanguage,
    downloadingApi,
    loadAll,
    saveSms,
    saveWeather,
    loadApiList,
    showAddApiDialog,
    editApi,
    deleteApi,
    saveApi,
    generateApiKey,
    copyApiKey,
    getPermissionLabel,
    handleApiPermissionChange,
    goToApiPermissions,
    showDownloadDialog,
    downloadApiDoc
  };
}
