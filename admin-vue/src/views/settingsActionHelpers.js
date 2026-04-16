import { extractErrorMessage } from '@infinitech/contracts';
import {
  buildAlipayConfigPayload,
  buildDebugModePayload,
  buildPayModePayload,
  buildWxpayConfigPayload,
} from '@infinitech/admin-core';
import { clearAdminSessionStorage } from '@/utils/runtime';

export function useSettingsActionHelpers({ request, payMode, debugMode, wxpay, alipay, savingPayMode, savingDebugMode, savingWx, savingAli, loadAll, router, ElMessage, ElMessageBox }) {
  function formatSaveError(error) {
    return '保存失败: ' + extractErrorMessage(error, '未知错误');
  }

  async function savePayMode() {
    savingPayMode.value = true;
    try {
      const payload = buildPayModePayload(payMode.value);
      await request.post('/api/pay-config/mode', payload);
      payMode.value = payload;
      ElMessage.success('支付模式已切换为' + (payMode.value.isProd ? '生产模式' : '开发模式'));
    } catch (error) {
      ElMessage.error(formatSaveError(error));
      await loadAll();
    } finally {
      savingPayMode.value = false;
    }
  }

  async function saveDebugMode() {
    savingDebugMode.value = true;
    try {
      const payload = buildDebugModePayload(debugMode.value);
      await request.post('/api/debug-mode', payload);
      debugMode.value = payload;
      ElMessage.success('调试模式设置保存成功');
    } catch (error) {
      ElMessage.error(formatSaveError(error));
      await loadAll();
    } finally {
      savingDebugMode.value = false;
    }
  }

  async function saveWxpay() {
    savingWx.value = true;
    try {
      const payload = buildWxpayConfigPayload(wxpay.value);
      await request.post('/api/pay-config/wxpay', payload);
      wxpay.value = payload;
      ElMessage.success('微信支付配置保存成功');
    } catch (error) {
      ElMessage.error(formatSaveError(error));
    } finally {
      savingWx.value = false;
    }
  }

  async function saveAlipay() {
    savingAli.value = true;
    try {
      const payload = buildAlipayConfigPayload(alipay.value);
      await request.post('/api/pay-config/alipay', payload);
      alipay.value = payload;
      ElMessage.success('支付宝配置保存成功');
    } catch (error) {
      ElMessage.error(formatSaveError(error));
    } finally {
      savingAli.value = false;
    }
  }

  function handleLogout() {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      clearAdminSessionStorage();
      router.push('/login');
      ElMessage.success('已退出登录');
    }).catch(() => {
      // 用户取消操作
    });
  }

  return {
    savePayMode,
    saveDebugMode,
    saveWxpay,
    saveAlipay,
    handleLogout,
  };
}
