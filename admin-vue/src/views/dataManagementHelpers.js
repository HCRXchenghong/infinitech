import { computed, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  buildDataManagementConfigImportConfirmMessage,
  buildDataManagementContentItemCount,
  buildDataManagementImportConfirmMessage,
  buildDataManagementImportPayload,
  buildDataManagementSummaryCards,
  createDataManagementExportSummary,
  formatDataManagementExportDate,
  getDataManagementBusinessMeta,
  getDataManagementConfigMeta,
  validateDataManagementBusinessData,
  validateDataManagementConfigBundle,
  validateDataManagementImportFile,
  extractAdminMerchantPage,
  extractAdminOrderPage,
  extractAdminRiderPage,
  extractAdminUserPage,
} from '@infinitech/admin-core';
import { extractEnvelopeData } from '@infinitech/contracts';
import request from '@/utils/request';
import {
  buildDataManagementErrorMessage,
  saveDataManagementJsonFile,
} from './dataManagementRuntimeHelpers';
import { useDataManagementBundleHelpers } from './dataManagementBundleHelpers';

export function useDataManagementPage() {
  const loading = ref(false);
  const summaryLoaded = ref(false);
  const lastCheckedAt = ref('');

  const exporting = ref(false);
  const importing = ref(false);
  const exportingRiders = ref(false);
  const importingRiders = ref(false);
  const exportingOrders = ref(false);
  const importingOrders = ref(false);
  const exportingMerchants = ref(false);
  const importingMerchants = ref(false);

  const exportingSystemSettings = ref(false);
  const importingSystemSettings = ref(false);
  const exportingContentConfig = ref(false);
  const importingContentConfig = ref(false);
  const exportingApiConfig = ref(false);
  const importingApiConfig = ref(false);
  const exportingPaymentConfig = ref(false);
  const importingPaymentConfig = ref(false);

  const exportingAll = ref(false);
  const exportingToFolder = ref(false);
  const importingAll = ref(false);

  const exportSummary = ref(createDataManagementExportSummary());
  const summaryCards = computed(() =>
    buildDataManagementSummaryCards(exportSummary.value, summaryLoaded.value),
  );

  const businessExportLoadingRefs = {
    users: exporting,
    riders: exportingRiders,
    orders: exportingOrders,
    merchants: exportingMerchants,
  };

  const businessImportLoadingRefs = {
    users: importing,
    riders: importingRiders,
    orders: importingOrders,
    merchants: importingMerchants,
  };

  const configExportLoadingRefs = {
    system_settings: exportingSystemSettings,
    content_config: exportingContentConfig,
    api_config: exportingApiConfig,
    payment_config: exportingPaymentConfig,
  };

  const configImportLoadingRefs = {
    system_settings: importingSystemSettings,
    content_config: importingContentConfig,
    api_config: importingApiConfig,
    payment_config: importingPaymentConfig,
  };

  const validateDataType = validateDataManagementBusinessData;
  const validateConfigBundle = validateDataManagementConfigBundle;

  async function refreshAll(showMessage = true) {
    loading.value = true;
    try {
      const [
        usersRes,
        ridersRes,
        ordersRes,
        merchantsRes,
        systemRes,
        contentRes,
        apiRes,
        paymentRes,
      ] = await Promise.allSettled([
        request.get('/api/users', { params: { page: 1, limit: 1 } }),
        request.get('/api/riders', { params: { page: 1, limit: 1 } }),
        request.get('/api/orders', { params: { page: 1, limit: 1 } }),
        request.get('/api/merchants', { params: { page: 1, limit: 1 } }),
        request.get('/api/data-exports/system-settings'),
        request.get('/api/data-exports/content-config'),
        request.get('/api/data-exports/api-config'),
        request.get('/api/data-exports/payment-config'),
      ]);

      const failedCount = [
        usersRes,
        ridersRes,
        ordersRes,
        merchantsRes,
        systemRes,
        contentRes,
        apiRes,
        paymentRes,
      ].filter((item) => item.status === 'rejected').length;

      exportSummary.value = {
        users: usersRes.status === 'fulfilled'
          ? Number(extractAdminUserPage(usersRes.value?.data).total || 0)
          : 0,
        riders: ridersRes.status === 'fulfilled'
          ? Number(extractAdminRiderPage(ridersRes.value?.data).total || 0)
          : 0,
        orders: ordersRes.status === 'fulfilled'
          ? Number(extractAdminOrderPage(ordersRes.value?.data).total || 0)
          : 0,
        merchants: merchantsRes.status === 'fulfilled'
          ? Number(extractAdminMerchantPage(merchantsRes.value?.data).total || 0)
          : 0,
        systemSettingKeys: systemRes.status === 'fulfilled'
          ? Number(extractEnvelopeData(systemRes.value?.data)?.summary?.setting_keys || 0)
          : 0,
        contentItems: contentRes.status === 'fulfilled'
          ? buildDataManagementContentItemCount(
            extractEnvelopeData(contentRes.value?.data)?.summary || {},
          )
          : 0,
        publicApiCount: apiRes.status === 'fulfilled'
          ? Number(extractEnvelopeData(apiRes.value?.data)?.summary?.public_api_count || 0)
          : 0,
        paymentConfigGroups: paymentRes.status === 'fulfilled'
          ? Number(extractEnvelopeData(paymentRes.value?.data)?.summary?.config_groups || 0)
          : 0,
      };

      summaryLoaded.value = true;
      lastCheckedAt.value = new Date().toLocaleString('zh-CN', { hour12: false });

      if (showMessage) {
        if (failedCount === 0) {
          ElMessage.success('数据管理导出链路校验完成');
        } else {
          ElMessage.warning(`导出链路已刷新，仍有 ${failedCount} 项未成功校验`);
        }
      }
    } catch (error) {
      if (showMessage) {
        ElMessage.error(buildDataManagementErrorMessage('刷新失败', error));
      }
    } finally {
      loading.value = false;
    }
  }

  async function exportData(endpoint, filename, loadingRef) {
    loadingRef.value = true;
    try {
      let data;
      try {
        const response = await request.get(endpoint);
        data = extractEnvelopeData(response.data);
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
            { name: '所有文件', extensions: ['*'] },
          ],
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
        saveDataManagementJsonFile(jsonString, filename);
        ElMessage.success('数据导出成功');
      }
    } catch (error) {
      ElMessage.error(buildDataManagementErrorMessage('导出失败', error));
    } finally {
      loadingRef.value = false;
    }
  }

  async function exportBusinessData(type) {
    const meta = getDataManagementBusinessMeta(type);
    const loadingRef = businessExportLoadingRefs[type];
    if (!meta || !loadingRef) {
      ElMessage.error('未知业务数据类型');
      return;
    }
    await exportData(
      meta.exportEndpoint,
      `${meta.filenamePrefix}_${formatDataManagementExportDate()}.json`,
      loadingRef,
    );
  }

  async function exportConfigData(scope) {
    const meta = getDataManagementConfigMeta(scope);
    const loadingRef = configExportLoadingRefs[scope];
    if (!meta || !loadingRef) {
      ElMessage.error('未知配置类型');
      return;
    }
    await exportData(
      meta.exportEndpoint,
      `${meta.filenamePrefix}_${formatDataManagementExportDate()}.json`,
      loadingRef,
    );
  }

  async function exportUsers() {
    await exportBusinessData('users');
  }

  async function exportRiders() {
    await exportBusinessData('riders');
  }

  async function exportOrders() {
    await exportBusinessData('orders');
  }

  async function exportMerchants() {
    await exportBusinessData('merchants');
  }

  async function exportSystemSettings() {
    await exportConfigData('system_settings');
  }

  async function exportContentConfig() {
    await exportConfigData('content_config');
  }

  async function exportApiConfig() {
    await exportConfigData('api_config');
  }

  async function exportPaymentConfig() {
    await exportConfigData('payment_config');
  }

  function beforeImport(file) {
    const result = validateDataManagementImportFile(file);
    if (!result.valid) {
      ElMessage.error(result.message);
      return false;
    }
    return true;
  }

  async function handleImport(options, dataType) {
    const meta = getDataManagementBusinessMeta(dataType);
    const loadingRef = businessImportLoadingRefs[dataType];

    if (!meta || !loadingRef) {
      ElMessage.error('未知业务数据类型');
      return;
    }

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
        ElMessage.error(`${meta.label}数据格式错误，应为数组格式`);
        loadingRef.value = false;
        return;
      }

      if (data.length === 0) {
        ElMessage.warning(`${meta.label}数据为空`);
        loadingRef.value = false;
        return;
      }

      const validation = validateDataType(data, dataType);
      if (!validation.valid) {
        await ElMessageBox.alert(validation.error, '数据类型错误', {
          confirmButtonText: '确定',
          type: 'error',
        });
        loadingRef.value = false;
        return;
      }

      await ElMessageBox.confirm(
        buildDataManagementImportConfirmMessage(dataType, data.length),
        '确认导入',
        {
          confirmButtonText: '确定导入',
          cancelButtonText: '取消',
          type: 'warning',
        },
      );

      const response = await request.post(
        meta.importEndpoint,
        buildDataManagementImportPayload(dataType, data),
      );
      const payload = extractEnvelopeData(response.data) || {};

      if (response.data.success) {
        const successCount = Number(payload.successCount ?? response.data.successCount ?? 0);
        const errorCount = Number(payload.errorCount ?? response.data.errorCount ?? 0);
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
        ElMessage.error(buildDataManagementErrorMessage('导入失败', error));
      }
    } finally {
      loadingRef.value = false;
    }
  }

  async function handleConfigImport(options, scope) {
    const meta = getDataManagementConfigMeta(scope);
    const loadingRef = configImportLoadingRefs[scope];

    if (!meta || !loadingRef) {
      ElMessage.error('未知配置类型');
      return;
    }

    loadingRef.value = true;
    try {
      const file = options.file;
      const text = await file.text();

      if (!text || text.trim().length === 0) {
        ElMessage.error('文件内容为空');
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        ElMessage.error(`JSON格式错误: ${parseError.message}`);
        return;
      }

      const validation = validateConfigBundle(data, scope);
      if (!validation.valid) {
        await ElMessageBox.alert(validation.error, '配置类型错误', {
          confirmButtonText: '确定',
          type: 'error',
        });
        return;
      }

      await ElMessageBox.confirm(
        buildDataManagementConfigImportConfirmMessage(scope),
        '确认导入',
        {
          confirmButtonText: '确定导入',
          cancelButtonText: '取消',
          type: 'warning',
        },
      );

      const response = await request.post(meta.importEndpoint, data);
      if (response.data?.success) {
        ElMessage.success(`${meta.label}导入完成`);
      } else {
        ElMessage.error(`${meta.label}导入失败`);
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(buildDataManagementErrorMessage('导入失败', error));
      }
    } finally {
      loadingRef.value = false;
    }
  }

  const { exportAllToFolder, exportAllData, handleImportAll } = useDataManagementBundleHelpers({
    request,
    ElMessage,
    ElMessageBox,
    exportingToFolder,
    exportingAll,
    importingAll,
    validateDataType,
    validateConfigBundle,
  });

  return {
    loading,
    summaryLoaded,
    summaryCards,
    lastCheckedAt,
    exporting,
    importing,
    exportingRiders,
    importingRiders,
    exportingOrders,
    importingOrders,
    exportingMerchants,
    importingMerchants,
    exportingSystemSettings,
    importingSystemSettings,
    exportingContentConfig,
    importingContentConfig,
    exportingApiConfig,
    importingApiConfig,
    exportingPaymentConfig,
    importingPaymentConfig,
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
    exportSystemSettings,
    exportContentConfig,
    exportApiConfig,
    exportPaymentConfig,
    handleConfigImport,
    exportAllToFolder,
    exportAllData,
    handleImportAll,
    validateDataType,
    validateConfigBundle,
  };
}
