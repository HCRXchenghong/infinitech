import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  buildWeatherConfigPayload,
  createDefaultWeatherConfig,
  normalizeWeatherConfig,
} from '@infinitech/admin-core';
import request from '@/utils/request';

const DEFAULT_WEATHER_CONFIG = createDefaultWeatherConfig();

/**
 * 天气配置模块
 */
export function useWeatherSettings() {
  const weather = ref(createDefaultWeatherConfig());
  const saving = ref(false);
  const loading = ref(false);
  const error = ref('');

  /**
   * 合并天气配置
   */
  function mergeWeatherConfig(payload = {}) {
    weather.value = normalizeWeatherConfig(payload);
  }

  /**
   * 加载天气配置
   */
  async function loadWeatherConfig() {
    loading.value = true;
    error.value = '';
    try {
      const res = await request.get('/api/weather-config');
      if (res?.data) {
        mergeWeatherConfig(extractEnvelopeData(res.data) || {});
      }
    } catch (err) {
      error.value = extractErrorMessage(err, '加载天气配置失败');
    } finally {
      loading.value = false;
    }
  }

  /**
   * 保存天气配置
   */
  async function saveWeatherConfig() {
    saving.value = true;
    try {
      const payload = buildWeatherConfigPayload(weather.value);
      await request.post('/api/weather-config', payload);
      weather.value = normalizeWeatherConfig(payload);
      ElMessage.success('天气配置保存成功');
      setTimeout(() => {
        loadWeatherConfig();
      }, 100);
    } catch (err) {
      const errorMsg = extractErrorMessage(err, '保存失败');
      ElMessage.error('保存失败: ' + errorMsg);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  return {
    weather,
    saving,
    loading,
    error,
    loadWeatherConfig,
    saveWeatherConfig,
    DEFAULT_WEATHER_CONFIG
  };
}
