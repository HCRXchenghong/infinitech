<template src="./ShopManageDetail.template.html"></template>
<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractShopReviewPage } from '@infinitech/admin-core';
import { extractEnvelopeData, extractErrorMessage, extractUploadAsset } from '@infinitech/contracts';
import request from '@/utils/request';
import ImageUpload from '@/components/ImageUpload.vue';
import PageStateAlert from '@/components/PageStateAlert.vue';
import {
  buildBusinessCategoryOptions,
  buildMerchantTypeOptions,
  loadMerchantTaxonomySettings,
  resolveBusinessCategoryOption,
  resolveMerchantTypeOption
} from '@/utils/platform-settings';
import {
  toArray,
  commaTextToArray,
  parseImages,
  getMerchantQualification,
  getFoodBusinessLicense,
  normalizeReview,
  formatDateTime,
  normalizeDateValue,
  formatAge,
  buildEmptyReviewForm
} from './shopManageDetailHelpers';

const route = useRoute();
const router = useRouter();

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

const basicForm = ref({});
const imageForm = ref({});
const tagForm = ref({
  tagsText: '',
  discountsText: ''
});
const menuForm = ref({
  menuNotes: ''
});
const staffForm = ref({
  employeeName: '',
  employeeAge: 0,
  employeePosition: '',
  idCardFrontImage: '',
  idCardBackImage: '',
  idCardExpireAt: '',
  healthCertFrontImage: '',
  healthCertBackImage: '',
  healthCertExpireAt: '',
  employmentStartAt: '',
  employmentEndAt: ''
});

const reviewForm = ref({
  userId: '',
  orderId: '',
  userName: '',
  userAvatar: '',
  rating: 5,
  content: '',
  images: [],
  reply: ''
});

const tagList = computed(() => toArray(shop.value.tags));
const discountList = computed(() => toArray(shop.value.discounts));
const hasStaffRecord = computed(() => {
  const data = shop.value || {};
  return Boolean(
    data.employeeName
      || Number(data.employeeAge || 0) > 0
      || data.employeePosition
      || data.idCardFrontImage
      || data.idCardBackImage
      || data.idCardExpireAt
      || data.healthCertFrontImage
      || data.healthCertBackImage
      || data.healthCertExpireAt
      || data.employmentStartAt
      || data.employmentEndAt
  );
});
const merchantQualificationImage = computed(() => getMerchantQualification(shop.value));
const foodBusinessLicenseImage = computed(() => getFoodBusinessLicense(shop.value));

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
    } catch (error) {
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

    const merchantQualification = getMerchantQualification(current);
    const foodBusinessLicense = getFoodBusinessLicense(current);
    shop.value = {
      ...current,
      isActive: current.isActive === true || current.isActive === 1,
      isTodayRecommended: current.isTodayRecommended === true || current.isTodayRecommended === 1,
      todayRecommendPosition: Number(current.todayRecommendPosition || 0),
      merchantQualification,
      foodBusinessLicense
    };
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
      params: {
        page: 1,
        pageSize: 200
      }
    });
    const reviewPage = extractShopReviewPage(data);
    reviews.value = reviewPage.items.map((item) => normalizeReview(item, shopId));
  } catch (error) {
    reviews.value = [];
    reviewError.value = extractErrorMessage(error, '加载评论失败，请稍后重试');
  } finally {
    reviewsLoading.value = false;
  }
}

