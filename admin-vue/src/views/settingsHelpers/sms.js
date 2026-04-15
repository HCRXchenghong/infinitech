import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import request from '@/utils/request';
import { DEFAULT_SMS_CONFIG, normalizeSMSConfig, buildSMSConfigPayload } from '../smsConfigHelpers';

/**
 * SMS 短信配置模块
 */
export function useSmsSettings() {
  const sms = ref({ ...DEFAULT_SMS_CONFIG });
  const saving = ref(false);
  const loading = ref(false);
  const error = ref('');

  /**
   * 加载短信配置
   */
  async function loadSmsConfig() {
    loading.value = true;
    error.value = '';
    try {
      const res = await request.get('/api/sms-config');
      if (res?.data) {
        sms.value = normalizeSMSConfig(extractEnvelopeData(res.data) || {});
      }
    } catch (err) {
      error.value = extractErrorMessage(err, '加载短信配置失败');
    } finally {
      loading.value = false;
    }
  }

  /**
   * 保存短信配置
   */
  async function saveSmsConfig() {
    saving.value = true;
    try {
      await request.post('/api/sms-config', buildSMSConfigPayload(sms.value));
      ElMessage.success('短信配置保存成功');
      // 重新加载配置
      setTimeout(() => {
        loadSmsConfig();
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
    sms,
    saving,
    loading,
    error,
    loadSmsConfig,
    saveSmsConfig
  };
}
