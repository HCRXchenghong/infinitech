import { reactive, ref } from 'vue';
import { extractEnvelopeData, extractErrorMessage, resolveUploadAssetUrl, UPLOAD_DOMAINS } from '@infinitech/contracts';
import {
  appendAdminUploadDomain,
  appendRiderInsuranceClaimStep as buildNextRiderInsuranceClaimSteps,
  appendRiderInsuranceCoverage as buildNextRiderInsuranceCoverages,
  appendRiderReportReason as buildNextRiderReportReasons,
  appendRTCIceServer as buildNextRTCIceServers,
  buildServiceSettingsPayload,
  createDefaultServiceSettings,
  normalizeServiceSettings,
  removeRiderInsuranceClaimStep as buildNextRiderInsuranceClaimStepsAfterRemove,
  removeRiderInsuranceCoverage as buildNextRiderInsuranceCoveragesAfterRemove,
  removeRiderReportReason as buildNextRiderReportReasonsAfterRemove,
  removeRTCIceServer as buildNextRTCIceServersAfterRemove,
  resolveAdminServiceSoundPreviewUrl,
  SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES,
  validateAdminAudioFile,
} from '@infinitech/admin-core';

export function useServiceSettings({ request, ElMessage, model = null, savingRef = null } = {}) {
  if (!request) {
    throw new Error('request is required');
  }

  const DEFAULT_SERVICE_SETTINGS = createDefaultServiceSettings();
  const serviceSettings = model || ref(createDefaultServiceSettings());
  const savingServiceSettings = savingRef || ref(false);
  const uploadingServiceSounds = reactive({
    message: false,
    order: false,
  });
  const loading = ref(false);
  const error = ref('');

  function applyServiceSettings(payload = {}) {
    serviceSettings.value = normalizeServiceSettings(payload);
    return serviceSettings.value;
  }

  function buildPayload() {
    return buildServiceSettingsPayload(serviceSettings.value);
  }

  async function loadServiceSettings(options = {}) {
    const { clearError = true, throwOnError = false } = options;
    loading.value = true;
    if (clearError) {
      error.value = '';
    }

    try {
      const response = await request.get('/api/service-settings');
      if (response?.data) {
        applyServiceSettings(extractEnvelopeData(response.data) || {});
      }
      return serviceSettings.value;
    } catch (err) {
      error.value = extractErrorMessage(err, '加载服务配置失败');
      if (throwOnError) {
        throw err;
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function saveServiceSettings(options = {}) {
    const {
      successMessage = '服务配置保存成功',
      errorMessage = '保存服务配置失败',
      reloadAfterSave = false,
      throwOnError = false,
    } = options;

    savingServiceSettings.value = true;
    try {
      const payload = buildPayload();
      await request.post('/api/service-settings', payload);
      if (reloadAfterSave) {
        await loadServiceSettings({ clearError: false, throwOnError });
      } else {
        applyServiceSettings(payload);
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
      savingServiceSettings.value = false;
    }
  }

  function addRiderReportReason() {
    const result = buildNextRiderReportReasons(serviceSettings.value.rider_exception_report_reasons);
    if (!result.added) {
      ElMessage?.warning?.(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.riderReportReasons);
      return;
    }
    serviceSettings.value.rider_exception_report_reasons = result.items;
  }

  function removeRiderReportReason(index) {
    serviceSettings.value.rider_exception_report_reasons = buildNextRiderReportReasonsAfterRemove(
      serviceSettings.value.rider_exception_report_reasons,
      index,
    );
  }

  function addRiderInsuranceCoverage() {
    const result = buildNextRiderInsuranceCoverages(serviceSettings.value.rider_insurance_coverages);
    if (!result.added) {
      ElMessage?.warning?.(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.riderInsuranceCoverages);
      return;
    }
    serviceSettings.value.rider_insurance_coverages = result.items;
  }

  function removeRiderInsuranceCoverage(index) {
    serviceSettings.value.rider_insurance_coverages = buildNextRiderInsuranceCoveragesAfterRemove(
      serviceSettings.value.rider_insurance_coverages,
      index,
    );
  }

  function addRiderInsuranceClaimStep() {
    const result = buildNextRiderInsuranceClaimSteps(serviceSettings.value.rider_insurance_claim_steps);
    if (!result.added) {
      ElMessage?.warning?.(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.riderInsuranceClaimSteps);
      return;
    }
    serviceSettings.value.rider_insurance_claim_steps = result.items;
  }

  function removeRiderInsuranceClaimStep(index) {
    serviceSettings.value.rider_insurance_claim_steps = buildNextRiderInsuranceClaimStepsAfterRemove(
      serviceSettings.value.rider_insurance_claim_steps,
      index,
    );
  }

  function addRTCIceServer() {
    const result = buildNextRTCIceServers(serviceSettings.value.rtc_ice_servers);
    if (!result.added) {
      ElMessage?.warning?.(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.rtcIceServers);
      return;
    }
    serviceSettings.value.rtc_ice_servers = result.items;
  }

  function removeRTCIceServer(index) {
    serviceSettings.value.rtc_ice_servers = buildNextRTCIceServersAfterRemove(
      serviceSettings.value.rtc_ice_servers,
      index,
    );
  }

  function validateSoundFile(file) {
    const result = validateAdminAudioFile(file, 10);
    if (!result.valid) {
      ElMessage?.warning?.(result.message);
      return false;
    }
    return true;
  }

  function resolveConfiguredSoundUrl(kind) {
    if (kind === 'order') {
      return String(serviceSettings.value.order_notification_sound_url || '').trim();
    }
    return String(serviceSettings.value.message_notification_sound_url || '').trim();
  }

  function previewServiceSound(kind) {
    const url = resolveConfiguredSoundUrl(kind) || resolveAdminServiceSoundPreviewUrl(kind);
    if (!url) {
      ElMessage?.warning?.('当前没有可试听的提示音');
      return;
    }
    const player = new Audio();
    player.src = url;
    const playPromise = player.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        ElMessage?.warning?.('浏览器拦截了自动播放，请与页面交互后重试');
      });
    }
  }

  async function handleServiceSoundUpload(field, options) {
    const file = options?.file;
    if (!file || !validateSoundFile(file)) {
      return;
    }

    const kind = field === 'order_notification_sound_url' ? 'order' : 'message';
    const loadingKey = kind === 'order' ? 'order' : 'message';
    const previousValue = String(serviceSettings.value[field] || '').trim();

    uploadingServiceSounds[loadingKey] = true;
    try {
      const formData = new FormData();
      formData.append('file', file);
      appendAdminUploadDomain(formData, UPLOAD_DOMAINS.SERVICE_SOUND);
      const { data } = await request.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      options?.onSuccess?.(data);

      const nextUrl = String(resolveUploadAssetUrl(data) || '').trim();
      if (!nextUrl) {
        throw new Error('上传成功但未返回文件地址');
      }

      serviceSettings.value[field] = nextUrl;
      const saved = await saveServiceSettings({
        successMessage: kind === 'order' ? '来单提示音已更新' : '消息提示音已更新',
      });
      if (!saved) {
        serviceSettings.value[field] = previousValue;
      }
    } catch (err) {
      options?.onError?.(err);
      serviceSettings.value[field] = previousValue;
      ElMessage?.error?.(extractErrorMessage(err, '提示音上传失败'));
    } finally {
      uploadingServiceSounds[loadingKey] = false;
    }
  }

  async function clearServiceSound(field) {
    const kind = field === 'order_notification_sound_url' ? 'order' : 'message';
    const previousValue = String(serviceSettings.value[field] || '').trim();
    serviceSettings.value[field] = '';
    const saved = await saveServiceSettings({
      successMessage: kind === 'order'
        ? '来单提示音配置已删除，已回退到默认 come.mp3'
        : '消息提示音配置已删除，已回退到默认 chat.mp3',
    });
    if (!saved) {
      serviceSettings.value[field] = previousValue;
    }
  }

  return {
    DEFAULT_SERVICE_SETTINGS,
    serviceSettings,
    savingServiceSettings,
    uploadingServiceSounds,
    loading,
    error,
    applyServiceSettings,
    loadServiceSettings,
    saveServiceSettings,
    addRiderReportReason,
    removeRiderReportReason,
    addRiderInsuranceCoverage,
    removeRiderInsuranceCoverage,
    addRiderInsuranceClaimStep,
    removeRiderInsuranceClaimStep,
    addRTCIceServer,
    removeRTCIceServer,
    previewServiceSound,
    handleServiceSoundUpload,
    clearServiceSound,
  };
}
