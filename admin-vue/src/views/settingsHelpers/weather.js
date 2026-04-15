import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import request from '@/utils/request';

const DEFAULT_WEATHER_CONFIG = {
  api_base_url: 'https://uapis.cn/api/v1/misc/weather',
  api_key: '',
  city: '',
  adcode: '',
  lang: 'zh',
  extended: true,
  forecast: true,
  hourly: true,
  minutely: true,
  indices: true,
  timeout_ms: 8000,
  refresh_interval_minutes: 10
};

/**
 * 天气配置模块
 */
export function useWeatherSettings() {
  const weather = ref({ ...DEFAULT_WEATHER_CONFIG });
  const saving = ref(false);
  const loading = ref(false);
  const error = ref('');

  /**
   * 合并天气配置
   */
  function mergeWeatherConfig(payload = {}) {
    weather.value = {
      ...DEFAULT_WEATHER_CONFIG,
      ...(payload || {})
    };
    // 兼容旧字段
    if (!weather.value.city && weather.value.location) {
      weather.value.city = weather.value.location;
    }
    weather.value.refresh_interval_minutes = Number(weather.value.refresh_interval_minutes || 10);
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
      await request.post('/api/weather-config', weather.value);
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
