import { computed, onMounted, ref } from 'vue';
import {
  appendAdminUploadDomain,
  buildAdminShopBasicPayload,
  buildAdminShopImagePayload,
  buildAdminShopMenuPayload,
  buildAdminShopReviewPayload,
  buildAdminShopStaffPayload,
  buildAdminShopTagPayload,
  createAdminShopBasicFormState,
  createAdminShopImageFormState,
  createAdminShopMenuFormState,
  createAdminShopReviewFormState,
  createAdminShopReviewListParams,
  createAdminShopStaffFormState,
  createAdminShopTagFormState,
  createEmptyAdminShopReviewForm,
  extractShopReviewPage,
  formatAdminShopAge,
  formatAdminShopDate,
  formatAdminShopDateTime,
  getAdminFoodBusinessLicense,
  getAdminMerchantQualification,
  hasAdminShopStaffRecord,
  normalizeAdminShopDetail,
  normalizeAdminShopReview,
  normalizeAdminShopTextList,
  validateAdminShopReviewForm,
  validateAdminShopStaffForm,
} from '@infinitech/admin-core';
import {
  extractEnvelopeData,
  extractErrorMessage,
  resolveUploadAssetUrl,
  UPLOAD_DOMAINS,
} from '@infinitech/contracts';
import {
  buildBusinessCategoryOptions,
  buildMerchantTypeOptions,
  loadMerchantTaxonomySettings,
  resolveBusinessCategoryOption,
  resolveMerchantTypeOption,
} from '@/utils/platform-settings';

