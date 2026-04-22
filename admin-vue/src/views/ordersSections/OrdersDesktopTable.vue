<template>
  <el-table
    :data="orders"
    stripe
    size="small"
    v-loading="loading"
    @row-click="openDetail"
  >
    <el-table-column prop="daily_order_id" label="订单号" width="130" />
    <el-table-column label="订单类型" width="90">
      <template #default="{ row }">
        <span>{{ getOrderTypeText(row) }}</span>
      </template>
    </el-table-column>
    <el-table-column label="状态" width="90">
      <template #default="{ row }">
        <el-tag :type="getStatusTagType(row.status)" size="small">
          {{ getStatusText(row.status, row) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="客户" width="110">
      <template #default="{ row }">
        <div>{{ row.customer_name || row.customer_phone || '-' }}</div>
      </template>
    </el-table-column>
    <el-table-column label="骑手" width="110">
      <template #default="{ row }">
        <div>{{ row.rider_name || row.rider_phone || '-' }}</div>
      </template>
    </el-table-column>
    <el-table-column label="订单内容" align="center">
      <template #default>
        <span class="orders-see-detail-text">见详情</span>
      </template>
    </el-table-column>
    <el-table-column prop="dorm_number" label="宿舍" width="80" />
    <el-table-column label="金额" width="80" align="right">
      <template #default="{ row }">
        <span v-if="row.total_price">¥{{ row.total_price }}</span>
        <span v-else-if="row.package_price">¥{{ row.package_price }}</span>
        <span v-else>-</span>
      </template>
    </el-table-column>
    <el-table-column label="创建时间" width="150">
      <template #default="{ row }">
        {{ formatTime(row.created_at) }}
      </template>
    </el-table-column>
    <el-table-column label="操作" width="180" fixed="right">
      <template #default="{ row }">
        <el-button
          v-if="canQuickDispatch(row)"
          type="warning"
          text
          size="small"
          :loading="dispatchingOrderId === row.id"
          @click.stop="handleQuickDispatch(row)"
        >
          一键派单
        </el-button>
        <el-button type="primary" text size="small" @click.stop="openDetail(row)">查看</el-button>
      </template>
    </el-table-column>
    <template #empty>
      <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无订单数据'" :image-size="90" />
    </template>
  </el-table>
</template>

<script setup>
defineProps({
  canQuickDispatch: {
    type: Function,
    required: true,
  },
  dispatchingOrderId: {
    type: [Number, String, null],
    default: null,
  },
  formatTime: {
    type: Function,
    required: true,
  },
  getOrderTypeText: {
    type: Function,
    required: true,
  },
  getStatusTagType: {
    type: Function,
    required: true,
  },
  getStatusText: {
    type: Function,
    required: true,
  },
  handleQuickDispatch: {
    type: Function,
    required: true,
  },
  loadError: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  openDetail: {
    type: Function,
    required: true,
  },
  orders: {
    type: Array,
    default: () => [],
  },
});
</script>
