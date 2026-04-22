<template>
  <div class="data-management-page">
    <DataManagementHeader :loading="loading" :refresh-all="refreshAll" />
    <DataManagementOverviewSection
      :last-checked-at="lastCheckedAt"
      :summary-cards="summaryCards"
    />
    <DataManagementBusinessSection
      :before-import="beforeImport"
      :business-cards="businessCards"
      :handle-import="handleImport"
    />
    <DataManagementConfigSection
      :before-import="beforeImport"
      :config-cards="configCards"
      :handle-config-import="handleConfigImport"
    />
    <DataManagementBundleSection
      :before-import="beforeImport"
      :export-all-data="exportAllData"
      :export-all-to-folder="exportAllToFolder"
      :exporting-all="exportingAll"
      :exporting-to-folder="exportingToFolder"
      :handle-import-all="handleImportAll"
      :importing-all="importingAll"
    />
  </div>
</template>

<script setup>
import './DataManagement.css';
import DataManagementBundleSection from './dataManagementSections/DataManagementBundleSection.vue';
import DataManagementBusinessSection from './dataManagementSections/DataManagementBusinessSection.vue';
import DataManagementConfigSection from './dataManagementSections/DataManagementConfigSection.vue';
import DataManagementHeader from './dataManagementSections/DataManagementHeader.vue';
import DataManagementOverviewSection from './dataManagementSections/DataManagementOverviewSection.vue';
import { useDataManagementPage } from './dataManagementPageHelpers';

const {
  businessCards,
  configCards,
  loading,
  summaryCards,
  lastCheckedAt,
  exportingAll,
  exportingToFolder,
  importingAll,
  refreshAll,
  beforeImport,
  handleImport,
  handleConfigImport,
  exportAllToFolder,
  exportAllData,
  handleImportAll,
} = useDataManagementPage();
</script>
