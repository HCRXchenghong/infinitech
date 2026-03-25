<template>
  <div class="menu-manage" v-loading="loading">
    <div class="page-header">
      <div>
        <div class="page-title">菜单管理</div>
        <div class="page-subtitle">店铺：{{ shop.name }} (ID: {{ shopId }})</div>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="goBack">返回店铺详情</el-button>
      </div>
    </div>
    <PageStateAlert :message="pageError" />

    <div class="menu-content">
      <!-- 左侧分类列表 -->
      <div class="category-panel">
        <div class="panel-header">
          <span>分类管理</span>
          <el-button type="primary" size="small" @click="openCategoryDialog()">新增分类</el-button>
        </div>
        <div class="category-list">
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="category-item"
            :class="{ active: selectedCategoryId === cat.id }"
            @click="selectCategory(cat.id)"
          >
            <div class="cat-info">
              <span class="cat-name">{{ cat.name }}</span>
              <el-tag size="small" :type="cat.isActive ? 'success' : 'info'">
                {{ cat.isActive ? '启用' : '禁用' }}
              </el-tag>
            </div>
            <div class="cat-actions">
              <el-button type="primary" text size="small" @click.stop="openCategoryDialog(cat)">编辑</el-button>
              <el-button type="danger" text size="small" @click.stop="deleteCategory(cat)">删除</el-button>
            </div>
          </div>
          <div v-if="categories.length === 0" class="empty-tip">暂无分类，请先添加分类</div>
        </div>
      </div>

      <!-- 右侧商品列表 -->
      <div class="product-panel">
        <div class="panel-header">
          <span>商品管理</span>
          <el-button
            type="primary"
            size="small"
            :disabled="!selectedCategoryId"
            @click="openProductDialog()"
          >
            新增商品
          </el-button>
        </div>
        <div class="product-list">
          <el-table :data="products" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column label="商品图片" width="100">
              <template #default="{ row }">
                <img v-if="row.image" :src="row.image" class="product-thumb" />
                <div v-else class="product-thumb-empty">无图</div>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="商品名称" min-width="150" />
            <el-table-column label="价格" width="100">
              <template #default="{ row }">
                <span class="price-text">¥{{ row.price }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="monthlySales" label="月销" width="80" />
            <el-table-column prop="stock" label="库存" width="80" />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="row.isActive ? 'success' : 'info'">
                  {{ row.isActive ? '上架' : '下架' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" text size="small" @click="openProductDialog(row)">编辑</el-button>
                <el-button type="danger" text size="small" @click="deleteProduct(row)">删除</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty :description="!selectedCategoryId ? '请先选择左侧分类' : (productsError ? '加载失败，暂无可显示数据' : '该分类下暂无商品')" :image-size="90" />
            </template>
          </el-table>
        </div>
      </div>
    </div>

    <!-- 分类编辑对话框 -->
    <el-dialog
      v-model="categoryDialogVisible"
      :title="categoryForm.id ? '编辑分类' : '新增分类'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="categoryForm" label-width="100px">
        <el-form-item label="分类名称" required>
          <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="categoryForm.sortOrder" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="categoryForm.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>

    <!-- 商品编辑对话框 -->
    <el-dialog
      v-model="productDialogVisible"
      :title="productForm.id ? '编辑商品' : '新增商品'"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form :model="productForm" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="商品名称" required>
              <el-input v-model="productForm.name" placeholder="请输入商品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="价格" required>
              <el-input-number v-model="productForm.price" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="原价">
              <el-input-number v-model="productForm.originalPrice" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="库存">
              <el-input-number v-model="productForm.stock" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="单位">
              <el-input v-model="productForm.unit" placeholder="例如：份、个、杯" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="月销量">
              <el-input-number v-model="productForm.monthlySales" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="商品描述">
          <el-input v-model="productForm.description" type="textarea" :rows="3" />
        </el-form-item>

        <el-form-item label="商品主图">
          <ImageUpload v-model="productForm.image" />
        </el-form-item>

        <el-form-item label="标签">
          <el-input
            v-model="productForm.tagsText"
            type="textarea"
            :rows="2"
            placeholder="多个标签用逗号分隔，例如：招牌,热销,新品"
          />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="排序">
              <el-input-number v-model="productForm.sortOrder" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="店内推荐">
              <el-switch v-model="productForm.isRecommend" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="上架状态">
              <el-switch v-model="productForm.isActive" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="productDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import ImageUpload from '@/components/ImageUpload.vue';
import PageStateAlert from '@/components/PageStateAlert.vue';
import {
  createDefaultCategoryForm,
  buildCategoryForm,
  createDefaultProductForm,
  buildProductForm,
  buildProductPayload
} from './shopMenuHelpers';

const route = useRoute();
const router = useRouter();

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

onMounted(() => {
  loadShop();
  loadCategories();
});

watch(selectedCategoryId, (newVal) => {
  if (newVal) {
    loadProducts();
  } else {
    products.value = [];
  }
});

function goBack() {
  router.push(`/merchants/${merchantId}/shops/${shopId}`);
}

async function loadShop() {
  loadError.value = '';
  try {
    const { data } = await request.get(`/api/shops/${shopId}`);
    shop.value = data || {};
  } catch (error) {
    loadError.value = error?.response?.data?.error || error?.response?.data?.message || error?.message || '加载店铺信息失败，请稍后重试';
  }
}

async function loadCategories() {
  loadError.value = '';
  loading.value = true;
  try {
    const { data } = await request.get('/api/categories', { params: { shopId } });
    categories.value = Array.isArray(data) ? data : [];
    if (categories.value.length > 0 && !selectedCategoryId.value) {
      selectedCategoryId.value = categories.value[0].id;
    }
  } catch (error) {
    categories.value = [];
    loadError.value = error?.response?.data?.error || error?.response?.data?.message || error?.message || '加载分类失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

async function loadProducts() {
  if (!selectedCategoryId.value) return;
  productsError.value = '';
  loading.value = true;
  try {
    const { data } = await request.get('/api/products', {
      params: { shopId, categoryId: selectedCategoryId.value }
    });
    products.value = Array.isArray(data) ? data : [];
  } catch (error) {
    products.value = [];
    productsError.value = error?.response?.data?.error || error?.response?.data?.message || error?.message || '加载商品失败，请稍后重试';
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

async function saveCategory() {
  if (!categoryForm.value.name) {
    ElMessage.warning('请输入分类名称');
    return;
  }

  saving.value = true;
  try {
    const payload = {
      shopId,
      name: categoryForm.value.name,
      sortOrder: categoryForm.value.sortOrder || 0,
      isActive: categoryForm.value.isActive
    };

    if (categoryForm.value.id) {
      await request.put(`/api/categories/${categoryForm.value.id}`, payload);
      ElMessage.success('更新成功');
    } else {
      await request.post('/api/categories', payload);
      ElMessage.success('创建成功');
    }

    categoryDialogVisible.value = false;
    await loadCategories();
  } catch (error) {
    console.error('保存分类失败:', error);
    ElMessage.error(error?.response?.data?.error || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function deleteCategory(category) {
  try {
    await ElMessageBox.confirm(`确定要删除分类"${category.name}"吗？`, '提示', {
      type: 'warning'
    });

    await request.delete(`/api/categories/${category.id}`, { params: { shopId } });
    ElMessage.success('删除成功');

    if (selectedCategoryId.value === category.id) {
      selectedCategoryId.value = null;
    }
    await loadCategories();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除分类失败:', error);
      ElMessage.error(error?.response?.data?.error || '删除失败');
    }
  }
}

function openProductDialog(product = null) {
  productForm.value = buildProductForm(product);
  productDialogVisible.value = true;
}

async function saveProduct() {
  if (!productForm.value.name) {
    ElMessage.warning('请输入商品名称');
    return;
  }
  if (!productForm.value.price || productForm.value.price <= 0) {
    ElMessage.warning('请输入有效的价格');
    return;
  }

  saving.value = true;
  try {
    const payload = buildProductPayload(productForm.value, {
      shopId,
      categoryId: selectedCategoryId.value
    });

    if (productForm.value.id) {
      await request.put(`/api/products/${productForm.value.id}`, payload);
      ElMessage.success('更新成功');
    } else {
      await request.post('/api/products', payload);
      ElMessage.success('创建成功');
    }

    productDialogVisible.value = false;
    await loadProducts();
  } catch (error) {
    console.error('保存商品失败:', error);
    ElMessage.error(error?.response?.data?.error || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function deleteProduct(product) {
  try {
    await ElMessageBox.confirm(`确定要删除商品"${product.name}"吗？`, '提示', {
      type: 'warning'
    });

    await request.delete(`/api/products/${product.id}`, {
      params: { shopId, categoryId: selectedCategoryId.value }
    });
    ElMessage.success('删除成功');
    await loadProducts();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除商品失败:', error);
      ElMessage.error(error?.response?.data?.error || '删除失败');
    }
  }
}
</script>

<style scoped lang="css" src="./ShopMenuManage.css"></style>
