import { reactive, ref } from 'vue';
import { extractErrorMessage } from '@infinitech/contracts';

export function useSystemMaintenanceActions({ request, ElMessage, reload = null } = {}) {
  if (!request) {
    throw new Error('request is required');
  }

  const clearAllDialogVisible = ref(false);
  const clearingAllData = ref(false);
  const clearAllVerifyForm = reactive({
    verifyAccount: '',
    verifyPassword: '',
  });

  function openClearAllDataDialog() {
    clearAllVerifyForm.verifyAccount = '';
    clearAllVerifyForm.verifyPassword = '';
    clearAllDialogVisible.value = true;
  }

  async function confirmClearAllData() {
    if (!clearAllVerifyForm.verifyAccount || !clearAllVerifyForm.verifyPassword) {
      ElMessage?.warning?.('请输入验证账号和密码');
      return false;
    }

    clearingAllData.value = true;
    try {
      const { data } = await request.post('/api/settings/clear-all-data', {
        verifyAccount: clearAllVerifyForm.verifyAccount,
        verifyPassword: clearAllVerifyForm.verifyPassword,
      });
      const rows = Number(data?.goResult?.result?.clearedRows || 0);
      ElMessage?.success?.(`系统数据清空完成，共清理约 ${rows} 条记录`);
      clearAllDialogVisible.value = false;
      if (typeof reload === 'function') {
        await reload();
      }
      return true;
    } catch (err) {
      ElMessage?.error?.(extractErrorMessage(err, '清空全部信息失败'));
      return false;
    } finally {
      clearingAllData.value = false;
    }
  }

  return {
    clearAllDialogVisible,
    clearingAllData,
    clearAllVerifyForm,
    openClearAllDataDialog,
    confirmClearAllData,
  };
}
