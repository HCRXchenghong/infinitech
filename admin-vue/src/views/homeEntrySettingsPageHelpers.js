import { computed, onMounted, reactive, ref } from 'vue';
import {
  buildAdminHomeEntryPreviewEntries,
  buildAdminHomeEntrySettingsPayload,
  canAdminHomeEntryShowImageIcon,
  createAdminHomeEntryDraft,
  DEFAULT_ADMIN_HOME_ENTRY_PREVIEW_CLIENT,
  getAdminHomeEntryRoutePlaceholder,
  normalizeAdminHomeEntrySettings,
  validateAdminHomeEntries,
} from '@infinitech/admin-core';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';

export function useHomeEntrySettingsPage({ request, ElMessage, ElMessageBox }) {
  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref('');
  const previewClient = ref(DEFAULT_ADMIN_HOME_ENTRY_PREVIEW_CLIENT);
  const form = reactive(normalizeAdminHomeEntrySettings());

  const pageError = computed(() => loadError.value);
  const previewEntries = computed(() =>
    buildAdminHomeEntryPreviewEntries(form.entries, previewClient.value),
  );

  function updatePreviewClient(value) {
    previewClient.value = value || DEFAULT_ADMIN_HOME_ENTRY_PREVIEW_CLIENT;
  }

  function showImageIcon(entry) {
    return canAdminHomeEntryShowImageIcon(entry);
  }

  async function loadSettings(forceRefresh = false) {
    loading.value = true;
    loadError.value = '';
    try {
      const { data } = await request.get('/api/home-entry-settings', {
        params: forceRefresh ? { _t: Date.now() } : undefined,
      });
      Object.assign(form, normalizeAdminHomeEntrySettings(extractEnvelopeData(data) || {}));
    } catch (error) {
      form.entries = [];
      loadError.value = extractErrorMessage(error, '加载首页入口配置失败');
    } finally {
      loading.value = false;
    }
  }

  function addEntry() {
    form.entries.push(createAdminHomeEntryDraft(form.entries));
  }

  function moveEntry(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= form.entries.length) {
      return;
    }

    const current = form.entries[index];
    form.entries[index] = form.entries[target];
    form.entries[target] = current;
  }

  async function removeEntry(index) {
    try {
      await ElMessageBox.confirm('删除后保存配置才会正式生效，是否继续？', '确认删除', {
        type: 'warning',
      });
    } catch (_error) {
      return;
    }

    form.entries.splice(index, 1);
  }

  async function saveSettings() {
    const validation = validateAdminHomeEntries(form.entries);
    if (!validation.valid) {
      ElMessage.warning(validation.message);
      return;
    }

    try {
      await ElMessageBox.confirm(
        '保存后首页入口会同时影响用户端与 App，确认提交吗？',
        '确认保存',
        {
          type: 'warning',
          confirmButtonText: '确认保存',
        },
      );
    } catch (_error) {
      return;
    }

    saving.value = true;
    try {
      const payload = buildAdminHomeEntrySettingsPayload(form.entries);
      const { data } = await request.post('/api/home-entry-settings', payload);
      Object.assign(form, normalizeAdminHomeEntrySettings(extractEnvelopeData(data) || payload));
      ElMessage.success('首页入口配置已保存');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存首页入口配置失败'));
    } finally {
      saving.value = false;
    }
  }

  onMounted(() => {
    void loadSettings();
  });

  return {
    addEntry,
    form,
    loadError,
    loadSettings,
    loading,
    moveEntry,
    pageError,
    previewClient,
    previewEntries,
    removeEntry,
    routePlaceholder: getAdminHomeEntryRoutePlaceholder,
    saveSettings,
    saving,
    showImageIcon,
    updatePreviewClient,
  };
}
