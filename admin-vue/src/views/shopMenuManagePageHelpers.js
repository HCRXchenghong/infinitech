import { computed, onMounted, ref, watch } from 'vue';
import { extractEnvelopeData, extractErrorMessage, extractPaginatedItems } from '@infinitech/contracts';
import {
  buildCategoryForm,
  buildCategoryPayload,
  buildProductForm,
  buildProductPayload,
  createDefaultCategoryForm,
  createDefaultProductForm,
  normalizeCategoryRecord,
  normalizeProductRecord,
  validateCategoryForm,
  validateProductForm,
} from './shopMenuHelpers';

export function useShopMenuManagePage({ route, router, request, ElMessage, ElMessageBox }) {
  const merchantId = String(route.params.merchantId || '').trim();
  const shopId = String(route.params.shopId || '').trim();

  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref('');
  const productsError = ref('');
  const pageError = computed(() => productsError.value || loadError.value || '');
  const shop = ref({});
  const categories = ref([]);
  const products = ref([]);
  const selectedCategoryId = ref(null);

  const categoryDialogVisible = ref(false);
  const productDialogVisible = ref(false);
  const categoryForm = ref(createDefaultCategoryForm());
  const productForm = ref(createDefaultProductForm());

  function goBack() {
    router.push(`/merchants/${merchantId}/shops/${shopId}`);
  }

  async function loadShop() {
    loadError.value = '';
    try {
      const { data } = await request.get(`/api/shops/${shopId}`);
      shop.value = extractEnvelopeData(data) || {};
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载店铺信息失败，请稍后重试');
    }
  }

  async function loadCategories() {
    loadError.value = '';
    loading.value = true;

    try {
      const { data } = await request.get('/api/categories', { params: { shopId } });
      categories.value = extractPaginatedItems(data).items.map(normalizeCategoryRecord);
      const hasSelectedCategory = categories.value.some((item) => item.id === selectedCategoryId.value);
      if (!hasSelectedCategory) {
        selectedCategoryId.value = categories.value.length > 0 ? categories.value[0].id : null;
      }
    } catch (error) {
      categories.value = [];
      selectedCategoryId.value = null;
      loadError.value = extractErrorMessage(error, '加载分类失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function loadProducts() {
    if (!selectedCategoryId.value) {
      products.value = [];
      return;
    }

    productsError.value = '';
    loading.value = true;

    try {
      const { data } = await request.get('/api/products', {
        params: { shopId, categoryId: selectedCategoryId.value },
      });
      products.value = extractPaginatedItems(data).items.map(normalizeProductRecord);
    } catch (error) {
      products.value = [];
      productsError.value = extractErrorMessage(error, '加载商品失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  function selectCategory(id) {
    selectedCategoryId.value = id;
  }

  function openCategoryDialog(category = null) {
    categoryForm.value = buildCategoryForm(category);
    categoryDialogVisible.value = true;
  }

  function closeCategoryDialog() {
    categoryDialogVisible.value = false;
    categoryForm.value = createDefaultCategoryForm();
  }

  async function saveCategory() {
    const validationMessage = validateCategoryForm(categoryForm.value);
    if (validationMessage) {
      ElMessage.warning(validationMessage);
      return;
    }

    saving.value = true;
    try {
      const payload = buildCategoryPayload(categoryForm.value, { shopId });
      if (categoryForm.value.id) {
        await request.put(`/api/categories/${categoryForm.value.id}`, payload);
        ElMessage.success('更新成功');
      } else {
        await request.post('/api/categories', payload);
        ElMessage.success('创建成功');
      }

      closeCategoryDialog();
      await loadCategories();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存分类失败'));
    } finally {
      saving.value = false;
    }
  }

  async function deleteCategory(category) {
    try {
      await ElMessageBox.confirm(`确定要删除分类"${category.name}"吗？`, '提示', {
        type: 'warning',
      });

      await request.delete(`/api/categories/${category.id}`, { params: { shopId } });
      if (selectedCategoryId.value === category.id) {
        selectedCategoryId.value = null;
      }
      ElMessage.success('删除成功');
      await loadCategories();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(extractErrorMessage(error, '删除分类失败'));
      }
    }
  }

  function openProductDialog(product = null) {
    if (!product && !selectedCategoryId.value) {
      ElMessage.warning('请先选择分类');
      return;
    }
    productForm.value = buildProductForm(product);
    productDialogVisible.value = true;
  }

  function closeProductDialog() {
    productDialogVisible.value = false;
    productForm.value = createDefaultProductForm();
  }

  async function saveProduct() {
    const validationMessage = validateProductForm(productForm.value);
    if (validationMessage) {
      ElMessage.warning(validationMessage);
      return;
    }
    if (!selectedCategoryId.value) {
      ElMessage.warning('请先选择分类');
      return;
    }

    saving.value = true;
    try {
      const payload = buildProductPayload(productForm.value, {
        shopId,
        categoryId: selectedCategoryId.value,
      });
      if (productForm.value.id) {
        await request.put(`/api/products/${productForm.value.id}`, payload);
        ElMessage.success('更新成功');
      } else {
        await request.post('/api/products', payload);
        ElMessage.success('创建成功');
      }

      closeProductDialog();
      await loadProducts();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存商品失败'));
    } finally {
      saving.value = false;
    }
  }

  async function deleteProduct(product) {
    try {
      await ElMessageBox.confirm(`确定要删除商品"${product.name}"吗？`, '提示', {
        type: 'warning',
      });

      await request.delete(`/api/products/${product.id}`, {
        params: { shopId, categoryId: selectedCategoryId.value },
      });
      ElMessage.success('删除成功');
      await loadProducts();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(extractErrorMessage(error, '删除商品失败'));
      }
    }
  }

  watch(selectedCategoryId, (nextCategoryId) => {
    if (nextCategoryId) {
      void loadProducts();
    } else {
      products.value = [];
    }
  });

  onMounted(() => {
    void loadShop();
    void loadCategories();
  });

  return {
    categoryDialogVisible,
    categoryForm,
    categories,
    closeCategoryDialog,
    closeProductDialog,
    deleteCategory,
    deleteProduct,
    goBack,
    loading,
    merchantId,
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
  };
}
