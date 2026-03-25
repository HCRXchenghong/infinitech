export function useDataManagementBundleHelpers({
  request,
  ElMessage,
  ElMessageBox,
  exportingToFolder,
  exportingAll,
  importingAll,
  validateDataType,
}) {
  async function exportAllToFolder() {
    if (!window.electronAPI || !window.electronAPI.exportAllToFolder) {
      ElMessage.warning('此功能仅在桌面应用中可用');
      return;
    }

    exportingToFolder.value = true;
    try {
      const { getFromCache, STORES } = await import('@/utils/cache');

      async function getDataWithCache(endpoint, storeName) {
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

      let usersData;
      let ridersData;
      let ordersData;
      let merchantsData;
      let hasCacheWarning = false;

      try {
        [usersData, ridersData, ordersData, merchantsData] = await Promise.all([
          getDataWithCache('/api/users/export', STORES.USERS),
          getDataWithCache('/api/riders/export', STORES.RIDERS),
          getDataWithCache('/api/orders/export', STORES.ORDERS),
          getDataWithCache('/api/merchants/export', STORES.MERCHANTS)
        ]);
      } catch (error) {
        try {
          [usersData, ridersData, ordersData, merchantsData] = await Promise.all([
            getFromCache(STORES.USERS),
            getFromCache(STORES.RIDERS),
            getFromCache(STORES.ORDERS),
            getFromCache(STORES.MERCHANTS)
          ]);
          hasCacheWarning = true;
        } catch (cacheError) {
          throw new Error('网络连接失败且无缓存数据');
        }
      }

      const allData = {
        users: usersData || [],
        riders: ridersData || [],
        orders: ordersData || [],
        merchants: merchantsData || []
      };

      if (hasCacheWarning) {
        ElMessage.warning('网络连接失败，已使用缓存数据导出');
      }

      const result = await window.electronAPI.exportAllToFolder(allData);

      if (result.success) {
        const summary = result.summary;
        ElMessage.success({
          message: `数据导出成功！\n文件夹: ${result.folder}\n文件数: ${result.files}\n用户: ${summary.usersCount}，骑手: ${summary.ridersCount}，订单: ${summary.ordersCount}，商户: ${summary.merchantsCount}`,
          duration: 5000
        });
      } else {
        ElMessage.error(`导出失败: ${result.error}`);
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
      exportingToFolder.value = false;
    }
  }

  async function exportAllData() {
    exportingAll.value = true;
    try {
      const [usersRes, ridersRes, ordersRes, merchantsRes] = await Promise.all([
        request.get('/api/users/export'),
        request.get('/api/riders/export'),
        request.get('/api/orders/export'),
        request.get('/api/merchants/export')
      ]);

      const allData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        users: usersRes.data,
        riders: ridersRes.data,
        orders: ordersRes.data,
        merchants: merchantsRes.data,
        summary: {
          usersCount: Array.isArray(usersRes.data) ? usersRes.data.length : 0,
          ridersCount: Array.isArray(ridersRes.data) ? ridersRes.data.length : 0,
          ordersCount: Array.isArray(ordersRes.data) ? ordersRes.data.length : 0,
          merchantsCount: Array.isArray(merchantsRes.data) ? merchantsRes.data.length : 0
        }
      };

      const jsonString = JSON.stringify(allData, null, 2);
      const filename = `all_data_backup_${new Date().toISOString().split('T')[0]}.json`;

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
            ElMessage.success('所有数据导出成功');
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

        ElMessage.success(`数据打包成功！用户: ${allData.summary.usersCount}，骑手: ${allData.summary.ridersCount}，订单: ${allData.summary.ordersCount}，商户: ${allData.summary.merchantsCount}`);
      }
    } catch (error) {
      let errorMessage = '打包失败: ';
      if (error.response) {
        errorMessage += error.response.data?.error || `服务器错误 (${error.response.status})`;
      } else if (error.request) {
        errorMessage += '网络连接失败，请检查网络或服务器状态';
      } else {
        errorMessage += error.message || '未知错误';
      }
      ElMessage.error(errorMessage);
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

      const isAllDataFormat = allData.users !== undefined || allData.riders !== undefined ||
        allData.orders !== undefined || allData.merchants !== undefined;

      if (isAllDataFormat) {
        const usersCount = Array.isArray(allData.users) ? allData.users.length : 0;
        const ridersCount = Array.isArray(allData.riders) ? allData.riders.length : 0;
        const ordersCount = Array.isArray(allData.orders) ? allData.orders.length : 0;
        const merchantsCount = Array.isArray(allData.merchants) ? allData.merchants.length : 0;

        const totalCount = usersCount + ridersCount + ordersCount + merchantsCount;

        if (totalCount === 0) {
          ElMessage.warning('数据包为空');
          importingAll.value = false;
          return;
        }

        const confirmMessage = `即将导入综合数据包：<br/>
        • 用户数据: ${usersCount} 条<br/>
        • 骑手数据: ${ridersCount} 条<br/>
        • 订单数据: ${ordersCount} 条<br/>
        • 商户数据: ${merchantsCount} 条<br/><br/>
        总计: ${totalCount} 条数据<br/><br/>
        这将覆盖或创建相应的数据（包括已删除的数据）。是否继续？`;

        await ElMessageBox.confirm(
          confirmMessage,
          '确认导入综合数据',
          {
            confirmButtonText: '确定导入',
            cancelButtonText: '取消',
            type: 'warning',
            dangerouslyUseHTMLString: true
          }
        );

        const results = {
          users: { success: 0, error: 0 },
          riders: { success: 0, error: 0 },
          orders: { success: 0, error: 0 },
          merchants: { success: 0, error: 0 }
        };

        if (usersCount > 0 && Array.isArray(allData.users)) {
          try {
            const validation = validateDataType(allData.users, 'users');
            if (!validation.valid) {
              ElMessage.warning(`用户数据验证失败: ${validation.error}`);
            } else {
              const response = await request.post('/api/users/import', { users: allData.users });
              if (response.data.success) {
                results.users = { success: response.data.successCount || 0, error: response.data.errorCount || 0 };
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
                results.riders = { success: response.data.successCount || 0, error: response.data.errorCount || 0 };
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
                results.orders = { success: response.data.successCount || 0, error: response.data.errorCount || 0 };
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
                results.merchants = { success: response.data.successCount || 0, error: response.data.errorCount || 0 };
              }
            }
          } catch (e) {
            results.merchants.error = merchantsCount;
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

        ElMessageBox.alert(message, '导入完成', {
          confirmButtonText: '确定',
          dangerouslyUseHTMLString: true,
          type: 'success'
        });
      } else {
        ElMessage.warning('无法识别数据格式，请使用综合数据包或单独导入相应类型的数据');
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('导入失败: ' + (error?.response?.data?.error || error.message));
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