function openBasicDialog() {
  const merchantTypeOption = resolveMerchantTypeOption(shop.value.merchantType || shop.value.orderType, merchantTaxonomySettings.value);
  const businessCategoryOption = resolveBusinessCategoryOption(
    shop.value.businessCategoryKey || shop.value.business_category_key || shop.value.businessCategory || shop.value.category,
    merchantTaxonomySettings.value
  );
  basicForm.value = {
    name: shop.value.name || '',
    phone: shop.value.phone || '',
    orderType: shop.value.orderType || merchantTypeOption.legacyOrderTypeLabel || '外卖类',
    merchantType: merchantTypeOption.key || 'takeout',
    businessCategoryKey: businessCategoryOption.key || 'food',
    businessCategory: businessCategoryOption.label || '美食',
    rating: Number(shop.value.rating || 0),
    monthlySales: Number(shop.value.monthlySales || 0),
    businessHours: shop.value.businessHours || '',
    address: shop.value.address || '',
    announcement: shop.value.announcement || '',
    isActive: shop.value.isActive === true || shop.value.isActive === 1,
    isTodayRecommended: shop.value.isTodayRecommended === true || shop.value.isTodayRecommended === 1,
    todayRecommendPosition: Number(shop.value.todayRecommendPosition || 1),
    merchantQualification: getMerchantQualification(shop.value),
    foodBusinessLicense: getFoodBusinessLicense(shop.value)
  };
  basicDialogVisible.value = true;
}

function openImageDialog() {
  imageForm.value = {
    logo: shop.value.logo || '',
    coverImage: shop.value.coverImage || '',
    backgroundImage: shop.value.backgroundImage || ''
  };
  imageDialogVisible.value = true;
}

function openTagDialog() {
  tagForm.value = {
    tagsText: tagList.value.join(','),
    discountsText: discountList.value.join(',')
  };
  tagDialogVisible.value = true;
}

function openMenuDialog() {
  menuForm.value = {
    menuNotes: shop.value.menuNotes || ''
  };
  menuDialogVisible.value = true;
}

function openStaffDialog() {
  staffForm.value = {
    employeeName: shop.value.employeeName || '',
    employeeAge: Number(shop.value.employeeAge || 0),
    employeePosition: shop.value.employeePosition || '',
    idCardFrontImage: shop.value.idCardFrontImage || '',
    idCardBackImage: shop.value.idCardBackImage || '',
    idCardExpireAt: normalizeDateValue(shop.value.idCardExpireAt),
    healthCertFrontImage: shop.value.healthCertFrontImage || '',
    healthCertBackImage: shop.value.healthCertBackImage || '',
    healthCertExpireAt: normalizeDateValue(shop.value.healthCertExpireAt),
    employmentStartAt: normalizeDateValue(shop.value.employmentStartAt),
    employmentEndAt: normalizeDateValue(shop.value.employmentEndAt)
  };
  staffDialogVisible.value = true;
}

function openCreateReviewDialog() {
  reviewEditingId.value = '';
  reviewForm.value = buildEmptyReviewForm();
  reviewDialogVisible.value = true;
}

function openEditReviewDialog(row) {
  reviewEditingId.value = String(row.id || '');
  reviewForm.value = {
    userId: String(row.userId || ''),
    orderId: String(row.orderId || ''),
    userName: row.userName || '',
    userAvatar: row.userAvatar || '',
    rating: Number(row.rating || 5),
    content: row.content || '',
    images: parseImages(row.images),
    reply: row.reply || ''
  };
  reviewDialogVisible.value = true;
}

async function handleReviewImageChange(uploadFile) {
  const raw = uploadFile?.raw;
  if (!raw) return;
  if (!raw.type?.startsWith('image/')) {
    ElMessage.warning('请上传图片格式文件');
    return;
  }

  uploadingReviewImage.value = true;
  try {
    const formData = new FormData();
    formData.append('file', raw);
    const { data } = await request.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const asset = extractUploadAsset(data);
    const nextUrl = asset?.url || '';
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
  if (index < 0 || index >= list.length) return;
  list.splice(index, 1);
  reviewForm.value.images = list;
}

async function saveReview() {
  if (!reviewForm.value.content || !reviewForm.value.content.trim()) {
    ElMessage.warning('评论内容不能为空');
    return;
  }
  const rating = Number(reviewForm.value.rating || 0);
  if (rating <= 0 || rating > 5) {
    ElMessage.warning('评分范围必须在 1 - 5 之间');
    return;
  }

  const payload = {
    shopId,
    userId: String(reviewForm.value.userId || '').trim(),
    orderId: String(reviewForm.value.orderId || '').trim(),
    userName: reviewForm.value.userName || '匿名用户',
    userAvatar: reviewForm.value.userAvatar || '',
    rating,
    content: reviewForm.value.content,
    images: Array.isArray(reviewForm.value.images) ? reviewForm.value.images : [],
    reply: reviewForm.value.reply || ''
  };

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
    console.error('保存评论失败:', error);
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
      cancelButtonText: '取消'
    });

    await request.delete(`/api/reviews/${row.id}`);
    ElMessage.success('评论已删除');
    await Promise.all([loadReviews(), loadShop()]);
  } catch (error) {
    if (error === 'cancel' || error === 'close') return;
    console.error('删除评论失败:', error);
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
    console.error('更新店铺失败:', error);
    ElMessage.error(extractErrorMessage(error, '保存失败'));
    return false;
  } finally {
    saving.value = false;
  }
}

