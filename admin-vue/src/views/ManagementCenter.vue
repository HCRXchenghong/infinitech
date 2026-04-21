<template>
  <div class="management-page">
    <ManagementCenterHeader
      :loading="loading"
      :load-all="loadAll"
      :show-add-admin-dialog="showAddAdminDialog"
    />

    <PageStateAlert :message="pageError" />

    <ManagementCenterAccountsPanel
      :keyword="keyword"
      :filtered-admins="filteredAdmins"
      :loading-admins="loadingAdmins"
      :admins-error="adminsError"
      :role-label="roleLabel"
      :role-tag-type="roleTagType"
      :format-time="formatTime"
      :show-edit-admin-dialog="showEditAdminDialog"
      :handle-reset-password="handleResetPassword"
      :handle-delete-admin="handleDeleteAdmin"
      @update:keyword="handleKeywordUpdate"
    />

    <ManagementCenterAdminDialog
      ref="adminDialogRef"
      :visible="adminDialogVisible"
      :dialog-title="dialogTitle"
      :admin-form="adminForm"
      :admin-rules="adminRules"
      :editing-admin="editingAdmin"
      :role-options="roleOptions"
      :saving-admin="savingAdmin"
      :handle-save-admin="handleSaveAdmin"
      @update:visible="handleAdminDialogVisibleUpdate"
    />
  </div>
</template>

<script setup>
import './ManagementCenter.css';
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import { downloadCredentialReceipt } from '@/utils/credentialReceipt';
import PageStateAlert from '@/components/PageStateAlert.vue';
import ManagementCenterAccountsPanel from './managementCenterSections/ManagementCenterAccountsPanel.vue';
import ManagementCenterAdminDialog from './managementCenterSections/ManagementCenterAdminDialog.vue';
import ManagementCenterHeader from './managementCenterSections/ManagementCenterHeader.vue';
import { useManagementCenterPage } from './managementCenterPageHelpers';

const adminDialogRef = ref(null);

const {
  adminDialogVisible,
  adminForm,
  adminRules,
  adminsError,
  dialogTitle,
  editingAdmin,
  filteredAdmins,
  formatTime,
  handleDeleteAdmin,
  handleResetPassword,
  keyword,
  loadAll,
  loading,
  loadingAdmins,
  pageError,
  roleLabel,
  roleOptions,
  roleTagType,
  savingAdmin,
  setKeyword,
  showAddAdminDialog,
  showEditAdminDialog,
  saveAdmin,
  closeAdminDialog,
} = useManagementCenterPage({
  request,
  ElMessage,
  ElMessageBox,
  downloadCredentialReceipt,
});

function handleKeywordUpdate(value) {
  setKeyword(value);
}

async function handleSaveAdmin() {
  await saveAdmin(() => adminDialogRef.value?.validate());
}

function handleAdminDialogVisibleUpdate(value) {
  if (!value) {
    closeAdminDialog();
    return;
  }
  adminDialogVisible.value = value;
}
</script>
