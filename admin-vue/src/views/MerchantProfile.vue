<template>
  <div class="merchant-profile-page" v-loading="loading">
    <MerchantProfileHeader
      :merchant="merchant"
      :go-back="goBack"
      :open-merchant-edit="openMerchantEdit"
    />
    <PageStateAlert :message="pageError" />

    <MerchantProfileSummaryPanel
      :merchant="merchant"
      :shops="shops"
    />

    <MerchantProfileOnboardingPanel
      :merchant="merchant"
      :format-onboarding-source="formatOnboardingSource"
      :format-onboarding-type="formatOnboardingType"
    />

    <MerchantProfileShopsPanel
      :shops="shops"
      :shops-error="shopsError"
      :load-shops="loadShops"
      :add-shop="addShop"
      :go-shop-detail="goShopDetail"
      :delete-shop="deleteShop"
    />

    <MerchantProfileEditDialog
      :visible="merchantEditVisible"
      :merchant-form="merchantForm"
      :saving-merchant="savingMerchant"
      :uploading-business-license="uploadingBusinessLicense"
      :handle-business-license-change="handleBusinessLicenseChange"
      :save-merchant="saveMerchant"
      @update:visible="handleMerchantEditVisibleUpdate"
    />

    <MerchantProfileShopDialog
      :visible="shopDialogVisible"
      :shop-dialog-title="shopDialogTitle"
      :current-shop="currentShop"
      :merchant-id="merchant.id || merchantId"
      :handle-shop-save="handleShopSave"
      @update:visible="handleShopDialogVisibleUpdate"
    />
  </div>
</template>

<script setup>
import './MerchantProfile.css';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';
import MerchantProfileEditDialog from './merchantProfileSections/MerchantProfileEditDialog.vue';
import MerchantProfileHeader from './merchantProfileSections/MerchantProfileHeader.vue';
import MerchantProfileOnboardingPanel from './merchantProfileSections/MerchantProfileOnboardingPanel.vue';
import MerchantProfileShopDialog from './merchantProfileSections/MerchantProfileShopDialog.vue';
import MerchantProfileShopsPanel from './merchantProfileSections/MerchantProfileShopsPanel.vue';
import MerchantProfileSummaryPanel from './merchantProfileSections/MerchantProfileSummaryPanel.vue';
import { useMerchantProfilePage } from './merchantProfilePageHelpers';

const route = useRoute();
const router = useRouter();

const {
  addShop,
  currentShop,
  deleteShop,
  formatOnboardingSource,
  formatOnboardingType,
  goBack,
  goShopDetail,
  handleBusinessLicenseChange,
  handleShopSave,
  loadShops,
  loading,
  merchant,
  merchantEditVisible,
  merchantForm,
  merchantId,
  openMerchantEdit,
  pageError,
  saveMerchant,
  savingMerchant,
  shopDialogTitle,
  shopDialogVisible,
  shops,
  shopsError,
  closeMerchantEdit,
  closeShopDialog,
  uploadingBusinessLicense,
} = useMerchantProfilePage({
  route,
  router,
  request,
  ElMessage,
  ElMessageBox,
});

function handleMerchantEditVisibleUpdate(value) {
  if (!value) {
    closeMerchantEdit();
    return;
  }
  merchantEditVisible.value = value;
}

function handleShopDialogVisibleUpdate(value) {
  if (!value) {
    closeShopDialog();
    return;
  }
  shopDialogVisible.value = value;
}
</script>
