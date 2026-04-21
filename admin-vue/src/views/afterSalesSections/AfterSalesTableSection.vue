<template>
  <el-card shadow="never">
    <PageStateAlert :message="loadError" />
    <el-table v-loading="loading" :data="records" stripe>
      <el-table-column prop="requestNo" label="售后单号" min-width="190" />
      <el-table-column prop="orderNo" label="订单号" min-width="150" />
      <el-table-column prop="userId" label="用户ID" min-width="120" />
      <el-table-column prop="contactPhone" label="联系电话" min-width="130" />
      <el-table-column prop="typeText" label="售后类型" min-width="110" />
      <el-table-column label="申请退款" min-width="120">
        <template #default="{ row }">
          {{ row.requestedRefundAmount > 0 ? `¥${fen2yuan(row.requestedRefundAmount)}` : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)">{{ row.statusText }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" min-width="170">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt || row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">查看</el-button>
          <el-button link type="warning" @click="openProcess(row)">处理</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无售后数据'" :image-size="90" />
      </template>
    </el-table>

    <div class="pagination-wrap">
      <el-pagination
        :current-page="page"
        :page-size="pageSize"
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        :page-sizes="[10, 20, 50]"
        @size-change="handlePaginationSizeChange"
        @current-change="handleCurrentPageChange"
      />
    </div>
  </el-card>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  loadError: {
    type: String,
    default: '',
  },
  records: {
    type: Array,
    default: () => [],
  },
  page: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 20,
  },
  total: {
    type: Number,
    default: 0,
  },
  fen2yuan: {
    type: Function,
    required: true,
  },
  formatDateTime: {
    type: Function,
    required: true,
  },
  statusTagType: {
    type: Function,
    required: true,
  },
  openDetail: {
    type: Function,
    required: true,
  },
  openProcess: {
    type: Function,
    required: true,
  },
  fetchRecords: {
    type: Function,
    required: true,
  },
  handleSizeChange: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:page', 'update:pageSize'])

function handlePaginationSizeChange(value) {
  emit('update:pageSize', value)
  emit('update:page', 1)
  props.handleSizeChange()
}

function handleCurrentPageChange(value) {
  emit('update:page', value)
  props.fetchRecords()
}
</script>
