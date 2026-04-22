import { computed, onMounted, reactive, ref } from 'vue';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';

function createOption(source = {}) {
  return {
    key: String(source.key || '').trim(),
    label: String(source.label || '').trim(),
    enabled: source.enabled !== false,
    sort_order: Number(source.sort_order || 0),
    aliases: Array.isArray(source.aliases)
      ? source.aliases.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
  };
}

function normalizePayload(payload = {}) {
  return {
    merchant_types: (Array.isArray(payload.merchant_types) ? payload.merchant_types : []).map(createOption),
    business_categories: (Array.isArray(payload.business_categories) ? payload.business_categories : []).map(createOption),
  };
}

function validateOptions(items, label) {
  const seen = new Set();

  for (const item of items) {
    if (!item.key || !item.label) {
      return `${label}存在未填写的 key 或 label`;
    }

    if (seen.has(item.key)) {
      return `${label}内部 key 重复：${item.key}`;
    }

    seen.add(item.key);
  }

  return '';
}

export function useMerchantTaxonomySettingsPage({ request, ElMessage, ElMessageBox }) {
  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref('');
  const form = reactive({
    merchant_types: [],
    business_categories: [],
  });

  const merchantTypes = computed(() =>
    [...form.merchant_types].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0)),
  );

  const businessCategories = computed(() =>
    [...form.business_categories].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0)),
  );

  onMounted(() => {
    void loadSettings();
  });

  async function loadSettings(forceRefresh = false) {
    loading.value = true;
    loadError.value = '';
    try {
      const { data } = await request.get('/api/merchant-taxonomy-settings', {
        params: forceRefresh ? { _t: Date.now() } : undefined,
      });
      Object.assign(form, normalizePayload(extractEnvelopeData(data) || {}));
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载商户业务字典失败');
    } finally {
      loading.value = false;
    }
  }

  async function saveSettings() {
    const validationMessage =
      validateOptions(form.merchant_types, '商户类型') ||
      validateOptions(form.business_categories, '业务分类');
    if (validationMessage) {
      ElMessage.warning(validationMessage);
      return;
    }

    try {
      await ElMessageBox.confirm(
        '保存后商户端建店、店铺编辑和首页分类映射会同步使用新字典，确认继续吗？',
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
      const payload = {
        merchant_types: form.merchant_types.map(createOption),
        business_categories: form.business_categories.map(createOption),
      };
      const { data } = await request.post('/api/merchant-taxonomy-settings', payload);
      Object.assign(form, normalizePayload(extractEnvelopeData(data) || payload));
      ElMessage.success('商户业务字典已保存');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存商户业务字典失败'));
    } finally {
      saving.value = false;
    }
  }

  return {
    businessCategories,
    loadError,
    loading,
    loadSettings,
    merchantTypes,
    saveSettings,
    saving,
  };
}
