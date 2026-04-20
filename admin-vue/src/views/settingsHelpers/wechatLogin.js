import { ref } from 'vue';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  buildWechatLoginConfigPayload,
  createDefaultWechatLoginConfig,
  normalizeWechatLoginConfig,
} from '@infinitech/admin-core';

export function useWechatLoginSettings({ request, ElMessage, model = null, savingRef = null } = {}) {
  if (!request) {
    throw new Error('request is required');
  }

  const DEFAULT_WECHAT_LOGIN_CONFIG = createDefaultWechatLoginConfig();
  const wechatLoginConfig = model || ref(createDefaultWechatLoginConfig());
  const savingWechatLoginConfig = savingRef || ref(false);
  const loading = ref(false);
  const error = ref('');

  function applyWechatLoginConfig(payload = {}) {
    wechatLoginConfig.value = normalizeWechatLoginConfig(payload);
    return wechatLoginConfig.value;
  }

  async function loadWechatLoginConfig(options = {}) {
    const { clearError = true, throwOnError = false } = options;
    loading.value = true;
    if (clearError) {
      error.value = '';
    }

    try {
      const response = await request.get('/api/wechat-login-config');
      if (response?.data) {
        applyWechatLoginConfig(extractEnvelopeData(response.data) || {});
      }
      return wechatLoginConfig.value;
    } catch (err) {
      error.value = extractErrorMessage(err, '加载微信登录配置失败');
      if (throwOnError) {
        throw err;
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function saveWechatLoginConfig(options = {}) {
    const {
      successMessage = '微信登录配置保存成功',
      errorMessage = '保存微信登录配置失败',
      reloadAfterSave = false,
      throwOnError = false,
    } = options;

    savingWechatLoginConfig.value = true;
    try {
      const payload = buildWechatLoginConfigPayload(wechatLoginConfig.value);
      await request.post('/api/wechat-login-config', payload);
      if (reloadAfterSave) {
        await loadWechatLoginConfig({ clearError: false, throwOnError });
      } else {
        applyWechatLoginConfig({
          ...payload,
          app_secret: '',
          has_app_secret: payload.app_secret !== '' || wechatLoginConfig.value.has_app_secret,
        });
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
      savingWechatLoginConfig.value = false;
    }
  }

  return {
    DEFAULT_WECHAT_LOGIN_CONFIG,
    wechatLoginConfig,
    savingWechatLoginConfig,
    loading,
    error,
    applyWechatLoginConfig,
    loadWechatLoginConfig,
    saveWechatLoginConfig,
  };
}
