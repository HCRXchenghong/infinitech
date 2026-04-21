import { computed, onMounted, ref } from 'vue';
import {
  appendAdminUploadDomain,
  buildAdminMerchantShopCreatePayload,
  createAdminMerchantEditFormState,
  createAdminMerchantShopDraft,
  extractMerchantShopPage,
  formatAdminMerchantOnboardingSource as formatOnboardingSource,
  formatAdminMerchantOnboardingType as formatOnboardingType,
  normalizeAdminMerchantProfile,
  normalizeAdminMerchantShopSummary,
  validateAdminMerchantLicenseFile,
  validateAdminMerchantUpdateForm,
} from '@infinitech/admin-core';
import {
  extractEnvelopeData,
  extractErrorMessage,
  resolveUploadAssetUrl,
  UPLOAD_DOMAINS,
} from '@infinitech/contracts';

export function useMerchantProfilePage({ route, router, request, ElMessage, ElMessageBox }) {
  const merchantId = String(route.params.id || '').trim();

  const loading = ref(false);
  const merchantError = ref('');
  const shopsError = ref('');
  const pageError = computed(() => shopsError.value || merchantError.value || '');
  const shops = ref([]);
  const merchant = ref(normalizeAdminMerchantProfile({ id: merchantId }));

  const merchantEditVisible = ref(false);
  const savingMerchant = ref(false);
  const uploadingBusinessLicense = ref(false);
  const merchantForm = ref(createAdminMerchantEditFormState());
  const shopDialogVisible = ref(false);
  const shopDialogTitle = ref('新增店铺');
  const currentShop = ref(null);

  function goBack() {
    router.push('/merchants');
  }

  async function loadMerchant() {
    merchantError.value = '';
    loading.value = true;

    try {
      const { data } = await request.get(`/api/merchant/${merchantId}`);
      const payload = extractEnvelopeData(data) || {};
      merchant.value = normalizeAdminMerchantProfile(payload);
    } catch (error) {
      merchantError.value = extractErrorMessage(error, '加载商户信息失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function loadShops() {
    shopsError.value = '';
    try {
      const { data } = await request.get(`/api/merchants/${merchantId}/shops`);
      const shopPage = extractMerchantShopPage(data);
      shops.value = shopPage.items.map((item) => normalizeAdminMerchantShopSummary(item));
    } catch (error) {
      shops.value = [];
      shopsError.value = extractErrorMessage(error, '加载店铺信息失败，请稍后重试');
    }
  }

  function openMerchantEdit() {
    merchantForm.value = createAdminMerchantEditFormState(merchant.value);
    merchantEditVisible.value = true;
  }

  function closeMerchantEdit() {
    merchantEditVisible.value = false;
    merchantForm.value = createAdminMerchantEditFormState(merchant.value);
  }

  async function handleBusinessLicenseChange(uploadFile) {
    const raw = uploadFile?.raw;
    if (!raw) {
      return;
    }

    const validation = validateAdminMerchantLicenseFile(raw);
    if (!validation.valid) {
      ElMessage.warning(validation.message);
      return;
    }

    uploadingBusinessLicense.value = true;
    try {
      const formData = new FormData();
      formData.append('file', raw);
      appendAdminUploadDomain(formData, UPLOAD_DOMAINS.MERCHANT_DOCUMENT);
      const { data } = await request.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const nextUrl = String(resolveUploadAssetUrl(data) || '').trim();
      if (!nextUrl) {
        throw new Error('上传返回地址为空');
      }
      merchantForm.value.business_license_image = nextUrl;
      ElMessage.success('营业执照上传成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '营业执照上传失败'));
    } finally {
      uploadingBusinessLicense.value = false;
    }
  }

  async function saveMerchant() {
    const validation = validateAdminMerchantUpdateForm(merchantForm.value);
    if (!validation.valid) {
      ElMessage.warning(validation.message);
      return;
    }

    savingMerchant.value = true;
    try {
      await request.put(`/api/merchants/${merchantId}`, validation.normalized);
      ElMessage.success('商户信息已保存');
      closeMerchantEdit();
      await loadMerchant();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存失败'));
    } finally {
      savingMerchant.value = false;
    }
  }

  function addShop() {
    shopDialogTitle.value = '新增店铺';
    currentShop.value = createAdminMerchantShopDraft();
    shopDialogVisible.value = true;
  }

  function closeShopDialog() {
    shopDialogVisible.value = false;
    currentShop.value = null;
  }

  async function handleShopSave(shopData) {
    shopsError.value = '';
    try {
      const payload = buildAdminMerchantShopCreatePayload(
        shopData,
        merchant.value.id || merchantId,
      );
      await request.post('/api/shops', payload);
      ElMessage.success('新增店铺成功');
      closeShopDialog();
      await loadShops();
    } catch (error) {
      const message = extractErrorMessage(error, '保存店铺失败，请稍后重试');
      shopsError.value = message;
      ElMessage.error(message);
    }
  }

  function goShopDetail(shop) {
    router.push(`/merchants/${merchantId}/shops/${shop.id}`);
  }

  async function deleteShop(shop) {
    try {
      await ElMessageBox.confirm(
        `确认删除店铺“${shop.name}”？删除后不可恢复。`,
        '删除店铺',
        {
          type: 'warning',
          confirmButtonText: '确定',
          cancelButtonText: '取消',
        },
      );
      await request.delete(`/api/shops/${shop.id}`);
      ElMessage.success('删除成功');
      await loadShops();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(extractErrorMessage(error, '删除店铺失败'));
      }
    }
  }

  onMounted(async () => {
    await loadMerchant();
    await loadShops();
  });

  return {
    addShop,
    closeMerchantEdit,
    closeShopDialog,
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
    uploadingBusinessLicense,
  };
}