export function useShopManageDetailPage({
  route,
  router,
  request,
  ElMessage,
  ElMessageBox,
}) {
  const merchantId = String(route.params.merchantId || '').trim();
  const shopId = String(route.params.shopId || '').trim();

  const loading = ref(false);
  const saving = ref(false);
  const shopError = ref('');
  const reviewError = ref('');
  const pageError = computed(() => reviewError.value || shopError.value || '');
  const shop = ref({});

  const reviewsLoading = ref(false);
  const reviewSaving = ref(false);
  const reviews = ref([]);
  const reviewDialogVisible = ref(false);
  const reviewEditingId = ref('');
  const uploadingReviewImage = ref(false);

  const basicDialogVisible = ref(false);
  const imageDialogVisible = ref(false);
  const tagDialogVisible = ref(false);
  const menuDialogVisible = ref(false);
  const staffDialogVisible = ref(false);
  const merchantTaxonomySettings = ref(null);
  const merchantTypeOptions = ref(buildMerchantTypeOptions());
  const businessCategoryOptions = ref(buildBusinessCategoryOptions());

  const basicForm = ref(createAdminShopBasicFormState());
  const imageForm = ref(createAdminShopImageFormState());
  const tagForm = ref(createAdminShopTagFormState());
  const menuForm = ref(createAdminShopMenuFormState());
  const staffForm = ref(createAdminShopStaffFormState());
  const reviewForm = ref(createEmptyAdminShopReviewForm());

  const tagList = computed(() => normalizeAdminShopTextList(shop.value.tags));
  const discountList = computed(() => normalizeAdminShopTextList(shop.value.discounts));
  const hasStaffRecord = computed(() => hasAdminShopStaffRecord(shop.value));
  const merchantQualificationImage = computed(() => getAdminMerchantQualification(shop.value));
  const foodBusinessLicenseImage = computed(() => getAdminFoodBusinessLicense(shop.value));

  onMounted(async () => {
    await loadTaxonomySettings();
    await Promise.all([loadShop(), loadReviews()]);
  });

  async function loadTaxonomySettings(forceRefresh = false) {
    const settings = await loadMerchantTaxonomySettings(forceRefresh);
    merchantTaxonomySettings.value = settings;
    merchantTypeOptions.value = buildMerchantTypeOptions(settings);
    businessCategoryOptions.value = buildBusinessCategoryOptions(settings);
  }

  function applyBasicBusinessCategorySelection(value) {
    const selected = resolveBusinessCategoryOption(value, merchantTaxonomySettings.value);
    basicForm.value.businessCategoryKey = selected.key;
    basicForm.value.businessCategory = selected.label;
  }

  function handleBasicBusinessCategoryChange(value) {
    applyBasicBusinessCategorySelection(value);
  }

  function goBackMerchant() {
    router.push(`/merchants/${merchantId}`);
  }

  function goToMenuManage() {
    router.push(`/merchants/${merchantId}/shops/${shopId}/menu`);
  }

  async function loadShop() {
    shopError.value = '';
    loading.value = true;
    try {
      let current = null;
      try {
        const shopsRes = await request.get(`/api/merchants/${merchantId}/shops`);
        const shopsPayload = extractEnvelopeData(shopsRes?.data);
        const list = Array.isArray(shopsPayload?.shops) ? shopsPayload.shops : [];
        current = list.find((item) => String(item.id || '') === shopId) || null;
      } catch (_error) {
        current = null;
      }

      if (!current) {
        const { data } = await request.get(`/api/shops/${shopId}`);
        current = extractEnvelopeData(data) || null;
      }

      if (!current) {
        ElMessage.warning('未找到该店铺');
        return;
      }

      shop.value = normalizeAdminShopDetail(current);
    } catch (error) {
      shopError.value = extractErrorMessage(error, '加载店铺详情失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function loadReviews() {
    reviewError.value = '';
    reviewsLoading.value = true;
    try {
      const { data } = await request.get(`/api/shops/${shopId}/reviews`, {
        params: createAdminShopReviewListParams(),
      });
      const reviewPage = extractShopReviewPage(data);
      reviews.value = reviewPage.items.map((item) => normalizeAdminShopReview(item, shopId));
    } catch (error) {
      reviews.value = [];
      reviewError.value = extractErrorMessage(error, '加载评论失败，请稍后重试');
    } finally {
      reviewsLoading.value = false;
    }
  }

  function openBasicDialog() {
    const merchantTypeOption = resolveMerchantTypeOption(
      shop.value.merchantType || shop.value.orderType,
      merchantTaxonomySettings.value,
    );
    const businessCategoryOption = resolveBusinessCategoryOption(
      shop.value.businessCategoryKey
        || shop.value.business_category_key
        || shop.value.businessCategory
        || shop.value.category,
      merchantTaxonomySettings.value,
    );
    basicForm.value = createAdminShopBasicFormState(shop.value, {
      merchantTypeOption,
      businessCategoryOption,
    });
    basicDialogVisible.value = true;
  }

  function openImageDialog() {
    imageForm.value = createAdminShopImageFormState(shop.value);
    imageDialogVisible.value = true;
  }

  function openTagDialog() {
    tagForm.value = createAdminShopTagFormState(shop.value);
    tagDialogVisible.value = true;
  }

  function openMenuDialog() {
    menuForm.value = createAdminShopMenuFormState(shop.value);
    menuDialogVisible.value = true;
  }

  function openStaffDialog() {
    staffForm.value = createAdminShopStaffFormState(shop.value);
    staffDialogVisible.value = true;
  }

  function openCreateReviewDialog() {
    reviewEditingId.value = '';
    reviewForm.value = createEmptyAdminShopReviewForm();
    reviewDialogVisible.value = true;
  }

  function openEditReviewDialog(row) {
    reviewEditingId.value = String(row.id || '');
    reviewForm.value = createAdminShopReviewFormState(row);
    reviewDialogVisible.value = true;
  }

  async function handleReviewImageChange(uploadFile) {
    const raw = uploadFile?.raw;
    if (!raw) {
      return;
    }
    if (!raw.type?.startsWith('image/')) {
      ElMessage.warning('请上传图片格式文件');
      return;
    }

    uploadingReviewImage.value = true;
    try {
      const formData = new FormData();
      formData.append('file', raw);
      appendAdminUploadDomain(formData, UPLOAD_DOMAINS.REVIEW_MEDIA);
      const { data } = await request.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const nextUrl = String(resolveUploadAssetUrl(data) || '').trim();
      if (!nextUrl) {
        throw new Error('上传返回地址为空');
      }
      if (!Array.isArray(reviewForm.value.images)) {
        reviewForm.value.images = [];
      }
      reviewForm.value.images = [...reviewForm.value.images, nextUrl];
      ElMessage.success('评论图片上传成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '评论图片上传失败'));
    } finally {
      uploadingReviewImage.value = false;
    }
  }

  function removeReviewImage(index) {
    const list = Array.isArray(reviewForm.value.images) ? [...reviewForm.value.images] : [];
    if (index < 0 || index >= list.length) {
      return;
    }
    list.splice(index, 1);
    reviewForm.value.images = list;
  }

  async function saveReview() {
    const validation = validateAdminShopReviewForm(reviewForm.value);
    if (!validation.valid) {
      ElMessage.warning(validation.message);
      return;
    }

    const payload = buildAdminShopReviewPayload(reviewForm.value, shopId);

    reviewSaving.value = true;
    try {
      if (reviewEditingId.value) {
        await request.put(`/api/reviews/${reviewEditingId.value}`, payload);
        ElMessage.success('评论更新成功');
      } else {
        await request.post('/api/reviews', payload);
        ElMessage.success('评论新增成功');
      }

      reviewDialogVisible.value = false;
      await Promise.all([loadReviews(), loadShop()]);
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存评论失败'));
    } finally {
      reviewSaving.value = false;
    }
  }

  async function handleDeleteReview(row) {
    try {
      await ElMessageBox.confirm('确认删除这条评论吗？删除后不可恢复。', '删除评论', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      });

      await request.delete(`/api/reviews/${row.id}`);
      ElMessage.success('评论已删除');
      await Promise.all([loadReviews(), loadShop()]);
    } catch (error) {
      if (error === 'cancel' || error === 'close') {
        return;
      }
      ElMessage.error(extractErrorMessage(error, '删除评论失败'));
    }
  }

  async function updateShop(payload, options = {}) {
    const { showSuccess = true } = options;
    saving.value = true;
    try {
      await request.put(`/api/shops/${shopId}`, payload);
      await loadShop();
      if (showSuccess) {
        ElMessage.success('保存成功');
      }
      return true;
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存失败'));
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function saveBasicInfo() {
    const merchantTypeOption = resolveMerchantTypeOption(
      basicForm.value.merchantType || basicForm.value.orderType,
      merchantTaxonomySettings.value,
    );
    const businessCategoryOption = resolveBusinessCategoryOption(
      basicForm.value.businessCategoryKey || basicForm.value.businessCategory,
      merchantTaxonomySettings.value,
    );
    const payload = buildAdminShopBasicPayload(basicForm.value, {
      merchantTypeOption,
      businessCategoryOption,
    });
    if (!payload.name) {
      ElMessage.warning('店铺名称不能为空');
      return;
    }
    const ok = await updateShop(payload);
    if (ok) {
      basicDialogVisible.value = false;
    }
  }

  async function saveImageInfo() {
    const ok = await updateShop(buildAdminShopImagePayload(imageForm.value));
    if (ok) {
      imageDialogVisible.value = false;
    }
  }

  async function saveTagInfo() {
    const ok = await updateShop(buildAdminShopTagPayload(tagForm.value));
    if (ok) {
      tagDialogVisible.value = false;
    }
  }

  async function saveMenuInfo() {
    const ok = await updateShop(buildAdminShopMenuPayload(menuForm.value));
    if (ok) {
      menuDialogVisible.value = false;
    }
  }

  async function saveStaffInfo() {
    const validation = validateAdminShopStaffForm(staffForm.value);
    if (!validation.valid) {
      ElMessage.warning(validation.message);
      return;
    }

    const ok = await updateShop(buildAdminShopStaffPayload(staffForm.value));
    if (ok) {
      staffDialogVisible.value = false;
    }
  }

  return {
    basicDialogVisible,
    basicForm,
    businessCategoryOptions,
    discountList,
    foodBusinessLicenseImage,
    formatAge: formatAdminShopAge,
    formatDate: formatAdminShopDate,
    formatDateTime: formatAdminShopDateTime,
    goBackMerchant,
    goToMenuManage,
    handleBasicBusinessCategoryChange,
    handleDeleteReview,
    handleReviewImageChange,
    hasStaffRecord,
    imageDialogVisible,
    imageForm,
    loading,
    menuDialogVisible,
    menuForm,
    merchantId,
    merchantQualificationImage,
    merchantTypeOptions,
    openBasicDialog,
    openCreateReviewDialog,
    openEditReviewDialog,
    openImageDialog,
    openMenuDialog,
    openStaffDialog,
    openTagDialog,
    pageError,
    reviewDialogVisible,
    reviewEditingId,
    reviewError,
    reviewForm,
    reviews,
    reviewsLoading,
    reviewSaving,
    removeReviewImage,
    saveBasicInfo,
    saveImageInfo,
    saveMenuInfo,
    saveReview,
    saveStaffInfo,
    saveTagInfo,
    saving,
    shop,
    staffDialogVisible,
    staffForm,
    tagDialogVisible,
    tagForm,
    tagList,
    uploadingReviewImage,
  };
}
