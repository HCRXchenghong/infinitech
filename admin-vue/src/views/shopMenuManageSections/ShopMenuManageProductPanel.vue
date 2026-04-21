<template>
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
          <el-empty :description="emptyDescription" :image-size="90" />
        </template>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  selectedCategoryId: {
    type: [Number, String],
    default: null,
  },
  products: {
    type: Array,
    default: () => [],
  },
  productsError: {
    type: String,
    default: '',
  },
  openProductDialog: {
    type: Function,
    required: true,
  },
  deleteProduct: {
    type: Function,
    required: true,
  },
});

const emptyDescription = computed(() => {
  if (!props.selectedCategoryId) {
    return '请先选择左侧分类';
  }
  if (props.productsError) {
    return '加载失败，暂无可显示数据';
  }
  return '该分类下暂无商品';
});
</script>
