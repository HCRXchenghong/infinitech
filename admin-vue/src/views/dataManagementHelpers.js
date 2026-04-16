import { computed, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  extractAdminMerchantPage,
  extractAdminRiderPage,
  extractAdminUserPage,
} from '@infinitech/admin-core';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import request from '@/utils/request';
import { useDataManagementBundleHelpers } from './dataManagementBundleHelpers';

function formatExportDate() {
  return new Date().toISOString().split('T')[0];
}

function buildErrorMessage(prefix, error) {
  if (error?.request && !error?.response) {
    return `${prefix}: 网络连接失败，请检查网络或服务器状态`;
  }
  return `${prefix}: ${extractErrorMessage(error, '未知错误')}`;
}

function saveJsonFile(jsonString, filename) {
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

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

  const exportSummary = ref({
    users: 0,
    riders: 0,
    orders: 0,
    merchants: 0,
    systemSettingKeys: 0,
    contentItems: 0,
    publicApiCount: 0,
    paymentConfigGroups: 0,
  });

  const summaryCards = computed(() => [
    {
      label: '用户',
      value: summaryLoaded.value ? exportSummary.value.users : '--',
      tip: '用户数据已校验总量',
    },
    {
      label: '骑手',
      value: summaryLoaded.value ? exportSummary.value.riders : '--',
      tip: '骑手数据已校验总量',
    },
    {
      label: '订单',
      value: summaryLoaded.value ? exportSummary.value.orders : '--',
      tip: '订单数据已校验总量',
    },
    {
      label: '商户',
      value: summaryLoaded.value ? exportSummary.value.merchants : '--',
      tip: '商户数据已校验总量',
    },
    {
      label: '系统配置',
      value: summaryLoaded.value ? exportSummary.value.systemSettingKeys : '--',
      tip: '可导出配置键数量',
    },
    {
      label: '内容运营',
      value: summaryLoaded.value ? exportSummary.value.contentItems : '--',
      tip: '轮播、推送、首页投放总数',
    },
    {
      label: 'API 配置',
      value: summaryLoaded.value ? exportSummary.value.publicApiCount : '--',
      tip: '第三方与开放接口数量',
    },
    {
      label: '支付配置',
      value: summaryLoaded.value ? exportSummary.value.paymentConfigGroups : '--',
      tip: '支付配置组数量',
    },
  ]);

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
        orders: ordersRes.status === 'fulfilled' ? Number(ordersRes.value?.data?.total || 0) : 0,
        merchants: merchantsRes.status === 'fulfilled'
          ? Number(extractAdminMerchantPage(merchantsRes.value?.data).total || 0)
          : 0,
        systemSettingKeys: systemRes.status === 'fulfilled'
          ? Number(extractEnvelopeData(systemRes.value?.data)?.summary?.setting_keys || 0)
          : 0,
        contentItems: contentRes.status === 'fulfilled'
          ? Number(extractEnvelopeData(contentRes.value?.data)?.summary?.carousel_count || 0)
            + Number(extractEnvelopeData(contentRes.value?.data)?.summary?.push_message_count || 0)
            + Number(extractEnvelopeData(contentRes.value?.data)?.summary?.home_campaign_count || 0)
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
        ElMessage.error(buildErrorMessage('刷新失败', error));
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
        saveJsonFile(jsonString, filename);
        ElMessage.success('数据导出成功');
      }
    } catch (error) {
      ElMessage.error(buildErrorMessage('导出失败', error));
    } finally {
      loadingRef.value = false;
    }
  }

  async function exportUsers() {
    await exportData('/api/users/export', `users_backup_${formatExportDate()}.json`, exporting);
  }

  async function exportRiders() {
    await exportData('/api/riders/export', `riders_backup_${formatExportDate()}.json`, exportingRiders);
  }

  async function exportOrders() {
    await exportData('/api/orders/export', `orders_backup_${formatExportDate()}.json`, exportingOrders);
  }

  async function exportMerchants() {
    await exportData('/api/merchants/export', `merchants_backup_${formatExportDate()}.json`, exportingMerchants);
  }

  async function exportSystemSettings() {
    await exportData('/api/data-exports/system-settings', `system_settings_backup_${formatExportDate()}.json`, exportingSystemSettings);
  }

  async function exportContentConfig() {
    await exportData('/api/data-exports/content-config', `content_config_backup_${formatExportDate()}.json`, exportingContentConfig);
  }

  async function exportApiConfig() {
    await exportData('/api/data-exports/api-config', `api_config_backup_${formatExportDate()}.json`, exportingApiConfig);
  }

  async function exportPaymentConfig() {
    await exportData('/api/data-exports/payment-config', `payment_config_backup_${formatExportDate()}.json`, exportingPaymentConfig);
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

  function validateConfigBundle(data, expectedScope) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { valid: false, error: '配置文件格式错误，应为对象格式' };
    }

    const scopeSignatures = {
      system_settings: ['debug_mode', 'service_settings', 'charity_settings', 'vip_settings', 'coin_ratio', 'app_download_config'],
      content_config: ['carousel_settings', 'carousels', 'push_messages', 'home_campaigns'],
      api_config: ['sms_config', 'weather_config', 'wechat_login_config', 'public_apis'],
      payment_config: ['pay_mode', 'wxpay_config', 'alipay_config', 'payment_notices'],
    };

    if (data.scope && data.scope !== expectedScope) {
      return {
        valid: false,
        error: `检测到这是 ${data.scope} 导出文件，不能导入到 ${expectedScope} 中！`,
      };
    }

    const expectedKeys = scopeSignatures[expectedScope] || [];
    const matchedCount = expectedKeys.filter((key) => data[key] !== undefined).length;
    if (matchedCount === 0) {
      return { valid: false, error: '未检测到当前配置类型的关键字段' };
    }

    const otherScopes = Object.entries(scopeSignatures)
      .filter(([scope]) => scope !== expectedScope)
      .map(([scope, keys]) => ({
        scope,
        matched: keys.filter((key) => data[key] !== undefined).length,
      }));

    const conflict = otherScopes.find((item) => item.matched > matchedCount);
    if (conflict) {
      return {
        valid: false,
        error: `检测到这是 ${conflict.scope} 导出文件，不能导入到 ${expectedScope} 中！`,
      };
    }

    return { valid: true };
  }

  async function handleImport(options, dataType) {
    const loadingRef = dataType === 'users'
      ? importing
      : dataType === 'riders'
        ? importingRiders
        : dataType === 'orders'
          ? importingOrders
          : importingMerchants;

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
        await ElMessageBox.alert(validation.error, '数据类型错误', {
          confirmButtonText: '确定',
          type: 'error',
        });
        loadingRef.value = false;
        return;
      }

      const typeName = dataType === 'users'
        ? '用户'
        : dataType === 'riders'
          ? '骑手'
          : dataType === 'orders'
            ? '订单'
            : '商户';

      await ElMessageBox.confirm(
        `即将导入 ${data.length} 条${typeName}数据，这将覆盖或创建${typeName}（包括已删除的${typeName}）。是否继续？`,
        '确认导入',
        {
          confirmButtonText: '确定导入',
          cancelButtonText: '取消',
          type: 'warning',
        },
      );

      const endpoint = dataType === 'users'
        ? '/api/users/import'
        : dataType === 'riders'
          ? '/api/riders/import'
          : dataType === 'orders'
            ? '/api/orders/import'
            : '/api/merchants/import';

      const requestData = dataType === 'users'
        ? { users: data }
        : dataType === 'riders'
          ? { riders: data }
          : dataType === 'orders'
            ? { orders: data }
            : { merchants: data };

      const response = await request.post(endpoint, requestData);
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
        ElMessage.error(buildErrorMessage('导入失败', error));
      }
    } finally {
      loadingRef.value = false;
    }
  }

  async function handleConfigImport(options, scope) {
    const scopeMeta = {
      system_settings: {
        label: '系统配置',
        endpoint: '/api/data-imports/system-settings',
        loadingRef: importingSystemSettings,
      },
      content_config: {
        label: '内容配置',
        endpoint: '/api/data-imports/content-config',
        loadingRef: importingContentConfig,
      },
      api_config: {
        label: 'API 配置',
        endpoint: '/api/data-imports/api-config',
        loadingRef: importingApiConfig,
      },
      payment_config: {
        label: '支付配置',
        endpoint: '/api/data-imports/payment-config',
        loadingRef: importingPaymentConfig,
      },
    };

    const meta = scopeMeta[scope];
    if (!meta) {
      ElMessage.error('未知配置类型');
      return;
    }

    meta.loadingRef.value = true;
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
        `即将导入${meta.label}，这会按备份内容覆盖或创建对应配置。是否继续？`,
        '确认导入',
        {
          confirmButtonText: '确定导入',
          cancelButtonText: '取消',
          type: 'warning',
        },
      );

      const response = await request.post(meta.endpoint, data);
      if (response.data?.success) {
        ElMessage.success(`${meta.label}导入完成`);
      } else {
        ElMessage.error(`${meta.label}导入失败`);
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(buildErrorMessage('导入失败', error));
      }
    } finally {
      meta.loadingRef.value = false;
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
