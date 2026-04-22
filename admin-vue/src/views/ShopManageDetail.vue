<template>
  <div class="shop-manage-detail" v-loading="loading">
    <ShopManageDetailHeader
      :go-back-merchant="goBackMerchant"
      :merchant-id="merchantId"
      :shop="shop"
    />

    <PageStateAlert :message="pageError" />

    <div class="section-grid">
      <ShopManageDetailBasicCard
        :food-business-license-image="foodBusinessLicenseImage"
        :merchant-id="merchantId"
        :merchant-qualification-image="merchantQualificationImage"
        :open-basic-dialog="openBasicDialog"
        :shop="shop"
      />
      <ShopManageDetailImageCard
        :open-image-dialog="openImageDialog"
        :shop="shop"
      />
      <ShopManageDetailTagsCard
        :discount-list="discountList"
        :open-tag-dialog="openTagDialog"
        :tag-list="tagList"
      />
      <ShopManageDetailMenuCard
        :go-to-menu-manage="goToMenuManage"
        :open-menu-dialog="openMenuDialog"
        :shop="shop"
      />
      <ShopManageDetailStaffCard
        :format-age="formatAge"
        :format-date="formatDate"
        :has-staff-record="hasStaffRecord"
        :open-staff-dialog="openStaffDialog"
        :shop="shop"
      />
      <ShopManageDetailReviewsCard
        :format-date-time="formatDateTime"
        :handle-delete-review="handleDeleteReview"
        :open-create-review-dialog="openCreateReviewDialog"
        :open-edit-review-dialog="openEditReviewDialog"
        :review-error="reviewError"
        :reviews="reviews"
        :reviews-loading="reviewsLoading"
      />
    </div>

    <ShopManageDetailBasicDialog
      v-model:visible="basicDialogVisible"
      :basic-form="basicForm"
      :business-category-options="businessCategoryOptions"
      :handle-basic-business-category-change="handleBasicBusinessCategoryChange"
      :merchant-type-options="merchantTypeOptions"
      :save-basic-info="saveBasicInfo"
      :saving="saving"
    />
    <ShopManageDetailImageDialog
      v-model:visible="imageDialogVisible"
      :image-form="imageForm"
      :save-image-info="saveImageInfo"
      :saving="saving"
    />
    <ShopManageDetailTagDialog
      v-model:visible="tagDialogVisible"
      :save-tag-info="saveTagInfo"
      :saving="saving"
      :tag-form="tagForm"
    />
    <ShopManageDetailMenuDialog
      v-model:visible="menuDialogVisible"
      :menu-form="menuForm"
      :save-menu-info="saveMenuInfo"
      :saving="saving"
    />
    <ShopManageDetailStaffDialog
      v-model:visible="staffDialogVisible"
      :save-staff-info="saveStaffInfo"
      :saving="saving"
      :staff-form="staffForm"
    />
    <ShopManageDetailReviewDialog
      v-model:visible="reviewDialogVisible"
      :handle-review-image-change="handleReviewImageChange"
      :remove-review-image="removeReviewImage"
      :review-editing-id="reviewEditingId"
      :review-form="reviewForm"
      :review-saving="reviewSaving"
      :save-review="saveReview"
      :uploading-review-image="uploadingReviewImage"
    />
  </div>
</template>
<script setup>
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import './ShopManageDetail.css';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';
import ShopManageDetailBasicCard from './shopManageDetailSections/ShopManageDetailBasicCard.vue';
import ShopManageDetailBasicDialog from './shopManageDetailSections/ShopManageDetailBasicDialog.vue';
import ShopManageDetailHeader from './shopManageDetailSections/ShopManageDetailHeader.vue';
import ShopManageDetailImageCard from './shopManageDetailSections/ShopManageDetailImageCard.vue';
import ShopManageDetailImageDialog from './shopManageDetailSections/ShopManageDetailImageDialog.vue';
import ShopManageDetailMenuCard from './shopManageDetailSections/ShopManageDetailMenuCard.vue';
import ShopManageDetailMenuDialog from './shopManageDetailSections/ShopManageDetailMenuDialog.vue';
import ShopManageDetailReviewsCard from './shopManageDetailSections/ShopManageDetailReviewsCard.vue';
import ShopManageDetailReviewDialog from './shopManageDetailSections/ShopManageDetailReviewDialog.vue';
import ShopManageDetailStaffCard from './shopManageDetailSections/ShopManageDetailStaffCard.vue';
import ShopManageDetailStaffDialog from './shopManageDetailSections/ShopManageDetailStaffDialog.vue';
import ShopManageDetailTagDialog from './shopManageDetailSections/ShopManageDetailTagDialog.vue';
import ShopManageDetailTagsCard from './shopManageDetailSections/ShopManageDetailTagsCard.vue';
import { useShopManageDetailPage } from './shopManageDetailPageHelpers';

const route = useRoute();
const router = useRouter();

const {
  basicDialogVisible,
  basicForm,
  businessCategoryOptions,
  discountList,
  foodBusinessLicenseImage,
  formatAge,
  formatDate,
  formatDateTime,
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
} = useShopManageDetailPage({
  route,
  router,
  request,
  ElMessage,
  ElMessageBox,
});
</script>
