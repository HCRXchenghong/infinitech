import { ref } from 'vue';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  appendCharityLeaderboardItem as buildNextCharityLeaderboardItems,
  appendCharityNewsItem as buildNextCharityNewsItems,
  buildCharitySettingsPayload,
  createDefaultCharitySettings,
  normalizeCharitySettings,
  removeCharityLeaderboardItem as buildNextCharityLeaderboardAfterRemove,
  removeCharityNewsItem as buildNextCharityNewsAfterRemove,
  SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES,
} from '@infinitech/admin-core';

export function useCharitySettings({ request, ElMessage, model = null, savingRef = null } = {}) {
  if (!request) {
    throw new Error('request is required');
  }

  const DEFAULT_CHARITY_SETTINGS = createDefaultCharitySettings();
  const charitySettings = model || ref(createDefaultCharitySettings());
  const savingCharitySettings = savingRef || ref(false);
  const loading = ref(false);
  const error = ref('');

  function applyCharitySettings(payload = {}) {
    charitySettings.value = normalizeCharitySettings(payload);
    return charitySettings.value;
  }

  async function loadCharitySettings(options = {}) {
    const { clearError = true, throwOnError = false } = options;
    loading.value = true;
    if (clearError) {
      error.value = '';
    }

    try {
      const response = await request.get('/api/charity-settings');
      if (response?.data) {
        applyCharitySettings(extractEnvelopeData(response.data) || {});
      }
      return charitySettings.value;
    } catch (err) {
      error.value = extractErrorMessage(err, '加载公益配置失败');
      if (throwOnError) {
        throw err;
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function saveCharitySettings(options = {}) {
    const {
      successMessage = '公益配置保存成功',
      errorMessage = '保存公益配置失败',
      reloadAfterSave = false,
      throwOnError = false,
    } = options;

    savingCharitySettings.value = true;
    try {
      const payload = buildCharitySettingsPayload(charitySettings.value);
      await request.post('/api/charity-settings', payload);
      if (reloadAfterSave) {
        await loadCharitySettings({ clearError: false, throwOnError });
      } else {
        applyCharitySettings(payload);
      }
      ElMessage?.success?.(successMessage);
      return true;
    } catch (err) {
      ElMessage?.error?.(extractErrorMessage(err, errorMessage));
      if (throwOnError) {
        throw err;
      }
      return false;
    } finally {
      savingCharitySettings.value = false;
    }
  }

  function addCharityLeaderboardItem() {
    const result = buildNextCharityLeaderboardItems(charitySettings.value.leaderboard);
    if (!result.added) {
      ElMessage?.warning?.(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.charityLeaderboard);
      return;
    }
    charitySettings.value.leaderboard = result.items;
  }

  function removeCharityLeaderboardItem(index) {
    charitySettings.value.leaderboard = buildNextCharityLeaderboardAfterRemove(
      charitySettings.value.leaderboard,
      index,
    );
  }

  function addCharityNewsItem() {
    const result = buildNextCharityNewsItems(charitySettings.value.news_list);
    if (!result.added) {
      ElMessage?.warning?.(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.charityNews);
      return;
    }
    charitySettings.value.news_list = result.items;
  }

  function removeCharityNewsItem(index) {
    charitySettings.value.news_list = buildNextCharityNewsAfterRemove(
      charitySettings.value.news_list,
      index,
    );
  }

  return {
    DEFAULT_CHARITY_SETTINGS,
    charitySettings,
    savingCharitySettings,
    loading,
    error,
    applyCharitySettings,
    loadCharitySettings,
    saveCharitySettings,
    addCharityLeaderboardItem,
    removeCharityLeaderboardItem,
    addCharityNewsItem,
    removeCharityNewsItem,
  };
}