async function saveBasicInfo() {
  if (!basicForm.value.name) {
    ElMessage.warning('店铺名称不能为空');
    return;
  }
  const merchantTypeOption = resolveMerchantTypeOption(
    basicForm.value.merchantType || basicForm.value.orderType,
    merchantTaxonomySettings.value
  );
  const businessCategoryOption = resolveBusinessCategoryOption(
    basicForm.value.businessCategoryKey || basicForm.value.businessCategory,
    merchantTaxonomySettings.value
  );
  const ok = await updateShop({
    ...basicForm.value,
    orderType: merchantTypeOption.legacyOrderTypeLabel,
    merchantType: merchantTypeOption.key,
    businessCategoryKey: businessCategoryOption.key,
    businessCategory: businessCategoryOption.label
  });
  if (ok) {
    basicDialogVisible.value = false;
  }
}

async function saveImageInfo() {
  const ok = await updateShop(imageForm.value);
  if (ok) {
    imageDialogVisible.value = false;
  }
}

async function saveTagInfo() {
  const payload = {
    tags: commaTextToArray(tagForm.value.tagsText),
    discounts: commaTextToArray(tagForm.value.discountsText)
  };
  const ok = await updateShop(payload);
  if (ok) {
    tagDialogVisible.value = false;
  }
}

async function saveMenuInfo() {
  const ok = await updateShop({
    menuNotes: menuForm.value.menuNotes || ''
  });
  if (ok) {
    menuDialogVisible.value = false;
  }
}

async function saveStaffInfo() {
  if (!staffForm.value.employeeName || !staffForm.value.employeeName.trim()) {
    ElMessage.warning('请填写员工姓名');
    return;
  }

  const age = Number(staffForm.value.employeeAge || 0);
  if (age < 0) {
    ElMessage.warning('年龄不能小于 0');
    return;
  }
  if (
    staffForm.value.employmentStartAt
      && staffForm.value.employmentEndAt
      && staffForm.value.employmentStartAt > staffForm.value.employmentEndAt
  ) {
    ElMessage.warning('离职时间不能早于入职时间');
    return;
  }

  const payload = {
    employeeName: (staffForm.value.employeeName || '').trim(),
    employeeAge: Math.floor(age),
    employeePosition: (staffForm.value.employeePosition || '').trim(),
    idCardFrontImage: staffForm.value.idCardFrontImage || '',
    idCardBackImage: staffForm.value.idCardBackImage || '',
    idCardExpireAt: staffForm.value.idCardExpireAt || null,
    healthCertFrontImage: staffForm.value.healthCertFrontImage || '',
    healthCertBackImage: staffForm.value.healthCertBackImage || '',
    healthCertExpireAt: staffForm.value.healthCertExpireAt || null,
    employmentStartAt: staffForm.value.employmentStartAt || null,
    employmentEndAt: staffForm.value.employmentEndAt || null
  };

  const ok = await updateShop(payload);
  if (ok) {
    staffDialogVisible.value = false;
  }
}
</script>

<style scoped lang="css" src="./ShopManageDetail.css"></style>
