import { computed, onMounted, ref } from 'vue';
import { extractErrorMessage } from '@infinitech/contracts';

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizeText(value, fallback = '') {
  const normalized = String(value == null ? '' : value).trim();
  return normalized || fallback;
}

function normalizeFeaturedProductRecord(record = {}) {
  return {
    ...record,
    id: record.id ?? record.featured_id ?? record.featuredId ?? '',
    productId: record.productId ?? record.product_id ?? record.product?.id ?? '',
    position: normalizeNumber(record.position, 0),
    productImage: normalizeText(
      record.productImage || record.product_image || record.image || record.product?.image,
    ),
    productName: normalizeText(
      record.productName || record.product_name || record.name || record.product?.name,
      '未命名商品',
    ),
    shopName: normalizeText(record.shopName || record.shop_name || record.shop?.name, '-'),
    price: normalizeNumber(record.price, 0),
    originalPrice: normalizeNumber(record.originalPrice ?? record.original_price, 0),
    monthlySales: normalizeNumber(record.monthlySales ?? record.monthly_sales, 0),
    rating: normalizeNumber(record.rating, 5),
    isActive: normalizeBoolean(record.isActive ?? record.is_active, true),
  };
}

function normalizeFeaturedProductCollection(payload = {}) {
  const products = payload?.products || payload?.data?.products || payload?.data?.items || [];
  return Array.isArray(products) ? products.map(normalizeFeaturedProductRecord) : [];
}

function normalizeCandidateProductRecord(record = {}) {
  return {
    ...record,
    id: record.id ?? record.product_id ?? record.productId ?? '',
    image: normalizeText(record.image || record.productImage || record.product_image),
    name: normalizeText(record.name || record.productName || record.product_name, '未命名商品'),
    price: normalizeNumber(record.price, 0),
    monthly_sales: normalizeNumber(record.monthly_sales ?? record.monthlySales, 0),
  };
}

function normalizeCandidateProductCollection(payload = {}) {
  const products = payload?.products || payload?.data?.products || payload?.data?.items || [];
  return Array.isArray(products) ? products.map(normalizeCandidateProductRecord) : [];
}

function buildProductSearchParams(keyword) {
  const normalizedKeyword = normalizeText(keyword);
  return normalizedKeyword ? { search: normalizedKeyword } : {};
}

export function useFeaturedProductsPage({ request, ElMessage, ElMessageBox }) {
  const loading = ref(false);
  const featuredProducts = ref([]);
  const loadError = ref('');
  const productsError = ref('');
  const pageError = computed(() => productsError.value || loadError.value || '');

  const addDialogVisible = ref(false);
  const searchKeyword = ref('');
  const products = ref([]);
  const productsLoading = ref(false);
  const operatingAction = ref('');
  const operatingProductId = ref(null);

  function resetOperationState() {
    operatingAction.value = '';
    operatingProductId.value = null;
  }

  async function runProductOperation(action, productId, task) {
    if (operatingProductId.value) {
      return false;
    }

    operatingAction.value = action;
    operatingProductId.value = productId;
    try {
      await task();
      return true;
    } finally {
      resetOperationState();
    }
  }

  async function loadFeaturedProducts() {
    loadError.value = '';
    loading.value = true;
    try {
      const { data } = await request.get('/api/featured-products');
      featuredProducts.value = normalizeFeaturedProductCollection(data);
    } catch (error) {
      featuredProducts.value = [];
      loadError.value = extractErrorMessage(error, '加载今日推荐失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  function closeAddDialog() {
    addDialogVisible.value = false;
    productsError.value = '';
  }

  function showAddDialog() {
    productsError.value = '';
    addDialogVisible.value = true;
    searchProducts();
  }

  async function searchProducts() {
    productsError.value = '';
    productsLoading.value = true;
    try {
      const params = buildProductSearchParams(searchKeyword.value);
      const { data } = await request.get('/api/products', { params });
      products.value = normalizeCandidateProductCollection(data);
    } catch (error) {
      products.value = [];
      productsError.value = extractErrorMessage(error, '搜索商品失败，请稍后重试');
    } finally {
      productsLoading.value = false;
    }
  }

  function isProductAdded(productId) {
    return featuredProducts.value.some((item) => String(item.productId) === String(productId));
  }

  async function addProduct(product) {
    await runProductOperation('add', product.id, async () => {
      const position = featuredProducts.value.length + 1;
      await request.post('/api/featured-products', {
        product_id: product.id,
        position,
      });
      ElMessage.success('添加成功');
      await loadFeaturedProducts();
    }).catch((error) => {
      ElMessage.error(extractErrorMessage(error, '添加推荐商品失败'));
    });
  }

  async function updateProductPosition(productId, position) {
    await request.put(`/api/featured-products/${productId}/position`, { position });
  }

  async function moveUp(row, index) {
    if (index === 0) {
      return;
    }

    await runProductOperation('move-up', row.id, async () => {
      const previousRow = featuredProducts.value[index - 1];
      await updateProductPosition(row.id, previousRow.position);
      await updateProductPosition(previousRow.id, row.position);
      ElMessage.success('调整成功');
      await loadFeaturedProducts();
    }).catch((error) => {
      ElMessage.error(extractErrorMessage(error, '调整位置失败'));
    });
  }

  async function moveDown(row, index) {
    if (index === featuredProducts.value.length - 1) {
      return;
    }

    await runProductOperation('move-down', row.id, async () => {
      const nextRow = featuredProducts.value[index + 1];
      await updateProductPosition(row.id, nextRow.position);
      await updateProductPosition(nextRow.id, row.position);
      ElMessage.success('调整成功');
      await loadFeaturedProducts();
    }).catch((error) => {
      ElMessage.error(extractErrorMessage(error, '调整位置失败'));
    });
  }

  async function removeProduct(row) {
    if (operatingProductId.value) {
      return;
    }

    try {
      await ElMessageBox.confirm(
        `确定要删除推荐商品"${row.productName}"吗？`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        },
      );
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        ElMessage.error(extractErrorMessage(error, '删除推荐商品失败'));
      }
      return;
    }

    await runProductOperation('remove', row.id, async () => {
      await request.delete(`/api/featured-products/${row.id}`);
      ElMessage.success('删除成功');
      await loadFeaturedProducts();
    }).catch((error) => {
      ElMessage.error(extractErrorMessage(error, '删除推荐商品失败'));
    });
  }

  onMounted(() => {
    loadFeaturedProducts();
  });

  return {
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
  };
}
