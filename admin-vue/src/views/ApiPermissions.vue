<template>
  <div class="api-permissions-page">
    <ApiPermissionsHeader
      :api-list-loading="apiListLoading"
      :go-to-documentation="goToDocumentation"
      :load-api-list="loadApiList"
      :show-add-api-dialog="showAddApiDialog"
    />

    <PageStateAlert :message="apiListError" />

    <ApiPermissionsSummaryCards :summary="summary" />

    <div class="content-grid">
      <ApiPermissionsManagementSection
        :api-list="apiList"
        :api-list-error="apiListError"
        :api-list-loading="apiListLoading"
        :copy-api-key="copyApiKey"
        :delete-api="deleteApi"
        :download-key-doc="downloadKeyDoc"
        :edit-api="editApi"
        :get-permission-label="getPermissionLabel"
        :is-mobile="isMobile"
        :normalize-public-api-permission-list="normalizePublicApiPermissionList"
      />

      <ApiPermissionsGuideSection
        :go-to-documentation="goToDocumentation"
        :permission-catalog="permissionCatalog"
      />
    </div>

    <ApiPermissionsDialog
      :api-form="apiForm"
      :editing-api="editingApi"
      :generate-api-key="generateApiKey"
      :handle-api-permission-change="handleApiPermissionChange"
      :is-mobile="isMobile"
      :permission-options="permissionOptions"
      :save-api="saveApi"
      :saving-api="savingApi"
      :set-api-dialog-visible="setApiDialogVisible"
      :visible="apiDialogVisible"
    />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import PageStateAlert from '@/components/PageStateAlert.vue';
import request from '@/utils/request';
import './ApiPermissions.css';
import { useApiPermissionsPage } from './apiPermissionsPageHelpers';
import ApiPermissionsDialog from './apiPermissionsSections/ApiPermissionsDialog.vue';
import ApiPermissionsGuideSection from './apiPermissionsSections/ApiPermissionsGuideSection.vue';
import ApiPermissionsHeader from './apiPermissionsSections/ApiPermissionsHeader.vue';
import ApiPermissionsManagementSection from './apiPermissionsSections/ApiPermissionsManagementSection.vue';
import ApiPermissionsSummaryCards from './apiPermissionsSections/ApiPermissionsSummaryCards.vue';

const router = useRouter();
const {
  apiDialogVisible,
  apiForm,
  copyApiKey,
  deleteApi,
  getPermissionLabel,
  editingApi,
  generateApiKey,
  goToDocumentation,
  handleApiPermissionChange,
  isMobile,
  loadApiList,
  apiList,
  apiListError,
  apiListLoading,
  downloadKeyDoc,
  editApi,
  normalizePublicApiPermissionList,
  permissionCatalog,
  permissionOptions,
  saveApi,
  savingApi,
  setApiDialogVisible,
  showAddApiDialog,
  summary,
} = useApiPermissionsPage({
  router,
  request,
  ElMessage,
  ElMessageBox,
});
</script>
