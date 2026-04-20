import { ref } from 'vue';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  buildWeatherConfigPayload,
  createDefaultWeatherConfig,
  normalizeWeatherConfig,
} from '@infinitech/admin-core';

const DEFAULT_WEATHER_CONFIG = createDefaultWeatherConfig();

export function useWeatherSettings({ request, ElMessage, model = null, savingRef = null } = {}) {
  if (!request) {
    throw new Error('request is required');
  }

  const weather = model || ref(createDefaultWeatherConfig());
  const saving = savingRef || ref(false);
  const loading = ref(false);
  const error = ref('');

  function applyWeatherConfig(payload = {}) {
    weather.value = normalizeWeatherConfig(payload);
    return weather.value;
  }

  async function loadWeatherConfig(options = {}) {
    const { clearError = true, throwOnError = false } = options;
    loading.value = true;
    if (clearError) {
      error.value = '';
    }

    try {
      const response = await request.get('/api/weather-config');
      if (response?.data) {
        applyWeatherConfig(extractEnvelopeData(response.data) || {});
      }
      return weather.value;
    } catch (err) {
      error.value = extractErrorMessage(err, '加载天气配置失败');
      if (throwOnError) {
        throw err;
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function saveWeatherConfig(options = {}) {
    const {
      successMessage = '天气配置保存成功',
      errorMessage = '保存天气配置失败',
      reloadAfterSave = false,
      throwOnError = false,
    } = options;

    saving.value = true;
    try {
      const payload = buildWeatherConfigPayload(weather.value);
      await request.post('/api/weather-config', payload);
      if (reloadAfterSave) {
        await loadWeatherConfig({ clearError: false, throwOnError });
      } else {
        applyWeatherConfig(payload);
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
    weather,
    saving,
    loading,
    error,
    DEFAULT_WEATHER_CONFIG,
    applyWeatherConfig,
    loadWeatherConfig,
    saveWeatherConfig,
  };
}
