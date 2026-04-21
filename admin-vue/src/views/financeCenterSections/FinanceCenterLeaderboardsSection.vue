<template>
  <div class="two-col">
    <el-card class="card">
      <div class="card-title">骑手收入榜 TOP20</div>
      <div v-if="detailsLoading">
        <el-skeleton :rows="3" animated />
      </div>
      <el-table
        v-else
        :data="riderDetails"
        size="small"
        stripe
        :row-class-name="() => 'clickable-row'"
        @row-click="(row) => openUserDetail(row, 'rider')"
      >
        <el-table-column type="index" width="40" />
        <el-table-column prop="userId" label="骑手ID" show-overflow-tooltip />
        <el-table-column label="总收入" width="100">
          <template #default="{ row }">¥{{ fen2yuan(row.totalIncome) }}</template>
        </el-table-column>
        <el-table-column prop="orderCount" label="单数" width="60" />
        <template #empty>
          <el-empty :description="detailsError || '暂无数据'" :image-size="90" />
        </template>
      </el-table>
    </el-card>

    <el-card class="card">
      <div class="card-title">商户收入榜 TOP20</div>
      <div v-if="detailsLoading">
        <el-skeleton :rows="3" animated />
      </div>
      <el-table
        v-else
        :data="merchantDetails"
        size="small"
        stripe
        :row-class-name="() => 'clickable-row'"
        @row-click="(row) => openUserDetail(row, 'merchant')"
      >
        <el-table-column type="index" width="40" />
        <el-table-column prop="userId" label="商户ID" show-overflow-tooltip />
        <el-table-column label="总收入" width="100">
          <template #default="{ row }">¥{{ fen2yuan(row.totalIncome) }}</template>
        </el-table-column>
        <el-table-column prop="orderCount" label="单数" width="60" />
        <template #empty>
          <el-empty :description="detailsError || '暂无数据'" :image-size="90" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
defineProps({
  detailsLoading: {
    type: Boolean,
    default: false,
  },
  detailsError: {
    type: String,
    default: '',
  },
  riderDetails: {
    type: Array,
    default: () => [],
  },
  merchantDetails: {
    type: Array,
    default: () => [],
  },
  openUserDetail: {
    type: Function,
    required: true,
  },
  fen2yuan: {
    type: Function,
    required: true,
  },
})
</script>
