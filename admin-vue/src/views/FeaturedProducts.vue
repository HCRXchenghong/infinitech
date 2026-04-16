<template>
  <div class="featured-products-page">
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">
          <span>今日推荐管理</span>
        </div>
        <div class="panel-actions">
          <el-button size="small" @click="load" :loading="loading">刷新</el-button>
          <el-button type="primary" size="small" @click="showAddDialog">添加推荐商品</el-button>
        </div>
      </div>
      <PageStateAlert :message="pageError" />

      <el-alert
        title="提示"
        type="info"
        :closable="false"
        style="margin-bottom: 16px;"
      >
        今日推荐只支持单独的商品推荐，不支持店铺推荐。拖拽商品可调整推荐顺序。
      </el-alert>

      <!-- 推荐商品列表 -->
      <el-table
        :data="featuredProducts"
        stripe
        size="small"
        v-loading="loading"
        row-key="id"
      >
        <el-table-column label="位置" width="80" align="center">
          <template #default="{ row }">
            <el-tag type="primary" size="small">{{ row.position }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="商品图片" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.productImage"
              :src="row.productImage"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px;"
            />
            <div v-else style="width: 60px; height: 60px; background: #f5f5f5; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
              <span style="color: #999;">无图</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="productName" label="商品名称" min-width="200" />
        <el-table-column label="所属店铺" width="150">
          <template #default="{ row }">
            {{ row.shopName || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="价格" width="100">
          <template #default="{ row }">
            <div>
              <span style="color: #f56c6c; font-weight: 600;">¥{{ row.price }}</span>
            </div>
            <div v-if="row.originalPrice && row.originalPrice > row.price" style="font-size: 12px; color: #999; text-decoration: line-through;">
              ¥{{ row.originalPrice }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="月销量" width="100" align="center">
          <template #default="{ row }">
            {{ row.monthlySales || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="评分" width="80" align="center">
          <template #default="{ row }">
            <span style="color: #f59e0b;">★ {{ row.rating || 5.0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row, $index }">
            <el-button
              type="primary"
              link
              size="small"
              :disabled="$index === 0"
              :loading="operatingAction === 'move-up' && operatingProductId === row.id"
              @click="moveUp(row, $index)"
            >
              上移
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              :disabled="$index === featuredProducts.length - 1"
              :loading="operatingAction === 'move-down' && operatingProductId === row.id"
              @click="moveDown(row, $index)"
            >
              下移
            </el-button>
            <el-button type="danger" link size="small" :loading="operatingAction === 'remove' && operatingProductId === row.id" @click="removeProduct(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无推荐商品'" :image-size="90" />
        </template>
      </el-table>
    </div>

    <!-- 添加推荐商品对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加推荐商品"
      width="900px"
      :close-on-click-modal="false"
    >
      <div style="margin-bottom: 16px;">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索商品名称"
          clearable
          @keyup.enter="searchProducts"
          style="width: 300px; margin-right: 8px;"
        />
        <el-button type="primary" @click="searchProducts">搜索</el-button>
      </div>

      <el-table
        :data="products"
        stripe
        size="small"
        v-loading="productsLoading"
        max-height="400"
      >
        <el-table-column label="商品图片" width="80">
          <template #default="{ row }">
            <el-image
              v-if="row.image"
              :src="row.image"
              fit="cover"
              style="width: 50px; height: 50px; border-radius: 4px;"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" min-width="200" />
        <el-table-column label="价格" width="100">
          <template #default="{ row }">
            ¥{{ row.price }}
          </template>
        </el-table-column>
        <el-table-column label="月销量" width="100" align="center">
          <template #default="{ row }">
            {{ row.monthly_sales || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="addProduct(row)"
              :disabled="isProductAdded(row.id) || (operatingAction === 'add' && operatingProductId === row.id)"
              :loading="operatingAction === 'add' && operatingProductId === row.id"
            >
              {{ isProductAdded(row.id) ? '已添加' : '添加' }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="productsError ? '加载失败，暂无可显示数据' : '暂无可添加商品'" :image-size="90" />
        </template>
      </el-table>

      <template #footer>
        <el-button @click="addDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractErrorMessage } from '@infinitech/contracts';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';

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

// 加载今日推荐列表
async function load() {
  loadError.value = '';
  loading.value = true;
  try {
    const { data } = await request.get('/api/featured-products');
    featuredProducts.value = data.products || [];
  } catch (e) {
    featuredProducts.value = [];
    loadError.value = extractErrorMessage(e, '加载今日推荐失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

// 显示添加对话框
function showAddDialog() {
  addDialogVisible.value = true;
  searchProducts();
}

// 搜索商品
async function searchProducts() {
  productsError.value = '';
  productsLoading.value = true;
  try {
    const params = {};
    if (searchKeyword.value) {
      params.search = searchKeyword.value;
    }
    const { data } = await request.get('/api/products', { params });
    products.value = data.products || [];
  } catch (e) {
    products.value = [];
    productsError.value = extractErrorMessage(e, '搜索商品失败，请稍后重试');
  } finally {
    productsLoading.value = false;
  }
}

// 检查商品是否已添加
function isProductAdded(productId) {
  return featuredProducts.value.some(item => item.productId === productId);
}

// 添加商品到推荐
async function addProduct(product) {
  if (operatingProductId.value) return;
  operatingAction.value = 'add';
  operatingProductId.value = product.id;
  try {
    const position = featuredProducts.value.length + 1;
    await request.post('/api/featured-products', {
      product_id: product.id,
      position: position
    });
    ElMessage.success('添加成功');
    await load();
  } catch (e) {
    ElMessage.error(extractErrorMessage(e, '添加推荐商品失败'));
  } finally {
    operatingAction.value = '';
    operatingProductId.value = null;
  }
}

// 上移
async function moveUp(row, index) {
  if (index === 0) return;
  if (operatingProductId.value) return;

  operatingAction.value = 'move-up';
  operatingProductId.value = row.id;
  try {
    const currentPosition = row.position;
    const prevRow = featuredProducts.value[index - 1];
    const prevPosition = prevRow.position;

    // 交换位置
    await request.put(`/api/featured-products/${row.id}/position`, {
      position: prevPosition
    });
    await request.put(`/api/featured-products/${prevRow.id}/position`, {
      position: currentPosition
    });

    ElMessage.success('调整成功');
    await load();
  } catch (e) {
    ElMessage.error(extractErrorMessage(e, '调整位置失败'));
  } finally {
    operatingAction.value = '';
    operatingProductId.value = null;
  }
}

// 下移
async function moveDown(row, index) {
  if (index === featuredProducts.value.length - 1) return;
  if (operatingProductId.value) return;

  operatingAction.value = 'move-down';
  operatingProductId.value = row.id;
  try {
    const currentPosition = row.position;
    const nextRow = featuredProducts.value[index + 1];
    const nextPosition = nextRow.position;

    // 交换位置
    await request.put(`/api/featured-products/${row.id}/position`, {
      position: nextPosition
    });
    await request.put(`/api/featured-products/${nextRow.id}/position`, {
      position: currentPosition
    });

    ElMessage.success('调整成功');
    await load();
  } catch (e) {
    ElMessage.error(extractErrorMessage(e, '调整位置失败'));
  } finally {
    operatingAction.value = '';
    operatingProductId.value = null;
  }
}

// 删除推荐商品
async function removeProduct(row) {
  if (operatingProductId.value) return;
  operatingAction.value = 'remove';
  operatingProductId.value = row.id;
  try {
    await ElMessageBox.confirm(
      `确定要删除推荐商品"${row.productName}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await request.delete(`/api/featured-products/${row.id}`);
    ElMessage.success('删除成功');
    await load();
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(extractErrorMessage(e, '删除推荐商品失败'));
    }
  } finally {
    operatingAction.value = '';
    operatingProductId.value = null;
  }
}

onMounted(() => {
  load();
});
</script>

<style scoped>
.featured-products-page {
  padding: 0;
}

.panel {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e6ebf5;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

.panel-header {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.panel-title {
  font-weight: 700;
  font-size: 18px;
}

.panel-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
