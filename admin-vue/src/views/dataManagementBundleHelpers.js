import { extractErrorMessage } from '@infinitech/contracts';

function formatExportDate() {
  return new Date().toISOString().split('T')[0];
}

function buildPlatformBackupSummary(allData) {
  const contentSummary = allData.content_config?.summary || {};
  const apiSummary = allData.api_config?.summary || {};
  const paymentSummary = allData.payment_config?.summary || {};
  const systemSummary = allData.system_settings?.summary || {};

  return {
    usersCount: Array.isArray(allData.users) ? allData.users.length : 0,
    ridersCount: Array.isArray(allData.riders) ? allData.riders.length : 0,
    ordersCount: Array.isArray(allData.orders) ? allData.orders.length : 0,
    merchantsCount: Array.isArray(allData.merchants) ? allData.merchants.length : 0,
    systemSettingKeys: Number(systemSummary.setting_keys || 0),
    contentItemsCount:
      Number(contentSummary.carousel_count || 0)
      + Number(contentSummary.push_message_count || 0)
      + Number(contentSummary.home_campaign_count || 0),
    publicApiCount: Number(apiSummary.public_api_count || 0),
    paymentConfigGroups: Number(paymentSummary.config_groups || 0),
  };
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

export function useDataManagementBundleHelpers({
  request,
  ElMessage,
  ElMessageBox,
  exportingToFolder,
  exportingAll,
  importingAll,
  validateDataType,
  validateConfigBundle,
}) {
  async function buildPlatformBackupPayload() {
    const { getFromCache, STORES } = await import('@/utils/cache');

    async function getBusinessDataWithCache(endpoint, storeName) {
      try {
        const response = await request.get(endpoint);
        return response.data;
      } catch (error) {
        if (error.isNetworkError || !error.response) {
          const cachedData = await getFromCache(storeName);
          if (cachedData && cachedData.length > 0) {
            return cachedData;
          }
        }
        throw error;
      }
    }

    const [
      users,
      riders,
      orders,
      merchants,
      systemSettings,
      contentConfig,
      apiConfig,
      paymentConfig,
    ] = await Promise.all([
      getBusinessDataWithCache('/api/users/export', STORES.USERS),
      getBusinessDataWithCache('/api/riders/export', STORES.RIDERS),
      getBusinessDataWithCache('/api/orders/export', STORES.ORDERS),
      getBusinessDataWithCache('/api/merchants/export', STORES.MERCHANTS),
      request.get('/api/data-exports/system-settings').then((res) => res.data),
      request.get('/api/data-exports/content-config').then((res) => res.data),
      request.get('/api/data-exports/api-config').then((res) => res.data),
      request.get('/api/data-exports/payment-config').then((res) => res.data),
    ]);

    const payload = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      backupType: 'platform_snapshot',
      users: users || [],
      riders: riders || [],
      orders: orders || [],
      merchants: merchants || [],
      system_settings: systemSettings || {},
      content_config: contentConfig || {},
      api_config: apiConfig || {},
      payment_config: paymentConfig || {},
    };

    payload.summary = buildPlatformBackupSummary(payload);
    return payload;
  }

  async function exportAllToFolder() {
    if (!window.electronAPI || !window.electronAPI.exportAllToFolder) {
      ElMessage.warning('此功能仅在桌面应用中可用');
      return;
    }

    exportingToFolder.value = true;
    try {
      const allData = await buildPlatformBackupPayload();
      const result = await window.electronAPI.exportAllToFolder({
        users: allData.users,
        riders: allData.riders,
        orders: allData.orders,
        merchants: allData.merchants,
        system_settings: allData.system_settings,
        content_config: allData.content_config,
        api_config: allData.api_config,
        payment_config: allData.payment_config,
        manifest: {
          version: allData.version,
          exportDate: allData.exportDate,
          backupType: allData.backupType,
          summary: allData.summary,
        },
      });

      if (result.success) {
        const summary = allData.summary;
        ElMessage.success({
          message: `平台备份导出成功！\n文件夹: ${result.folder}\n文件数: ${result.files}\n用户: ${summary.usersCount}，骑手: ${summary.ridersCount}，订单: ${summary.ordersCount}，商户: ${summary.merchantsCount}\n系统配置: ${summary.systemSettingKeys} 项，内容运营: ${summary.contentItemsCount} 项，开放 API: ${summary.publicApiCount} 个，支付配置: ${summary.paymentConfigGroups} 组`,
          duration: 6000,
        });
      } else {
        ElMessage.error(`导出失败: ${result.error}`);
      }
    } catch (error) {
      ElMessage.error(buildErrorMessage('导出失败', error));
    } finally {
      exportingToFolder.value = false;
    }
  }

  async function exportAllData() {
    exportingAll.value = true;
    try {
      const allData = await buildPlatformBackupPayload();
      const jsonString = JSON.stringify(allData, null, 2);
      const filename = `platform_backup_${formatExportDate()}.json`;

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
            ElMessage.success('平台备份导出成功');
          } else {
            ElMessage.error(`导出失败: ${writeResult.error}`);
          }
        }
      } else {
        saveJsonFile(jsonString, filename);
        ElMessage.success(`平台备份导出成功！用户 ${allData.summary.usersCount} / 骑手 ${allData.summary.ridersCount} / 订单 ${allData.summary.ordersCount} / 商户 ${allData.summary.merchantsCount}，另含系统、内容、API、支付配置快照`);
      }
    } catch (error) {
      ElMessage.error(buildErrorMessage('打包失败', error));
    } finally {
      exportingAll.value = false;
    }
  }

  async function handleImportAll(options) {
    importingAll.value = true;
    try {
      const file = options.file;
      const text = await file.text();

      if (!text || text.trim().length === 0) {
        ElMessage.error('文件内容为空');
        importingAll.value = false;
        return;
      }

      let allData;
      try {
        allData = JSON.parse(text);
      } catch (parseError) {
        ElMessage.error(`JSON格式错误: ${parseError.message}`);
        importingAll.value = false;
        return;
      }

      const isAllDataFormat = allData.users !== undefined
        || allData.riders !== undefined
        || allData.orders !== undefined
        || allData.merchants !== undefined
        || allData.system_settings !== undefined
        || allData.content_config !== undefined
        || allData.api_config !== undefined
        || allData.payment_config !== undefined;

      if (isAllDataFormat) {
        const usersCount = Array.isArray(allData.users) ? allData.users.length : 0;
        const ridersCount = Array.isArray(allData.riders) ? allData.riders.length : 0;
        const ordersCount = Array.isArray(allData.orders) ? allData.orders.length : 0;
        const merchantsCount = Array.isArray(allData.merchants) ? allData.merchants.length : 0;
        const hasConfigSections = allData.system_settings !== undefined
          || allData.content_config !== undefined
          || allData.api_config !== undefined
          || allData.payment_config !== undefined;

        const totalCount = usersCount + ridersCount + ordersCount + merchantsCount;

        if (totalCount === 0 && !hasConfigSections) {
          ElMessage.warning('数据包为空');
          importingAll.value = false;
          return;
        }

        let confirmMessage = `即将导入综合数据包：<br/>
        • 用户数据: ${usersCount} 条<br/>
        • 骑手数据: ${ridersCount} 条<br/>
        • 订单数据: ${ordersCount} 条<br/>
        • 商户数据: ${merchantsCount} 条<br/><br/>
        总计: ${totalCount} 条业务数据<br/><br/>
        这将覆盖或创建相应的数据（包括已删除的数据）。`;

        if (hasConfigSections) {
          confirmMessage += '<br/><br/>检测到系统/内容/API/支付配置快照，导入时会一并写回对应配置。';
        }

        confirmMessage += '<br/><br/>是否继续？';

        await ElMessageBox.confirm(confirmMessage, '确认导入综合数据', {
          confirmButtonText: '确定导入',
          cancelButtonText: '取消',
          type: 'warning',
          dangerouslyUseHTMLString: true,
        });

        const results = {
          users: { success: 0, error: 0 },
          riders: { success: 0, error: 0 },
          orders: { success: 0, error: 0 },
          merchants: { success: 0, error: 0 },
          systemSettings: { success: false },
          contentConfig: { success: false },
          apiConfig: { success: false },
          paymentConfig: { success: false },
        };

        if (usersCount > 0 && Array.isArray(allData.users)) {
          try {
            const validation = validateDataType(allData.users, 'users');
            if (!validation.valid) {
              ElMessage.warning(`用户数据验证失败: ${validation.error}`);
            } else {
              const response = await request.post('/api/users/import', { users: allData.users });
              if (response.data.success) {
                results.users = {
                  success: response.data.successCount || 0,
                  error: response.data.errorCount || 0,
                };
              }
            }
          } catch (e) {
            results.users.error = usersCount;
          }
        }

        if (ridersCount > 0 && Array.isArray(allData.riders)) {
          try {
            const validation = validateDataType(allData.riders, 'riders');
            if (!validation.valid) {
              ElMessage.warning(`骑手数据验证失败: ${validation.error}`);
            } else {
              const response = await request.post('/api/riders/import', { riders: allData.riders });
              if (response.data.success) {
                results.riders = {
                  success: response.data.successCount || 0,
                  error: response.data.errorCount || 0,
                };
              }
            }
          } catch (e) {
            results.riders.error = ridersCount;
          }
        }

        if (ordersCount > 0 && Array.isArray(allData.orders)) {
          try {
            const validation = validateDataType(allData.orders, 'orders');
            if (!validation.valid) {
              ElMessage.warning(`订单数据验证失败: ${validation.error}`);
            } else {
              const response = await request.post('/api/orders/import', { orders: allData.orders });
              if (response.data.success) {
                results.orders = {
                  success: response.data.successCount || 0,
                  error: response.data.errorCount || 0,
                };
              }
            }
          } catch (e) {
            results.orders.error = ordersCount;
          }
        }

        if (merchantsCount > 0 && Array.isArray(allData.merchants)) {
          try {
            const validation = validateDataType(allData.merchants, 'merchants');
            if (!validation.valid) {
              ElMessage.warning(`商户数据验证失败: ${validation.error}`);
            } else {
              const response = await request.post('/api/merchants/import', { merchants: allData.merchants });
              if (response.data.success) {
                results.merchants = {
                  success: response.data.successCount || 0,
                  error: response.data.errorCount || 0,
                };
              }
            }
          } catch (e) {
            results.merchants.error = merchantsCount;
          }
        }

        if (allData.system_settings) {
          try {
            const validation = validateConfigBundle(allData.system_settings, 'system_settings');
            if (!validation.valid) {
              ElMessage.warning(`系统配置验证失败: ${validation.error}`);
            } else {
              const response = await request.post('/api/data-imports/system-settings', allData.system_settings);
              results.systemSettings.success = Boolean(response.data?.success);
            }
          } catch (e) {
            results.systemSettings.success = false;
          }
        }

        if (allData.content_config) {
          try {
            const validation = validateConfigBundle(allData.content_config, 'content_config');
            if (!validation.valid) {
              ElMessage.warning(`内容配置验证失败: ${validation.error}`);
            } else {
              const response = await request.post('/api/data-imports/content-config', allData.content_config);
              results.contentConfig.success = Boolean(response.data?.success);
            }
          } catch (e) {
            results.contentConfig.success = false;
          }
        }

        if (allData.api_config) {
          try {
            const validation = validateConfigBundle(allData.api_config, 'api_config');
            if (!validation.valid) {
              ElMessage.warning(`API 配置验证失败: ${validation.error}`);
            } else {
              const response = await request.post('/api/data-imports/api-config', allData.api_config);
              results.apiConfig.success = Boolean(response.data?.success);
            }
          } catch (e) {
            results.apiConfig.success = false;
          }
        }

        if (allData.payment_config) {
          try {
            const validation = validateConfigBundle(allData.payment_config, 'payment_config');
            if (!validation.valid) {
              ElMessage.warning(`支付配置验证失败: ${validation.error}`);
            } else {
              const response = await request.post('/api/data-imports/payment-config', allData.payment_config);
              results.paymentConfig.success = Boolean(response.data?.success);
            }
          } catch (e) {
            results.paymentConfig.success = false;
          }
        }

        let message = '综合数据导入完成！<br/>';
        if (usersCount > 0) {
          message += `用户: 成功 ${results.users.success}，失败 ${results.users.error}<br/>`;
        }
        if (ridersCount > 0) {
          message += `骑手: 成功 ${results.riders.success}，失败 ${results.riders.error}<br/>`;
        }
        if (ordersCount > 0) {
          message += `订单: 成功 ${results.orders.success}，失败 ${results.orders.error}<br/>`;
        }
        if (merchantsCount > 0) {
          message += `商户: 成功 ${results.merchants.success}，失败 ${results.merchants.error}`;
        }
        if (hasConfigSections) {
          message += '<br/><br/>配置恢复结果：';
          if (allData.system_settings) {
            message += `<br/>系统配置: ${results.systemSettings.success ? '成功' : '失败'}`;
          }
          if (allData.content_config) {
            message += `<br/>内容配置: ${results.contentConfig.success ? '成功' : '失败'}`;
          }
          if (allData.api_config) {
            message += `<br/>API 配置: ${results.apiConfig.success ? '成功' : '失败'}`;
          }
          if (allData.payment_config) {
            message += `<br/>支付配置: ${results.paymentConfig.success ? '成功' : '失败'}`;
          }
        }

        ElMessageBox.alert(message, '导入完成', {
          confirmButtonText: '确定',
          dangerouslyUseHTMLString: true,
          type: 'success',
        });
      } else {
        ElMessage.warning('无法识别数据格式，请使用综合数据包或单独导入相应类型的数据');
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(buildErrorMessage('导入失败', error));
      }
    } finally {
      importingAll.value = false;
    }
  }

  return {
    exportAllToFolder,
    exportAllData,
    handleImportAll,
  };
}
