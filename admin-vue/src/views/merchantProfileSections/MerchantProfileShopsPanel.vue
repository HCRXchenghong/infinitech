<template>
  <div class="panel">
    <div class="panel-header">
      <div class="panel-title">店铺信息</div>
      <div class="panel-header-actions">
        <el-button type="primary" size="small" @click="addShop">新增店铺</el-button>
        <el-button size="small" @click="loadShops">刷新店铺</el-button>
      </div>
    </div>
    <el-table :data="shops" stripe size="small">
      <el-table-column label="店铺" min-width="240">
        <template #default="{ row }">
          <div class="shop-base">
            <img v-if="row.logo" class="shop-logo" :src="row.logo" alt="logo" />
            <div v-else class="shop-logo placeholder">LOGO</div>
            <span class="shop-name">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="店铺类型" width="120">
        <template #default="{ row }">
          <el-tag size="small">{{ row.orderType || '外卖类' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="店铺评分" width="110">
        <template #default="{ row }">
          <span class="rating">★ {{ row.rating || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="monthlySales" label="月销量" width="100" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
            {{ row.isActive ? '营业中' : '已关闭' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" text size="small" @click="goShopDetail(row)">详情</el-button>
          <el-button type="danger" link size="small" @click="deleteShop(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          :description="shopsError ? '加载失败，暂无可显示数据' : '暂无店铺数据'"
          :image-size="90"
        />
      </template>
    </el-table>
  </div>
</template>

<script setup>
defineProps({
  shops: {
    type: Array,
    default: () => [],
  },
  shopsError: {
    type: String,
    default: '',
  },
  loadShops: {
    type: Function,
    required: true,
  },
  addShop: {
    type: Function,
    required: true,
  },
  goShopDetail: {
    type: Function,
    required: true,
  },
  deleteShop: {
    type: Function,
    required: true,
  },
});
</script>
