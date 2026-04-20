import { computed } from 'vue';
import { useDataManagementPage } from '../dataManagementHelpers';

export function useSettingsDataManagement() {
  const dataManagement = useDataManagementPage();
  const {
    exporting,
    importing,
    exportingRiders,
    importingRiders,
    exportingOrders,
    importingOrders,
    exportingMerchants,
    importingMerchants,
    exportingAll,
    importingAll,
    exportUsers,
    beforeImport,
    handleImport: handleImportByType,
    exportRiders,
    exportOrders,
    exportMerchants,
    exportAllData,
    handleImportAll,
    validateDataType,
  } = dataManagement;

  async function handleImport(options) {
    return handleImportByType(options, 'users');
  }

  async function handleImportRiders(options) {
    return handleImportByType(options, 'riders');
  }

  async function handleImportOrders(options) {
    return handleImportByType(options, 'orders');
  }

  async function handleImportMerchants(options) {
    return handleImportByType(options, 'merchants');
  }

  async function handleImportAllData(options) {
    return handleImportAll(options);
  }

  const dataMgmtItems = computed(() => [
    { label: '用户数据', exporting: exporting.value, importing: importing.value, onExport: exportUsers, onImport: handleImport },
    { label: '骑手数据', exporting: exportingRiders.value, importing: importingRiders.value, onExport: exportRiders, onImport: handleImportRiders },
    { label: '订单数据', exporting: exportingOrders.value, importing: importingOrders.value, onExport: exportOrders, onImport: handleImportOrders },
    { label: '商户数据', exporting: exportingMerchants.value, importing: importingMerchants.value, onExport: exportMerchants, onImport: handleImportMerchants },
    { label: '平台备份', exporting: exportingAll.value, importing: importingAll.value, onExport: exportAllData, onImport: handleImportAllData },
  ]);

  return {
    exporting,
    importing,
    exportingRiders,
    importingRiders,
    exportingOrders,
    importingOrders,
    exportingMerchants,
    importingMerchants,
    exportingAll,
    importingAll,
    dataMgmtItems,
    exportUsers,
    beforeImport,
    handleImport,
    exportRiders,
    handleImportRiders,
    validateDataType,
    exportOrders,
    handleImportOrders,
    exportMerchants,
    handleImportMerchants,
    exportAllData,
    handleImportAllData,
  };
}
