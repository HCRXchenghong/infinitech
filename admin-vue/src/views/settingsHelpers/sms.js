import { ref } from 'vue';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import { DEFAULT_SMS_CONFIG, normalizeSMSConfig, buildSMSConfigPayload } from '../smsConfigHelpers';

export function useSmsSettings({ request, ElMessage, model = null, savingRef = null } = {}) {
  if (!request) {
    throw new Error('request is required');
  }

  const sms = model || ref({ ...DEFAULT_SMS_CONFIG });
  const saving = savingRef || ref(false);
  const loading = ref(false);
  const error = ref('');

  function applySmsConfig(payload = {}) {
    sms.value = normalizeSMSConfig(payload);
    return sms.value;
  }

  async function loadSmsConfig(options = {}) {
    const { clearError = true, throwOnError = false } = options;
    loading.value = true;
    if (clearError) {
      error.value = '';
    }

    try {
      const response = await request.get('/api/sms-config');
      if (response?.data) {
        applySmsConfig(extractEnvelopeData(response.data) || {});
      }
      return sms.value;
    } catch (err) {
      error.value = extractErrorMessage(err, '加载短信配置失败');
      if (throwOnError) {
        throw err;
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function saveSmsConfig(options = {}) {
    const {
      successMessage = '短信配置保存成功',
      errorMessage = '保存短信配置失败',
      reloadAfterSave = false,
      throwOnError = false,
    } = options;

    saving.value = true;
    try {
      await request.post('/api/sms-config', buildSMSConfigPayload(sms.value));
      if (reloadAfterSave) {
        await loadSmsConfig({ clearError: false, throwOnError });
      } else {
        applySmsConfig(sms.value);
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
      saving.value = false;
    }
  }

  return {
    sms,
    saving,
    loading,
    error,
    applySmsConfig,
    loadSmsConfig,
    saveSmsConfig,
  };
}
