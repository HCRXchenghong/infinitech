import { computed, onMounted, reactive, ref } from 'vue';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';

function createLevel(source = {}) {
  return {
    level: Number(source.level || 0),
    key: String(source.key || '').trim(),
    name: String(source.name || '').trim(),
    icon: String(source.icon || '').trim(),
    desc: String(source.desc || '').trim(),
    progress_template: String(source.progress_template || '').trim(),
    threshold_rules: Array.isArray(source.threshold_rules)
      ? source.threshold_rules.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
  };
}

function normalizePayload(payload = {}) {
  return {
    levels: (Array.isArray(payload.levels) ? payload.levels : []).map(createLevel),
  };
}

function validateLevels(levels = []) {
  if (!levels.length) {
    return '骑手等级配置不能为空';
  }

  for (const item of levels) {
    if (!item.level || !item.key || !item.name) {
      return '骑手等级存在未填写的 level、key 或 name';
    }
  }

  return '';
}

export function useRiderRankSettingsPage({ request, ElMessage, ElMessageBox }) {
  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref('');
  const form = reactive({
    levels: [],
  });

  const sortedLevels = computed(() =>
    [...form.levels].sort((left, right) => Number(left.level || 0) - Number(right.level || 0)),
  );

  onMounted(() => {
    void loadSettings();
  });

  async function loadSettings(forceRefresh = false) {
    loading.value = true;
    loadError.value = '';
    try {
      const { data } = await request.get('/api/rider-rank-settings', {
        params: forceRefresh ? { _t: Date.now() } : undefined,
      });
      Object.assign(form, normalizePayload(extractEnvelopeData(data) || {}));
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载骑手等级配置失败');
    } finally {
      loading.value = false;
    }
  }

  async function saveSettings() {
    const validationMessage = validateLevels(form.levels);
    if (validationMessage) {
      ElMessage.warning(validationMessage);
      return;
    }

    try {
      await ElMessageBox.confirm(
        '保存后骑手端等级名称、图标和进度文案会同步更新，确认继续吗？',
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
        levels: form.levels.map(createLevel),
      };
      const { data } = await request.post('/api/rider-rank-settings', payload);
      Object.assign(form, normalizePayload(extractEnvelopeData(data) || payload));
      ElMessage.success('骑手等级配置已保存');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存骑手等级配置失败'));
    } finally {
      saving.value = false;
    }
  }

  return {
    form,
    loadError,
    loading,
    loadSettings,
    saveSettings,
    saving,
    sortedLevels,
  };
}
