import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import { useDataManagementBundleHelpers } from './dataManagementBundleHelpers';

export function useDataManagementPage() {
  const loading = ref(false);
  const exporting = ref(false);
  const importing = ref(false);
  const exportingRiders = ref(false);
  const importingRiders = ref(false);
  const exportingOrders = ref(false);
  const importingOrders = ref(false);
  const exportingMerchants = ref(false);
  const importingMerchants = ref(false);
  const exportingAll = ref(false);
  const exportingToFolder = ref(false);
  const importingAll = ref(false);

  function refreshAll() {
    ElMessage.success('刷新成功');
  }

  async function exportData(endpoint, filename, loadingRef) {
    loadingRef.value = true;
    try {
      let data;
      try {
        const response = await request.get(endpoint);
        data = response.data;
      } catch (error) {
        if (error.isNetworkError || !error.response) {
          const { getFromCache, STORES } = await import('@/utils/cache');
          let storeName = null;
          if (endpoint.includes('/api/users')) storeName = STORES.USERS;
          else if (endpoint.includes('/api/riders')) storeName = STORES.RIDERS;
          else if (endpoint.includes('/api/orders')) storeName = STORES.ORDERS;
          else if (endpoint.includes('/api/merchants')) storeName = STORES.MERCHANTS;

          if (storeName) {
            const cachedData = await getFromCache(storeName);
            if (cachedData && cachedData.length > 0) {
              data = cachedData;
              ElMessage.warning('网络连接失败，已使用缓存数据导出');
            } else {
              throw new Error('网络连接失败且无缓存数据');
            }
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      const jsonString = JSON.stringify(data, null, 2);

      if (window.electronAPI) {
        const result = await window.electronAPI.showSaveDialog({
          title: '保存文件',
          defaultPath: filename,
          filters: [
            { name: 'JSON文件', extensions: ['json'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        });

        if (!result.canceled && result.filePath) {
          const writeResult = await window.electronAPI.writeFile(result.filePath, jsonString);
          if (writeResult.success) {
            ElMessage.success('数据导出成功');
          } else {
            ElMessage.error(`导出失败: ${writeResult.error}`);
          }
        }
      } else {
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        ElMessage.success('数据导出成功');
      }
    } catch (error) {
      let errorMessage = '导出失败: ';
      if (error.response) {
        errorMessage += error.response.data?.error || `服务器错误 (${error.response.status})`;
      } else if (error.request) {
        errorMessage += '网络连接失败，请检查网络或服务器状态';
      } else {
        errorMessage += error.message || '未知错误';
      }
      ElMessage.error(errorMessage);
    } finally {
      loadingRef.value = false;
    }
  }

  async function exportUsers() {
    await exportData('/api/users/export', `users_backup_${new Date().toISOString().split('T')[0]}.json`, exporting);
  }

  function beforeImport(file) {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      ElMessage.error('请选择JSON格式的文件');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.error('文件大小不能超过10MB');
      return false;
    }
    return true;
  }

  function validateDataType(data, expectedType) {
    if (!Array.isArray(data) || data.length === 0) {
      return { valid: false, error: '数据格式错误，应为非空数组' };
    }

    const firstItem = data[0];

    if (expectedType === 'users') {
      if (firstItem.rider_id !== undefined || firstItem.daily_order_count !== undefined) {
        return { valid: false, error: '检测到这是骑手数据，不能导入到用户数据中！' };
      }
      if (firstItem.daily_order_id !== undefined || firstItem.order_status !== undefined) {
        return { valid: false, error: '检测到这是订单数据，不能导入到用户数据中！' };
      }
      if (firstItem.merchant_id !== undefined || firstItem.merchant_name !== undefined) {
        return { valid: false, error: '检测到这是商户数据，不能导入到用户数据中！' };
      }
    } else if (expectedType === 'riders') {
      if (firstItem.customer_id !== undefined || firstItem.order_count_today !== undefined) {
        return { valid: false, error: '检测到这是用户数据，不能导入到骑手数据中！' };
      }
      if (firstItem.daily_order_id !== undefined || firstItem.order_status !== undefined) {
        return { valid: false, error: '检测到这是订单数据，不能导入到骑手数据中！' };
      }
      if (firstItem.merchant_id !== undefined || firstItem.merchant_name !== undefined) {
        return { valid: false, error: '检测到这是商户数据，不能导入到骑手数据中！' };
      }
    } else if (expectedType === 'orders') {
      if (firstItem.rider_id !== undefined && firstItem.daily_order_count !== undefined) {
        return { valid: false, error: '检测到这是骑手数据，不能导入到订单数据中！' };
      }
      if (firstItem.customer_id !== undefined && firstItem.order_count_today !== undefined) {
        return { valid: false, error: '检测到这是用户数据，不能导入到订单数据中！' };
      }
      if (firstItem.merchant_id !== undefined && firstItem.merchant_name !== undefined && firstItem.daily_order_id === undefined) {
        return { valid: false, error: '检测到这是商户数据，不能导入到订单数据中！' };
      }
    } else if (expectedType === 'merchants') {
      if (firstItem.rider_id !== undefined || firstItem.daily_order_count !== undefined) {
        return { valid: false, error: '检测到这是骑手数据，不能导入到商户数据中！' };
      }
      if (firstItem.customer_id !== undefined || firstItem.order_count_today !== undefined) {
        return { valid: false, error: '检测到这是用户数据，不能导入到商户数据中！' };
      }
      if (firstItem.daily_order_id !== undefined || firstItem.order_status !== undefined) {
        return { valid: false, error: '检测到这是订单数据，不能导入到商户数据中！' };
      }
    }

    return { valid: true };
  }

  async function handleImport(options, dataType) {
    const loadingRef = dataType === 'users' ? importing
      : dataType === 'riders' ? importingRiders
      : dataType === 'orders' ? importingOrders : importingMerchants;

    loadingRef.value = true;
    try {
      const file = options.file;
      const text = await file.text();

      if (!text || text.trim().length === 0) {
        ElMessage.error('文件内容为空');
        loadingRef.value = false;
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        ElMessage.error(`JSON格式错误: ${parseError.message}`);
        loadingRef.value = false;
        return;
      }

      if (!Array.isArray(data)) {
        ElMessage.error(`${dataType === 'users' ? '用户' : dataType === 'riders' ? '骑手' : dataType === 'orders' ? '订单' : '商户'}数据格式错误，应为数组格式`);
        loadingRef.value = false;
        return;
      }

      if (data.length === 0) {
        ElMessage.warning(`${dataType === 'users' ? '用户' : dataType === 'riders' ? '骑手' : dataType === 'orders' ? '订单' : '商户'}数据为空`);
        loadingRef.value = false;
        return;
      }

      const validation = validateDataType(data, dataType);
      if (!validation.valid) {
        await ElMessageBox.alert(
          validation.error,
          '数据类型错误',
          {
            confirmButtonText: '确定',
            type: 'error'
          }
        );
        loadingRef.value = false;
        return;
      }

      const typeName = dataType === 'users' ? '用户'
        : dataType === 'riders' ? '骑手'
          : dataType === 'orders' ? '订单' : '商户';

      await ElMessageBox.confirm(
        `即将导入 ${data.length} 条${typeName}数据，这将覆盖或创建${typeName}（包括已删除的${typeName}）。是否继续？`,
        '确认导入',
        {
          confirmButtonText: '确定导入',
          cancelButtonText: '取消',
          type: 'warning'
        }
      );

      const endpoint = dataType === 'users' ? '/api/users/import'
        : dataType === 'riders' ? '/api/riders/import'
          : dataType === 'orders' ? '/api/orders/import' : '/api/merchants/import';

      const requestData = dataType === 'users' ? { users: data }
        : dataType === 'riders' ? { riders: data }
          : dataType === 'orders' ? { orders: data } : { merchants: data };

      const response = await request.post(endpoint, requestData);

      if (response.data.success) {
        const { successCount, errorCount } = response.data;
        let message = `导入完成！成功: ${successCount} 条`;
        if (errorCount > 0) {
          message += `，失败: ${errorCount} 条`;
        }
        ElMessage.success(message);
      } else {
        ElMessage.error('导入失败');
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('导入失败: ' + (error?.response?.data?.error || error.message));
      }
    } finally {
      loadingRef.value = false;
    }
  }

  async function exportRiders() {
    await exportData('/api/riders/export', `riders_backup_${new Date().toISOString().split('T')[0]}.json`, exportingRiders);
  }

  async function exportOrders() {
    await exportData('/api/orders/export', `orders_backup_${new Date().toISOString().split('T')[0]}.json`, exportingOrders);
  }

  async function exportMerchants() {
    await exportData('/api/merchants/export', `merchants_backup_${new Date().toISOString().split('T')[0]}.json`, exportingMerchants);
  }

  const { exportAllToFolder, exportAllData, handleImportAll } = useDataManagementBundleHelpers({
    request,
    ElMessage,
    ElMessageBox,
    exportingToFolder,
    exportingAll,
    importingAll,
    validateDataType,
  });

  return {
    loading,
    exporting,
    importing,
    exportingRiders,
    importingRiders,
    exportingOrders,
    importingOrders,
    exportingMerchants,
    importingMerchants,
    exportingAll,
    exportingToFolder,
    importingAll,
    refreshAll,
    exportUsers,
    beforeImport,
    handleImport,
    exportRiders,
    exportOrders,
    exportMerchants,
    exportAllToFolder,
    exportAllData,
    handleImportAll,
    validateDataType
  };
}
