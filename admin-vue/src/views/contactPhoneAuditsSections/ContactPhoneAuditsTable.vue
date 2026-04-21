<template>
  <div>
    <el-table :data="records" size="small" stripe v-loading="loading">
      <el-table-column label="时间" width="168">
        <template #default="{ row }">
          {{ formatDateTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="发起方" min-width="150">
        <template #default="{ row }">
          <div>{{ roleLabel(row.actor_role) }} / {{ row.actor_id || '-' }}</div>
          <div class="contact-phone-audits-muted-text">{{ row.actor_phone || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="目标方" min-width="150">
        <template #default="{ row }">
          <div>{{ roleLabel(row.target_role) }} / {{ row.target_id || '-' }}</div>
          <div class="contact-phone-audits-muted-text">{{ row.target_phone || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="场景" min-width="160">
        <template #default="{ row }">
          <div>{{ row.scene || '-' }}</div>
          <div class="contact-phone-audits-muted-text">{{ row.entry_point || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="订单 / 房间" min-width="180">
        <template #default="{ row }">
          <div>{{ row.order_id || '-' }}</div>
          <div class="contact-phone-audits-muted-text">{{ row.room_id || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="平台" width="110">
        <template #default="{ row }">
          {{ row.client_platform || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="结果" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="resultTagType(row.client_result)">
            {{ resultLabel(row.client_result) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openDetail(row)">查看详情</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          :description="loadError ? '加载失败，暂无可显示数据' : '暂无电话联系审计记录'"
          :image-size="96"
        />
      </template>
    </el-table>

    <el-pagination
      v-if="pagination.total > 0"
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.limit"
      :page-sizes="[20, 50, 100]"
      :total="pagination.total"
      layout="total, sizes, prev, pager, next, jumper"
      class="contact-phone-audits-pager"
      @current-change="loadAudits"
      @size-change="handlePageSizeChange"
    />
  </div>
</template>

<script setup>
defineProps({
  formatDateTime: {
    type: Function,
    required: true,
  },
  handlePageSizeChange: {
    type: Function,
    required: true,
  },
  loadAudits: {
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
  pagination: {
    type: Object,
    required: true,
  },
  records: {
    type: Array,
    default: () => [],
  },
  resultLabel: {
    type: Function,
    required: true,
  },
  resultTagType: {
    type: Function,
    required: true,
  },
  roleLabel: {
    type: Function,
    required: true,
  },
});
</script>
