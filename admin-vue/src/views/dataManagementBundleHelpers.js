import { extractEnvelopeData } from '@infinitech/contracts';
import {
  buildDataManagementImportPayload,
  buildPlatformBackupSummary,
  DATA_MANAGEMENT_BUSINESS_TYPES,
  DATA_MANAGEMENT_CONFIG_SCOPES,
  formatDataManagementExportDate,
  isPlatformBackupPayload,
} from '@infinitech/admin-core';
import {
  buildDataManagementErrorMessage,
  saveDataManagementJsonFile,
} from './dataManagementRuntimeHelpers';

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
    const businessStoreMap = {
      users: STORES.USERS,
      riders: STORES.RIDERS,
      orders: STORES.ORDERS,
      merchants: STORES.MERCHANTS,
    };

    async function getBusinessDataWithCache(endpoint, storeName) {
      try {
        const response = await request.get(endpoint);
        return extractEnvelopeData(response.data);
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

    const businessEntries = await Promise.all(
      DATA_MANAGEMENT_BUSINESS_TYPES.map(async (item) => [
        item.key,
        (await getBusinessDataWithCache(
          item.exportEndpoint,
          businessStoreMap[item.key],
        )) || [],
      ]),
    );

    const configEntries = await Promise.all(
      DATA_MANAGEMENT_CONFIG_SCOPES.map(async (item) => [
        item.key,
        (await request.get(item.exportEndpoint).then((res) => extractEnvelopeData(res.data))) || {},
      ]),
    );

    const payload = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      backupType: 'platform_snapshot',
      ...Object.fromEntries(businessEntries),
      ...Object.fromEntries(configEntries),
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
        ...Object.fromEntries(
          DATA_MANAGEMENT_BUSINESS_TYPES.map((item) => [item.key, allData[item.key]]),
        ),
        ...Object.fromEntries(
          DATA_MANAGEMENT_CONFIG_SCOPES.map((item) => [item.key, allData[item.key]]),
        ),
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
      ElMessage.error(buildDataManagementErrorMessage('导出失败', error));
    } finally {
      exportingToFolder.value = false;
    }
  }

  async function exportAllData() {
    exportingAll.value = true;
    try {
      const allData = await buildPlatformBackupPayload();
      const jsonString = JSON.stringify(allData, null, 2);
      const filename = `platform_backup_${formatDataManagementExportDate()}.json`;

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
        saveDataManagementJsonFile(jsonString, filename);
        ElMessage.success(`平台备份导出成功！用户 ${allData.summary.usersCount} / 骑手 ${allData.summary.ridersCount} / 订单 ${allData.summary.ordersCount} / 商户 ${allData.summary.merchantsCount}，另含系统、内容、API、支付配置快照`);
      }
    } catch (error) {
      ElMessage.error(buildDataManagementErrorMessage('打包失败', error));
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

      const isAllDataFormat = isPlatformBackupPayload(allData);

      if (isAllDataFormat) {
        const businessCounts = Object.fromEntries(
          DATA_MANAGEMENT_BUSINESS_TYPES.map((item) => [
            item.key,
            Array.isArray(allData[item.key]) ? allData[item.key].length : 0,
          ]),
        );
        const hasConfigSections = DATA_MANAGEMENT_CONFIG_SCOPES.some(
          (item) => allData[item.key] !== undefined,
        );
        const totalCount = Object.values(businessCounts).reduce(
          (sum, count) => sum + count,
          0,
        );

        if (totalCount === 0 && !hasConfigSections) {
          ElMessage.warning('数据包为空');
          importingAll.value = false;
          return;
        }

        let confirmMessage = `即将导入综合数据包：<br/>
        • 用户数据: ${businessCounts.users} 条<br/>
        • 骑手数据: ${businessCounts.riders} 条<br/>
        • 订单数据: ${businessCounts.orders} 条<br/>
        • 商户数据: ${businessCounts.merchants} 条<br/><br/>
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

        const results = Object.fromEntries(
          DATA_MANAGEMENT_BUSINESS_TYPES.map((item) => [
            item.key,
            { success: 0, error: 0 },
          ]),
        );
        const configResults = Object.fromEntries(
          DATA_MANAGEMENT_CONFIG_SCOPES.map((item) => [
            item.key,
            { success: false },
          ]),
        );

        for (const item of DATA_MANAGEMENT_BUSINESS_TYPES) {
          const items = Array.isArray(allData[item.key]) ? allData[item.key] : [];
          if (items.length === 0) {
            continue;
          }
          try {
            const validation = validateDataType(items, item.key);
            if (!validation.valid) {
              ElMessage.warning(`${item.label}数据验证失败: ${validation.error}`);
              continue;
            }

            const response = await request.post(
              item.importEndpoint,
              buildDataManagementImportPayload(item.key, items),
            );
            const payload = extractEnvelopeData(response.data) || {};
            if (response.data.success) {
              results[item.key] = {
                success: Number(payload.successCount ?? response.data.successCount ?? 0),
                error: Number(payload.errorCount ?? response.data.errorCount ?? 0),
              };
            }
          } catch (_error) {
            results[item.key].error = items.length;
          }
        }

        for (const item of DATA_MANAGEMENT_CONFIG_SCOPES) {
          if (!allData[item.key]) {
            continue;
          }
          try {
            const validation = validateConfigBundle(allData[item.key], item.key);
            if (!validation.valid) {
              ElMessage.warning(`${item.label}验证失败: ${validation.error}`);
              continue;
            }

            const response = await request.post(item.importEndpoint, allData[item.key]);
            configResults[item.key].success = Boolean(response.data?.success);
          } catch (_error) {
            configResults[item.key].success = false;
          }
        }

        let message = '综合数据导入完成！<br/>';
        for (const item of DATA_MANAGEMENT_BUSINESS_TYPES) {
          if (businessCounts[item.key] > 0) {
            message += `${item.label}: 成功 ${results[item.key].success}，失败 ${results[item.key].error}<br/>`;
          }
        }
        if (hasConfigSections) {
          message += '<br/><br/>配置恢复结果：';
          for (const item of DATA_MANAGEMENT_CONFIG_SCOPES) {
            if (allData[item.key]) {
              message += `<br/>${item.label}: ${configResults[item.key].success ? '成功' : '失败'}`;
            }
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
        ElMessage.error(buildDataManagementErrorMessage('导入失败', error));
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
