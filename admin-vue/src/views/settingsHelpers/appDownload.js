import { reactive, ref } from 'vue';
import { extractEnvelopeData, extractErrorMessage, extractUploadAsset, UPLOAD_DOMAINS } from '@infinitech/contracts';
import {
  appendAdminUploadDomain,
  buildAppDownloadConfigPayload,
  createDefaultAppDownloadConfig,
  normalizeAppDownloadConfig,
  validateAdminMiniProgramQrFile,
  validateAdminPackageFile,
} from '@infinitech/admin-core';

export function useAppDownloadSettings({ request, ElMessage } = {}) {
  if (!request) {
    throw new Error('request is required');
  }

  const DEFAULT_APP_DOWNLOAD_CONFIG = createDefaultAppDownloadConfig();
  const appDownloadConfig = ref(createDefaultAppDownloadConfig());
  const savingAppDownload = ref(false);
  const uploadingPackage = reactive({
    ios: false,
    android: false,
    miniProgramQr: false,
  });
  const loading = ref(false);
  const error = ref('');

  function applyAppDownloadConfig(payload = {}) {
    appDownloadConfig.value = normalizeAppDownloadConfig(payload);
    return appDownloadConfig.value;
  }

  async function loadAppDownloadConfig(options = {}) {
    const { clearError = true, throwOnError = false } = options;
    loading.value = true;
    if (clearError) {
      error.value = '';
    }

    try {
      const response = await request.get('/api/app-download-config');
      if (response?.data) {
        applyAppDownloadConfig(extractEnvelopeData(response.data) || {});
      }
      return appDownloadConfig.value;
    } catch (err) {
      error.value = extractErrorMessage(err, '加载APP下载配置失败');
      if (throwOnError) {
        throw err;
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function saveAppDownloadConfig(options = {}) {
    const {
      successMessage = 'APP下载配置保存成功',
      errorMessage = '保存APP下载配置失败',
      reloadAfterSave = false,
      throwOnError = false,
    } = options;

    savingAppDownload.value = true;
    try {
      const payload = buildAppDownloadConfigPayload(appDownloadConfig.value);
      await request.post('/api/app-download-config', payload);
      if (reloadAfterSave) {
        await loadAppDownloadConfig({ clearError: false, throwOnError });
      } else {
        applyAppDownloadConfig(payload);
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
      savingAppDownload.value = false;
    }
  }

  function beforePackageUpload(file) {
    const result = validateAdminPackageFile(file, 300);
    if (!result.valid) {
      ElMessage?.error?.(result.message);
      return false;
    }
    return true;
  }

  function beforeMiniProgramQrUpload(file) {
    const result = validateAdminMiniProgramQrFile(file, 10);
    if (!result.valid) {
      ElMessage?.error?.(result.message);
      return false;
    }
    return true;
  }

  async function handlePackageUpload(platform, options) {
    const file = options?.file;
    if (!file) {
      return;
    }

    uploadingPackage[platform] = true;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await request.post('/api/upload-package', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const asset = extractUploadAsset(data);
      const nextUrl = String(asset?.url || '').trim();
      if (!nextUrl) {
        throw new Error('上传返回地址为空');
      }

      applyAppDownloadConfig({
        ...appDownloadConfig.value,
        [platform === 'ios' ? 'ios_url' : 'android_url']: nextUrl,
      });
      ElMessage?.success?.('安装包上传成功');
      options?.onSuccess?.(data);
    } catch (err) {
      ElMessage?.error?.(extractErrorMessage(err, '安装包上传失败'));
      options?.onError?.(err);
    } finally {
      uploadingPackage[platform] = false;
    }
  }

  async function handleMiniProgramQrUpload(options) {
    const file = options?.file;
    if (!file) {
      return;
    }

    uploadingPackage.miniProgramQr = true;
    try {
      const formData = new FormData();
      formData.append('file', file);
      appendAdminUploadDomain(formData, UPLOAD_DOMAINS.APP_DOWNLOAD_QR);
      const { data } = await request.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const asset = extractUploadAsset(data);
      const nextUrl = String(asset?.url || '').trim();
      if (!nextUrl) {
        throw new Error('上传返回地址为空');
      }

      applyAppDownloadConfig({
        ...appDownloadConfig.value,
        mini_program_qr_url: nextUrl,
      });
      ElMessage?.success?.('小程序二维码上传成功');
      options?.onSuccess?.(data);
    } catch (err) {
      ElMessage?.error?.(extractErrorMessage(err, '小程序二维码上传失败'));
      options?.onError?.(err);
    } finally {
      uploadingPackage.miniProgramQr = false;
    }
  }

  function openDownloadLink(url, label) {
    if (!url) {
      ElMessage?.warning?.(`${label} 下载地址为空`);
      return;
    }
    window.open(url, '_blank');
  }

  return {
    DEFAULT_APP_DOWNLOAD_CONFIG,
    appDownloadConfig,
    savingAppDownload,
    uploadingPackage,
    loading,
    error,
    applyAppDownloadConfig,
    loadAppDownloadConfig,
    saveAppDownloadConfig,
    beforePackageUpload,
    beforeMiniProgramQrUpload,
    handlePackageUpload,
    handleMiniProgramQrUpload,
    openDownloadLink,
  };
}
