import { ref } from 'vue';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  appendVIPBenefit as buildNextVIPBenefits,
  appendVIPLevel as buildNextVIPLevels,
  appendVIPPointRule as buildNextVIPPointRules,
  appendVIPTask as buildNextVIPTasks,
  buildVIPSettingsPayload,
  createDefaultVIPSettings,
  normalizeVIPSettings,
  removeVIPBenefit as buildNextVIPBenefitsAfterRemove,
  removeVIPLevel as buildNextVIPLevelsAfterRemove,
  removeVIPPointRule as buildNextVIPPointRulesAfterRemove,
  removeVIPTask as buildNextVIPTasksAfterRemove,
  SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES,
} from '@infinitech/admin-core';

export function useVipSettings({ request, ElMessage, model = null, savingRef = null } = {}) {
  if (!request) {
    throw new Error('request is required');
  }

  const DEFAULT_VIP_SETTINGS = createDefaultVIPSettings();
  const vipSettings = model || ref(createDefaultVIPSettings());
  const savingVipSettings = savingRef || ref(false);
  const loading = ref(false);
  const error = ref('');

  function applyVipSettings(payload = {}) {
    vipSettings.value = normalizeVIPSettings(payload);
    return vipSettings.value;
  }

  async function loadVipSettings(options = {}) {
    const { clearError = true, throwOnError = false } = options;
    loading.value = true;
    if (clearError) {
      error.value = '';
    }

    try {
      const response = await request.get('/api/vip-settings');
      if (response?.data) {
        applyVipSettings(extractEnvelopeData(response.data) || {});
      }
      return vipSettings.value;
    } catch (err) {
      error.value = extractErrorMessage(err, '加载会员配置失败');
      if (throwOnError) {
        throw err;
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function saveVIPSettings(options = {}) {
    const {
      successMessage = '会员配置保存成功',
      errorMessage = '保存会员配置失败',
      reloadAfterSave = false,
      throwOnError = false,
    } = options;

    savingVipSettings.value = true;
    try {
      const payload = buildVIPSettingsPayload(vipSettings.value);
      await request.post('/api/vip-settings', payload);
      if (reloadAfterSave) {
        await loadVipSettings({ clearError: false, throwOnError });
      } else {
        applyVipSettings(payload);
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
      savingVipSettings.value = false;
    }
  }

  function addVIPLevel() {
    const result = buildNextVIPLevels(vipSettings.value.levels);
    if (!result.added) {
      ElMessage?.warning?.(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.vipLevels);
      return;
    }
    vipSettings.value.levels = result.items;
  }

  function removeVIPLevel(index) {
    vipSettings.value.levels = buildNextVIPLevelsAfterRemove(
      vipSettings.value.levels,
      index,
    );
  }

  function addVIPBenefit(levelIndex) {
    const result = buildNextVIPBenefits(vipSettings.value.levels, levelIndex);
    if (!result.added) {
      ElMessage?.warning?.(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.vipBenefitsPerLevel);
      return;
    }
    vipSettings.value.levels = result.levels;
  }

  function removeVIPBenefit(levelIndex, benefitIndex) {
    vipSettings.value.levels = buildNextVIPBenefitsAfterRemove(
      vipSettings.value.levels,
      levelIndex,
      benefitIndex,
    );
  }

  function addVIPTask() {
    const result = buildNextVIPTasks(vipSettings.value.growth_tasks);
    if (!result.added) {
      ElMessage?.warning?.(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.vipTasks);
      return;
    }
    vipSettings.value.growth_tasks = result.items;
  }

  function removeVIPTask(index) {
    vipSettings.value.growth_tasks = buildNextVIPTasksAfterRemove(
      vipSettings.value.growth_tasks,
      index,
    );
  }

  function addVIPPointRule() {
    const result = buildNextVIPPointRules(vipSettings.value.point_rules);
    if (!result.added) {
      ElMessage?.warning?.(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.vipPointRules);
      return;
    }
    vipSettings.value.point_rules = result.items;
  }

  function removeVIPPointRule(index) {
    vipSettings.value.point_rules = buildNextVIPPointRulesAfterRemove(
      vipSettings.value.point_rules,
      index,
    );
  }

  return {
    DEFAULT_VIP_SETTINGS,
    vipSettings,
    savingVipSettings,
    loading,
    error,
    applyVipSettings,
    loadVipSettings,
    saveVIPSettings,
    addVIPLevel,
    removeVIPLevel,
    addVIPBenefit,
    removeVIPBenefit,
    addVIPTask,
    removeVIPTask,
    addVIPPointRule,
    removeVIPPointRule,
  };
}
