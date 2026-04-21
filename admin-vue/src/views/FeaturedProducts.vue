<template>
  <div class="featured-products-page">
    <div class="featured-products-panel">
      <FeaturedProductsHeader
        :loading="loading"
        :load-featured-products="loadFeaturedProducts"
        :show-add-dialog="showAddDialog"
      />
      <PageStateAlert :message="pageError" />
      <FeaturedProductsTableCard
        :featured-products="featuredProducts"
        :loading="loading"
        :load-error="loadError"
        :operating-action="operatingAction"
        :operating-product-id="operatingProductId"
        :move-up="moveUp"
        :move-down="moveDown"
        :remove-product="removeProduct"
      />
    </div>

    <FeaturedProductsAddDialog
      :visible="addDialogVisible"
      :search-keyword="searchKeyword"
      :update-search-keyword="updateSearchKeyword"
      :products="products"
      :products-loading="productsLoading"
      :products-error="productsError"
      :operating-action="operatingAction"
      :operating-product-id="operatingProductId"
      :search-products="searchProducts"
      :add-product="addProduct"
      :is-product-added="isProductAdded"
      @update:visible="handleAddDialogVisibleUpdate"
    />
  </div>
</template>

<script setup>
import './FeaturedProducts.css';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';
import FeaturedProductsAddDialog from './featuredProductsSections/FeaturedProductsAddDialog.vue';
import FeaturedProductsHeader from './featuredProductsSections/FeaturedProductsHeader.vue';
import FeaturedProductsTableCard from './featuredProductsSections/FeaturedProductsTableCard.vue';
import { useFeaturedProductsPage } from './featuredProductsPageHelpers';

const {
  addDialogVisible,
  addProduct,
  closeAddDialog,
  featuredProducts,
  isProductAdded,
  loadError,
  loadFeaturedProducts,
  loading,
  moveDown,
  moveUp,
  operatingAction,
  operatingProductId,
  pageError,
  products,
  productsError,
  productsLoading,
  removeProduct,
  searchKeyword,
  searchProducts,
  showAddDialog,
} = useFeaturedProductsPage({
  request,
  ElMessage,
  ElMessageBox,
});

function handleAddDialogVisibleUpdate(value) {
  if (!value) {
    closeAddDialog();
    return;
  }
  addDialogVisible.value = value;
}

function updateSearchKeyword(value) {
  searchKeyword.value = value;
}
</script>
