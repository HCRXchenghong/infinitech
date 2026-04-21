<template>
  <el-dialog
    :model-value="visible"
    title="添加推荐商品"
    width="900px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <div class="featured-products-search-bar">
      <el-input
        :model-value="searchKeyword"
        placeholder="搜索商品名称"
        clearable
        class="featured-products-search-input"
        @update:model-value="updateSearchKeyword"
        @keyup.enter="searchProducts"
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
            class="featured-products-search-image"
          />
        </template>
      </el-table-column>
      <el-table-column prop="name" label="商品名称" min-width="200" />
      <el-table-column label="价格" width="100">
        <template #default="{ row }">¥{{ row.price }}</template>
      </el-table-column>
      <el-table-column label="月销量" width="100" align="center">
        <template #default="{ row }">{{ row.monthly_sales || 0 }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button
            type="primary"
            link
            size="small"
            :disabled="
              isProductAdded(row.id) ||
              (operatingAction === 'add' && operatingProductId === row.id)
            "
            :loading="operatingAction === 'add' && operatingProductId === row.id"
            @click="addProduct(row)"
          >
            {{ isProductAdded(row.id) ? '已添加' : '添加' }}
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          :description="productsError ? '加载失败，暂无可显示数据' : '暂无可添加商品'"
          :image-size="90"
        />
      </template>
    </el-table>

    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  searchKeyword: {
    type: String,
    default: '',
  },
  updateSearchKeyword: {
    type: Function,
    required: true,
  },
  products: {
    type: Array,
    default: () => [],
  },
  productsLoading: {
    type: Boolean,
    default: false,
  },
  productsError: {
    type: String,
    default: '',
  },
  operatingAction: {
    type: String,
    default: '',
  },
  operatingProductId: {
    default: null,
  },
  searchProducts: {
    type: Function,
    required: true,
  },
  addProduct: {
    type: Function,
    required: true,
  },
  isProductAdded: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>
