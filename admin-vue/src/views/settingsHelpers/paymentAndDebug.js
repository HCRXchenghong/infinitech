import { ref } from 'vue';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  buildAlipayConfigPayload,
  buildDebugModePayload,
  buildPayModePayload,
  buildWxpayConfigPayload,
  createDefaultAlipayConfig,
  createDefaultDebugMode,
  createDefaultPayMode,
  createDefaultWxpayConfig,
  normalizeAlipayConfig,
  normalizeDebugModeConfig,
  normalizePayModeConfig,
  normalizeWxpayConfig,
} from '@infinitech/admin-core';

function formatSaveError(error) {
  return '保存失败: ' + extractErrorMessage(error, '未知错误');
}

function isDebugModeFeatureDisabled(error) {
  const status = Number(error?.response?.status || error?.status || 0);
  return status === 404 || status === 410;
}

export function usePaymentAndDebugSettings({
  request,
  ElMessage,
  debugModel = null,
  payModeModel = null,
  wxpayModel = null,
  alipayModel = null,
  savingDebugRef = null,
  savingPayModeRef = null,
  savingWxRef = null,
  savingAliRef = null,
} = {}) {
  if (!request) {
    throw new Error('request is required');
  }

  const DEFAULT_DEBUG_MODE = createDefaultDebugMode();
  const DEFAULT_PAY_MODE = createDefaultPayMode();
  const DEFAULT_WXPAY_CONFIG = createDefaultWxpayConfig();
  const DEFAULT_ALIPAY_CONFIG = createDefaultAlipayConfig();

  const debugMode = debugModel || ref(createDefaultDebugMode());
  const payMode = payModeModel || ref(createDefaultPayMode());
  const wxpay = wxpayModel || ref(createDefaultWxpayConfig());
  const alipay = alipayModel || ref(createDefaultAlipayConfig());

  const savingDebugMode = savingDebugRef || ref(false);
  const savingPayMode = savingPayModeRef || ref(false);
  const savingWx = savingWxRef || ref(false);
  const savingAli = savingAliRef || ref(false);
  const debugModeFeatureEnabled = ref(false);

  const loading = ref(false);
  const error = ref('');

  function applyDebugMode(payload = {}) {
    debugMode.value = normalizeDebugModeConfig(payload);
    return debugMode.value;
  }

  function applyPayMode(payload = {}) {
    payMode.value = normalizePayModeConfig(payload);
    return payMode.value;
  }

  function applyWxpay(payload = {}) {
    wxpay.value = normalizeWxpayConfig(payload);
    return wxpay.value;
  }

  function applyAlipay(payload = {}) {
    alipay.value = normalizeAlipayConfig(payload);
    return alipay.value;
  }

  async function loadDebugMode(options = {}) {
    const { throwOnError = false } = options;
    try {
      const response = await request.get('/api/debug-mode');
      if (response?.data) {
        applyDebugMode(extractEnvelopeData(response.data) || {});
      }
      debugModeFeatureEnabled.value = true;
      return debugMode.value;
    } catch (err) {
      if (isDebugModeFeatureDisabled(err)) {
        debugModeFeatureEnabled.value = false;
        applyDebugMode(DEFAULT_DEBUG_MODE);
        return null;
      }
      if (throwOnError) {
        throw err;
      }
      return null;
    }
  }

  async function loadPayMode(options = {}) {
    const { throwOnError = false } = options;
    try {
      const response = await request.get('/api/pay-config/mode');
      if (response?.data) {
        applyPayMode(extractEnvelopeData(response.data) || {});
      }
      return payMode.value;
    } catch (err) {
      if (throwOnError) {
        throw err;
      }
      return null;
    }
  }

  async function loadWxpay(options = {}) {
    const { throwOnError = false } = options;
    try {
      const response = await request.get('/api/pay-config/wxpay');
      if (response?.data) {
        applyWxpay(extractEnvelopeData(response.data) || {});
      }
      return wxpay.value;
    } catch (err) {
      if (throwOnError) {
        throw err;
      }
      return null;
    }
  }

  async function loadAlipay(options = {}) {
    const { throwOnError = false } = options;
    try {
      const response = await request.get('/api/pay-config/alipay');
      if (response?.data) {
        applyAlipay(extractEnvelopeData(response.data) || {});
      }
      return alipay.value;
    } catch (err) {
      if (throwOnError) {
        throw err;
      }
      return null;
    }
  }

  async function loadPaymentAndDebugSettings(options = {}) {
    const { clearError = true, throwOnError = false } = options;
    loading.value = true;
    if (clearError) {
      error.value = '';
    }

    try {
      const results = await Promise.allSettled([
        loadDebugMode({ throwOnError: true }),
        loadPayMode({ throwOnError: true }),
        loadWxpay({ throwOnError: true }),
        loadAlipay({ throwOnError: true }),
      ]);

      const rejected = results.find((item) => item.status === 'rejected');
      if (rejected) {
        error.value = '部分支付与调试配置加载失败';
        if (throwOnError) {
          throw rejected.reason || new Error(error.value);
        }
      }

      return {
        debugMode: debugMode.value,
        payMode: payMode.value,
        wxpay: wxpay.value,
        alipay: alipay.value,
      };
    } catch (err) {
      if (!error.value) {
        error.value = extractErrorMessage(err, '加载支付与调试配置失败');
      }
      if (throwOnError) {
        throw err;
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function savePayMode() {
    savingPayMode.value = true;
    try {
      const payload = buildPayModePayload(payMode.value);
      await request.post('/api/pay-config/mode', payload);
      applyPayMode(payload);
      ElMessage?.success?.('支付模式已切换为' + (payMode.value.isProd ? '生产模式' : '开发模式'));
      return true;
    } catch (err) {
      ElMessage?.error?.(formatSaveError(err));
      await loadPayMode();
      return false;
    } finally {
      savingPayMode.value = false;
    }
  }

  async function saveDebugMode() {
    if (!debugModeFeatureEnabled.value) {
      ElMessage?.warning?.(
        '调试模式入口已默认关闭，如需启用请显式配置 ENABLE_ADMIN_DEBUG_MODE_SETTINGS=true',
      );
      return false;
    }

    savingDebugMode.value = true;
    try {
      const payload = buildDebugModePayload(debugMode.value);
      await request.post('/api/debug-mode', payload);
      applyDebugMode(payload);
      ElMessage?.success?.('调试模式设置保存成功');
      return true;
    } catch (err) {
      ElMessage?.error?.(formatSaveError(err));
      await loadDebugMode();
      return false;
    } finally {
      savingDebugMode.value = false;
    }
  }

  async function saveWxpay() {
    savingWx.value = true;
    try {
      const payload = buildWxpayConfigPayload(wxpay.value);
      await request.post('/api/pay-config/wxpay', payload);
      applyWxpay(payload);
      ElMessage?.success?.('微信支付配置保存成功');
      return true;
    } catch (err) {
      ElMessage?.error?.(formatSaveError(err));
      await loadWxpay();
      return false;
    } finally {
      savingWx.value = false;
    }
  }

  async function saveAlipay() {
    savingAli.value = true;
    try {
      const payload = buildAlipayConfigPayload(alipay.value);
      await request.post('/api/pay-config/alipay', payload);
      applyAlipay(payload);
      ElMessage?.success?.('支付宝配置保存成功');
      return true;
    } catch (err) {
      ElMessage?.error?.(formatSaveError(err));
      await loadAlipay();
      return false;
    } finally {
      savingAli.value = false;
    }
  }

  return {
    DEFAULT_DEBUG_MODE,
    DEFAULT_PAY_MODE,
    DEFAULT_WXPAY_CONFIG,
    DEFAULT_ALIPAY_CONFIG,
    debugMode,
    debugModeFeatureEnabled,
    payMode,
    wxpay,
    alipay,
    savingDebugMode,
    savingPayMode,
    savingWx,
    savingAli,
    loading,
    error,
    applyDebugMode,
    applyPayMode,
    applyWxpay,
    applyAlipay,
    loadDebugMode,
    loadPayMode,
    loadWxpay,
    loadAlipay,
    loadPaymentAndDebugSettings,
    savePayMode,
    saveDebugMode,
    saveWxpay,
    saveAlipay,
  };
}
