<template>
  <div>
    <el-alert
      title="提示"
      type="info"
      :closable="false"
      class="featured-products-tip"
    >
      今日推荐只支持单独的商品推荐，不支持店铺推荐。拖拽商品可调整推荐顺序。
    </el-alert>

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
            class="featured-products-image"
          />
          <div v-else class="featured-products-image-placeholder">
            <span>无图</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="productName" label="商品名称" min-width="200" />
      <el-table-column label="所属店铺" width="150">
        <template #default="{ row }">{{ row.shopName || '-' }}</template>
      </el-table-column>
      <el-table-column label="价格" width="100">
        <template #default="{ row }">
          <div class="featured-products-price">¥{{ row.price }}</div>
          <div
            v-if="row.originalPrice && row.originalPrice > row.price"
            class="featured-products-price-original"
          >
            ¥{{ row.originalPrice }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="月销量" width="100" align="center">
        <template #default="{ row }">{{ row.monthlySales || 0 }}</template>
      </el-table-column>
      <el-table-column label="评分" width="80" align="center">
        <template #default="{ row }">
          <span class="featured-products-rating">★ {{ row.rating || 5.0 }}</span>
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
          <el-button
            type="danger"
            link
            size="small"
            :loading="operatingAction === 'remove' && operatingProductId === row.id"
            @click="removeProduct(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          :description="loadError ? '加载失败，暂无可显示数据' : '暂无推荐商品'"
          :image-size="90"
        />
      </template>
    </el-table>
  </div>
</template>

<script setup>
defineProps({
  featuredProducts: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadError: {
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
  moveUp: {
    type: Function,
    required: true,
  },
  moveDown: {
    type: Function,
    required: true,
  },
  removeProduct: {
    type: Function,
    required: true,
  },
});
</script>
