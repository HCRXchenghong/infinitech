import { ref } from 'vue';
import { extractErrorMessage } from '@infinitech/contracts';
import {
  resolveSettledTaskGroupError as resolveSettledTaskGroupErrorCore,
  runSettledTaskGroup as runSettledTaskGroupCore,
} from './pageRuntimeCore';
import { useSmsSettings } from './sms';
import { useWeatherSettings } from './weather';

const MOBILE_BREAKPOINT = 768;

export function useResponsiveAdminPage(defaultMobile = false) {
  const isMobile = ref(
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : defaultMobile,
  );

  const handleResize = () => {
    if (typeof window === 'undefined') {
      return;
    }
    isMobile.value = window.innerWidth <= MOBILE_BREAKPOINT;
  };

  const bindWindowResize = () => {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('resize', handleResize);
  };

  const unbindWindowResize = () => {
    if (typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('resize', handleResize);
  };

  return {
    isMobile,
    handleResize,
    bindWindowResize,
    unbindWindowResize,
  };
}

export function resolveSettledTaskGroupError(results, options = {}) {
  return resolveSettledTaskGroupErrorCore(results, {
    ...options,
    formatErrorMessage: extractErrorMessage,
  });
}

export async function runSettledTaskGroup(taskFactories = [], options = {}) {
  return runSettledTaskGroupCore(taskFactories, {
    ...options,
    formatErrorMessage: extractErrorMessage,
  });
}

export function useSharedSystemConfigSections({
  request,
  ElMessage,
  savingRef = null,
} = {}) {
  const smsSettings = useSmsSettings({
    request,
    ElMessage,
    savingRef,
  });
  const weatherSettings = useWeatherSettings({
    request,
    ElMessage,
    savingRef,
  });

  return {
    smsSettings,
    weatherSettings,
    sms: smsSettings.sms,
    weather: weatherSettings.weather,
    DEFAULT_WEATHER_CONFIG: weatherSettings.DEFAULT_WEATHER_CONFIG,
    mergeWeatherConfig: weatherSettings.applyWeatherConfig,
    loadSmsConfig: smsSettings.loadSmsConfig,
    loadWeatherConfig: weatherSettings.loadWeatherConfig,
    saveSmsConfig: smsSettings.saveSmsConfig,
    saveWeatherConfig: weatherSettings.saveWeatherConfig,
  };
}
