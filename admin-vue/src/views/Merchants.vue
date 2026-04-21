<template>
  <div class="merchants-page">
    <MerchantsListPanel
      :loading="loading"
      :load-error="loadError"
      :merchants="merchants"
      :search-keyword="searchKeyword"
      :update-search-keyword="setSearchKeyword"
      :handle-search="handleSearch"
      :load-merchants="loadMerchants"
      :open-create-dialog="openCreateDialog"
      :open-invite-dialog="openInviteDialog"
      :go-detail="goDetail"
      :reset-password="resetPassword"
      :delete-merchant="deleteMerchant"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      :handle-page-change="handlePageChange"
      :handle-size-change="handleSizeChange"
    />

    <MerchantsCreateDialog
      :visible="createDialogVisible"
      :create-form="createForm"
      :creating="creating"
      :submit-create="submitCreate"
      @update:visible="handleCreateDialogVisibleUpdate"
    />

    <MerchantsInviteDialog
      :visible="inviteDialogVisible"
      :invite-form="inviteForm"
      :invite-result="inviteResult"
      :creating-invite="creatingInvite"
      :copy-invite-url="copyInviteUrl"
      :create-invite-link="createInviteLink"
      :format-date-time="formatDateTime"
      :get-invite-remaining-uses="getInviteRemainingUses"
      @update:visible="handleInviteDialogVisibleUpdate"
    />
  </div>
</template>

<script setup>
import './Merchants.css';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import { downloadCredentialReceipt } from '@/utils/credentialReceipt';
import MerchantsCreateDialog from './merchantsSections/MerchantsCreateDialog.vue';
import MerchantsInviteDialog from './merchantsSections/MerchantsInviteDialog.vue';
import MerchantsListPanel from './merchantsSections/MerchantsListPanel.vue';
import { useMerchantsPage } from './merchantsPageHelpers';

const router = useRouter();

const {
  copyInviteUrl,
  createDialogVisible,
  createForm,
  createInviteLink,
  creating,
  creatingInvite,
  currentPage,
  deleteMerchant,
  formatDateTime,
  getInviteRemainingUses,
  goDetail,
  handlePageChange,
  handleSearch,
  handleSizeChange,
  inviteDialogVisible,
  inviteForm,
  inviteResult,
  loadError,
  loadMerchants,
  loading,
  merchants,
  openCreateDialog,
  openInviteDialog,
  pageSize,
  resetPassword,
  searchKeyword,
  setSearchKeyword,
  submitCreate,
  total,
  closeCreateDialog,
  closeInviteDialog,
} = useMerchantsPage({
  router,
  request,
  ElMessage,
  ElMessageBox,
  downloadCredentialReceipt,
  navigatorClipboard: globalThis.navigator?.clipboard ?? null,
});

function handleCreateDialogVisibleUpdate(value) {
  if (!value) {
    closeCreateDialog();
    return;
  }
  createDialogVisible.value = value;
}

function handleInviteDialogVisibleUpdate(value) {
  if (!value) {
    closeInviteDialog();
    return;
  }
  inviteDialogVisible.value = value;
}
</script>
