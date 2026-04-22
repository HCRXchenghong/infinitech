import { computed, onMounted, reactive, ref } from 'vue';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  buildErrandHomeViewModel,
  buildErrandSettingsPayload,
  createDefaultErrandSettings,
  getSortedErrandServices,
  normalizeErrandSettings,
  validateErrandSettings,
} from '@infinitech/domain-core';

export function useErrandSettingsPage({ request, ElMessage, ElMessageBox }) {
  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref('');
  const form = reactive(createDefaultErrandSettings());

  const sortedServices = computed(() => getSortedErrandServices(form.services));
  const preview = computed(() => buildErrandHomeViewModel(form));

  onMounted(() => {
    void loadSettings();
  });

  async function loadSettings(forceRefresh = false) {
    loading.value = true;
    loadError.value = '';
    try {
      const { data } = await request.get('/api/errand-settings', {
        params: forceRefresh ? { _t: Date.now() } : undefined,
      });
      Object.assign(form, normalizeErrandSettings(extractEnvelopeData(data) || {}));
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载跑腿配置失败');
    } finally {
      loading.value = false;
    }
  }

  async function saveSettings() {
    const validation = validateErrandSettings(form);
    if (!validation.valid) {
      ElMessage.warning(validation.message);
      return;
    }

    try {
      await ElMessageBox.confirm(
        '保存后跑腿首页与详情提示会立即变更，确认提交吗？',
        '确认保存',
        {
          type: 'warning',
        },
      );
    } catch (_error) {
      return;
    }

    saving.value = true;
    try {
      const payload = buildErrandSettingsPayload(form);
      const { data } = await request.post('/api/errand-settings', payload);
      Object.assign(form, normalizeErrandSettings(extractEnvelopeData(data) || payload));
      ElMessage.success('跑腿配置已保存');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存跑腿配置失败'));
    } finally {
      saving.value = false;
    }
  }

  return {
    form,
    loadError,
    loading,
    loadSettings,
    preview,
    saveSettings,
    saving,
    sortedServices,
  };
}
