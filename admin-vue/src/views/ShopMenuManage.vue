<template>
  <div class="shop-menu-manage-page" v-loading="loading">
    <ShopMenuManageHeader
      :shop="shop"
      :shop-id="shopId"
      :go-back="goBack"
    />
    <PageStateAlert :message="pageError" />

    <div class="menu-content">
      <ShopMenuManageCategoryPanel
        :categories="categories"
        :selected-category-id="selectedCategoryId"
        :select-category="selectCategory"
        :open-category-dialog="openCategoryDialog"
        :delete-category="deleteCategory"
      />

      <ShopMenuManageProductPanel
        :selected-category-id="selectedCategoryId"
        :products="products"
        :products-error="productsError"
        :open-product-dialog="openProductDialog"
        :delete-product="deleteProduct"
      />
    </div>

    <ShopMenuManageCategoryDialog
      :visible="categoryDialogVisible"
      :category-form="categoryForm"
      :saving="saving"
      :save-category="saveCategory"
      @update:visible="handleCategoryDialogVisibleUpdate"
    />

    <ShopMenuManageProductDialog
      :visible="productDialogVisible"
      :product-form="productForm"
      :saving="saving"
      :save-product="saveProduct"
      @update:visible="handleProductDialogVisibleUpdate"
    />
  </div>
</template>

<script setup>
import './ShopMenuManage.css';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';
import ShopMenuManageCategoryDialog from './shopMenuManageSections/ShopMenuManageCategoryDialog.vue';
import ShopMenuManageCategoryPanel from './shopMenuManageSections/ShopMenuManageCategoryPanel.vue';
import ShopMenuManageHeader from './shopMenuManageSections/ShopMenuManageHeader.vue';
import ShopMenuManageProductDialog from './shopMenuManageSections/ShopMenuManageProductDialog.vue';
import ShopMenuManageProductPanel from './shopMenuManageSections/ShopMenuManageProductPanel.vue';
import { useShopMenuManagePage } from './shopMenuManagePageHelpers';

const route = useRoute();
const router = useRouter();

const {
  categoryDialogVisible,
  categoryForm,
  categories,
  closeCategoryDialog,
  closeProductDialog,
  deleteCategory,
  deleteProduct,
  goBack,
  loading,
  pageError,
  productDialogVisible,
  productForm,
  products,
  productsError,
  saveCategory,
  saveProduct,
  saving,
  selectCategory,
  selectedCategoryId,
  shop,
  shopId,
  openCategoryDialog,
  openProductDialog,
} = useShopMenuManagePage({
  route,
  router,
  request,
  ElMessage,
  ElMessageBox,
});

function handleCategoryDialogVisibleUpdate(value) {
  if (!value) {
    closeCategoryDialog();
    return;
  }
  categoryDialogVisible.value = value;
}

function handleProductDialogVisibleUpdate(value) {
  if (!value) {
    closeProductDialog();
    return;
  }
  productDialogVisible.value = value;
}
</script>
