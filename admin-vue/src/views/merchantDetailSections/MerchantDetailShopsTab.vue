<template>
  <div>
    <div class="merchant-detail-toolbar">
      <el-button type="primary" size="small" @click="addShop">新增店铺</el-button>
    </div>

    <el-table :data="shops" stripe size="small">
      <el-table-column prop="id" label="店铺ID" width="80" />
      <el-table-column prop="name" label="店铺名称" min-width="150" />
      <el-table-column label="订单类型" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ row.orderType || '外卖类' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="业务分类" width="120">
        <template #default="{ row }">
          <el-tag size="small" type="success">
            {{ row.businessCategory || '美食' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="rating" label="评分" width="80">
        <template #default="{ row }">
          <span class="merchant-detail-rating">★ {{ row.rating || 5.0 }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="monthlySales" label="月销量" width="100" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
            {{ row.isActive ? '营业中' : '已关闭' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="editShop(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="deleteShop(row)">删除</el-button>
        </template>
      </el-table-column>

      <template #empty>
        <el-empty
          :description="loadError ? '加载失败，暂无可显示数据' : '该商户暂无店铺'"
          :image-size="90"
        />
      </template>
    </el-table>
  </div>
</template>

<script setup>
defineProps({
  addShop: {
    type: Function,
    required: true,
  },
  deleteShop: {
    type: Function,
    required: true,
  },
  editShop: {
    type: Function,
    required: true,
  },
  loadError: {
    type: String,
    default: '',
  },
  shops: {
    type: Array,
    default: () => [],
  },
})
</script>
